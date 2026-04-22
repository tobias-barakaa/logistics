import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Driver } from 'src/database/entities/driver.entity';
  import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';
  import { OrdersService } from 'src/modules/orders/orders.service';
  import { User } from 'src/database/entities/user.entity';
  import { OrderStatus } from 'src/common/enums/order-status.enum';
  import { AssignDriverDto, FilterOrdersDto } from 'src/modules/orders/dto/orders.dto';
import { AdminAddNoteDto, AdminCancelOrderDto, AdminListOrdersDto, ListDriversQueryDto, RejectDriverDto } from './admin.dto';
import { Order } from 'src/database/entities/order.entity';
  
  @Injectable()
  export class AdminService {
    constructor(
      @InjectRepository(Driver)
      private readonly driverRepository: Repository<Driver>,
      private readonly ordersService: OrdersService,

      @InjectRepository(Order)
      private readonly orderRepository: Repository<Order>,

      
    ) {}
  
    // ── Dashboard ──────────────────────────────────────────────────────────────
    // Single call gives the admin dashboard everything it needs.
  
    async getDashboardOverview() {
      const [
        totalDrivers,
        pendingApproval,
        approvedDrivers,
        todayOrderStats,
      ] = await Promise.all([
        this.driverRepository.count(),
        this.driverRepository.count({ where: { approvalStatus: DriverApprovalStatus.PENDING } }),
        this.driverRepository.count({ where: { approvalStatus: DriverApprovalStatus.APPROVED } }),
        this.ordersService.getDailyStats(),
      ]);
  
      return {
        drivers: {
          total: totalDrivers,
          pendingApproval,
          approved: approvedDrivers,
        },
        orders: {
          today: todayOrderStats,
          // How many orders are sitting unactioned
          pendingReview: todayOrderStats[OrderStatus.PENDING] ?? 0,
        },
      };
    }
  
    
  // ── Orders: read ───────────────────────────────────────────────────────────
 


   async findAll(filters: FilterOrdersDto): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;
    
        const qb = this.orderRepository
          .createQueryBuilder('order')
          .leftJoinAndSelect('order.driver', 'driver')
          .leftJoinAndSelect('driver.user', 'driverUser')
          .leftJoinAndSelect('order.items', 'items')
          .leftJoinAndSelect('order.images', 'images')
          .orderBy('order.createdAt', 'DESC')
          .skip(skip)
          .take(limit);
    
        if (filters.status) {
          qb.andWhere('order.status = :status', { status: filters.status });
        }
    
        if (filters.driverId) {
          qb.andWhere('driver.id = :driverId', { driverId: filters.driverId });
        }
    
        if (filters.priority) {
          qb.andWhere('order.priority = :priority', { priority: filters.priority });
        }
    
        if (filters.search) {
          qb.andWhere(
            '(order.orderNumber ILIKE :s OR order.trackingNumber ILIKE :s OR order.customerName ILIKE :s OR order.customerPhone ILIKE :s)',
            { s: `%${filters.search}%` },
          );
        }
    
        if (filters.dateFrom) {
          qb.andWhere('order.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
        }
    
        if (filters.dateTo) {
          qb.andWhere('order.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
        }
    
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit };
      }
 
  // Convenience shortcut — admin lands here first when they open Orders
  // async listPendingOrders() {
  //   return this.ordersService.findAll({ status: OrderStatus.PENDING, limit: 50 });
  // }
 
  async getOrder(orderId: string) {
    return this.ordersService.findOne(orderId);
  }
 
  async findByTracking(trackingNumber: string) {
    return this.ordersService.findByTracking(trackingNumber);
  }
 
  // ── Orders: actions ────────────────────────────────────────────────────────
 
  // async assignDriver(orderId: string, dto: AssignDriverDto, actor: User) {
  //   // Guard: only PENDING orders can be assigned
  //   const order = await this.ordersService.findOneOrFail(orderId);
 
  //   if (order.status !== OrderStatus.PENDING) {
  //     throw new BadRequestException(
  //       `Only PENDING orders can be assigned. This order is "${order.status}"`,
  //     );
  //   }
 
  //   return this.ordersService.assignDriver(orderId, dto, actor);
  // }
 
  // async cancelOrder(orderId: string, dto: AdminCancelOrderDto, actor: User) {
  //   return this.ordersService.cancel(orderId, { reason: dto.reason }, actor);
  // }
 
  // async addAdminNote(orderId: string, dto: AdminAddNoteDto, actor: User) {
  //   const order = await this.ordersService.findOneOrFail(orderId);
 
  //   // Append note with timestamp so the history is readable
  //   const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
  //   const newNote = `[${timestamp} — ${actor.name}] ${dto.note}`;
  //   const updatedNotes = order.adminNotes
  //     ? `${order.adminNotes}\n${newNote}`
  //     : newNote;
 
  //   return this.ordersService.update(orderId, { adminNotes: updatedNotes }, actor);
  // }
  }