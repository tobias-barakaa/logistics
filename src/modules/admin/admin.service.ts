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
  import { AssignDriverDto } from 'src/modules/orders/dto/orders.dto';
import { AdminAddNoteDto, AdminCancelOrderDto, AdminListOrdersDto, ListDriversQueryDto, RejectDriverDto } from './admin.dto';
import { Order } from 'src/database/entities/order.entity';
  
  @Injectable()
  export class AdminService {
    constructor(
      @InjectRepository(Driver)
      private readonly driverRepository: Repository<Driver>,
      private readonly ordersService: OrdersService,
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
  
    async listOrders(query: AdminListOrdersDto) {
      return this.ordersService.findAll(query);
    }
  
    // Convenience shortcut — admin lands here first when they open Orders
    async listPendingOrders() {
      return this.ordersService.findAll({ status: OrderStatus.PENDING, limit: 50 });
    }
  
    async getOrder(orderId: string) {
      return this.ordersService.findOne(orderId);
    }
  
    async findByTracking(trackingNumber: string) {
      return this.ordersService.findByTracking(trackingNumber);
    }
  
    // ── Orders: actions ────────────────────────────────────────────────────────
  
    // async assignDriver(orderId: string, dto: AssignDriverDto, actor: User) {
    //   const order = await this.ordersService.findOneOrFail(orderId);
    
    //   if (order.status !== OrderStatus.PENDING) {
    //     throw new BadRequestException(
    //       `Only PENDING orders can be assigned. This order is "${order.status}"`,
    //     );
    //   }
    
    //   return this.ordersService.assignDriver(orderId, dto, actor);
    // }
  

    // private async findOneOrFail(id: string): Promise<Order> {
    //   const order = await this.orderRepository.findOne({
    //     where: { id },
    //     relations: ORDER_RELATIONS,
    //   });
    //   if (!order) throw new NotFoundException(`Order "${id}" not found`);
    //   return order;
    // }
  
    // private async writeHistory(
    //   manager: any,
    //   order: Order,
    //   oldStatus: OrderStatus | null,
    //   newStatus: OrderStatus,
    //   changedBy: string,
    //   notes?: string,
    // ): Promise<void> {
    //   const entry = manager.create(OrderStatusHistory, {
    //     order,
    //     oldStatus,
    //     newStatus,
    //     changedBy,
    //     notes: notes ?? null,
    //   });
    //   await manager.save(OrderStatusHistory, entry);
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
  
    // ── Drivers: approval ──────────────────────────────────────────────────────
  
    async listDrivers(query: ListDriversQueryDto) {
      const where = query.approvalStatus ? { approvalStatus: query.approvalStatus } : {};
  
      const drivers = await this.driverRepository.find({
        where,
        relations: ['user', 'vehicle'],
        order: { createdAt: 'DESC' },
      });
  
      return drivers.map((d) => this.toSafeDriver(d));
    }
  
    async getDriver(driverId: string) {
      return this.toSafeDriver(await this.findDriverOrFail(driverId));
    }
  
    async approveDriver(driverId: string) {
      const driver = await this.findDriverOrFail(driverId);
  
      if (driver.approvalStatus === DriverApprovalStatus.APPROVED) {
        throw new ConflictException('Driver is already approved');
      }
  
      driver.approvalStatus = DriverApprovalStatus.APPROVED;
      driver.rejectionReason = null;
  
      return this.toSafeDriver(await this.driverRepository.save(driver));
    }
  
    async rejectDriver(driverId: string, dto: RejectDriverDto) {
      const driver = await this.findDriverOrFail(driverId);
  
      if (driver.approvalStatus === DriverApprovalStatus.REJECTED) {
        throw new ConflictException('Driver is already rejected');
      }
  
      driver.approvalStatus = DriverApprovalStatus.REJECTED;
      driver.rejectionReason = dto.reason;
  
      return this.toSafeDriver(await this.driverRepository.save(driver));
    }
  
    // ── Private ────────────────────────────────────────────────────────────────
  
    private async findDriverOrFail(id: string): Promise<Driver> {
      const driver = await this.driverRepository.findOne({
        where: { id },
        relations: ['user', 'vehicle'],
      });
      if (!driver) throw new NotFoundException(`Driver "${id}" not found`);
      return driver;
    }
  
    private toSafeDriver(driver: Driver) {
      const { user, ...rest } = driver;
      if (user) {
        const { password, ...safeUser } = user as any;
        return { ...rest, user: safeUser };
      }
      return rest;
    };


    // async listDrivers(query: ListDriversQueryDto) {
    //   const where: any = {};
    
    //   if (query.approvalStatus) {
    //     where.approvalStatus = query.approvalStatus;
    //   }
    
    //   const drivers = await this.driverRepository.find({
    //     where,
    //     relations: ['user', 'vehicle'],
    //     order: { createdAt: 'DESC' },
    //   });
    
    //   return drivers.map((d) => this.toSafeDriver(d));
    // }

  // // ── Approve ───────────────────────────────────────────────────────────────────

  // async approveDriver(driverId: string) {
  //   const driver = await this.findDriverOrFail(driverId);

  //   if (driver.approvalStatus === DriverApprovalStatus.APPROVED) {
  //     throw new ConflictException('Driver is already approved');
  //   }

  //   driver.approvalStatus = DriverApprovalStatus.APPROVED;
  //   driver.rejectionReason = null; // clear any previous rejection reason

  //   const saved = await this.driverRepository.save(driver);
  //   return this.toSafeDriver(saved);
  // }

  // // ── Reject ────────────────────────────────────────────────────────────────────

  // async rejectDriver(driverId: string, dto: RejectDriverDto) {
  //   const driver = await this.findDriverOrFail(driverId);

  //   if (driver.approvalStatus === DriverApprovalStatus.REJECTED) {
  //     throw new ConflictException('Driver is already rejected');
  //   }

  //   driver.approvalStatus = DriverApprovalStatus.REJECTED;
  //   driver.rejectionReason = dto.reason;

  //   const saved = await this.driverRepository.save(driver);
  //   return this.toSafeDriver(saved);
  // }

  // // ── Get single driver (admin view) ───────────────────────────────────────────

  // async getDriver(driverId: string) {
  //   const driver = await this.findDriverOrFail(driverId);
  //   return this.toSafeDriver(driver);
  // }

  // // ── Helpers ───────────────────────────────────────────────────────────────────

  // private async findDriverOrFail(driverId: string): Promise<Driver> {
  //   const driver = await this.driverRepository.findOne({
  //     where: { id: driverId },
  //     relations: ['user', 'vehicle'],
  //   });

  //   if (!driver) {
  //     throw new NotFoundException(`Driver with id "${driverId}" not found`);
  //   }

  //   return driver;
  // }

  // // Strip the password off the nested user before sending to frontend
  // private toSafeDriver(driver: Driver) {
  //   const { user, ...rest } = driver;
  //   if (user) {
  //     const { password, ...safeUser } = user as any;
  //     return { ...rest, user: safeUser };
  //   }
  //   return rest;
  // }
  }