import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { DeepPartial, Repository } from 'typeorm';
  import { Driver, DriverStatus } from 'src/database/entities/driver.entity';
  import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';
import { ListDriversQueryDto, RejectDriverDto } from './dto/admin-driver.dto';
import { Vehicle } from 'src/database/entities/vehicle.entity';
import { User, UserRole } from 'src/database/entities/user.entity';
import { CreateDriverProfileDto } from 'src/modules/driver/dto/create-driver-profile.dto';
import { OrdersService } from 'src/modules/orders/orders.service';
import { AdminListOrdersDto } from '../admin.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
  
  @Injectable()
  export class AdminDriverService {
    constructor(
      // @InjectRepository(Driver)
      // private readonly driverRepository: Repository<Driver>,
      @InjectRepository(Driver)
      private readonly driverRepo: Repository<Driver>,
    
      @InjectRepository(Vehicle)
      private readonly vehicleRepo: Repository<Vehicle>,
            private readonly ordersService: OrdersService,
    ) {}
  
    // ── List drivers ─────────────────────────────────────────────────────────────
    // If no approvalStatus query param is passed, returns ALL drivers.
    // Admin typically lands on this with ?approvalStatus=pending first.


    async createDriverProfile(
      user: User,
      dto: CreateDriverProfileDto,
    ): Promise<Driver> {
      // Ensure logged in user is a driver
      if (user.role !== UserRole.DRIVER) {
        throw new ForbiddenException('Only drivers can create a profile');
      }
    
      // Check if profile already exists
      const existingDriver = await this.driverRepo.findOne({
        where: { user: { id: user.id } },
        relations: ['user', 'vehicle'],
      });
    
      if (existingDriver) {
        throw new BadRequestException('Driver profile already exists');
      }
    
      let assignedVehicle: Vehicle | null = null;
    
      /**
       * CASE 1: Existing vehicle selected
       */
      if (dto.vehicleId) {
        assignedVehicle = await this.vehicleRepo.findOne({
          where: { id: dto.vehicleId },
          relations: ['driver'],
        });
    
        if (!assignedVehicle) {
          throw new NotFoundException('Vehicle not found');
        }
    
        if (assignedVehicle.driver) {
          throw new BadRequestException('Vehicle already assigned to another driver');
        }
      }
    
      /**
       * CASE 2: Create new vehicle
       */
      if (dto.vehicle) {
        const plateExists = await this.vehicleRepo.findOne({
          where: { plateNumber: dto.vehicle.plateNumber },
        });
    
        if (plateExists) {
          throw new BadRequestException('Vehicle plate number already exists');
        }
    
        assignedVehicle = this.vehicleRepo.create({
          plateNumber: dto.vehicle.plateNumber,
          model: dto.vehicle.model,
          type: dto.vehicle.type,
          year: dto.vehicle.year,
          capacityKg: dto.vehicle.capacityKg,
        });
    
        assignedVehicle = await this.vehicleRepo.save(assignedVehicle);
      }
    
      /**
       * Cannot send both vehicleId and vehicle
       */
      if (dto.vehicleId && dto.vehicle) {
        throw new BadRequestException(
          'Provide either vehicleId or vehicle object, not both',
        );
      }
    
      const driver = this.driverRepo.create({
        user: user as DeepPartial<User>,
        licenseNumber: dto.licenseNumber,
        status: dto.status || DriverStatus.OFFLINE,
        currentLatitude: dto.currentLatitude,
        currentLongitude: dto.currentLongitude,
        lastLocationUpdate:
          dto.currentLatitude !== undefined &&
          dto.currentLongitude !== undefined
            ? new Date()
            : undefined,
        vehicle: assignedVehicle || undefined,
      });
      
      return await this.driverRepo.save(driver);
    };



    // async listOrders(query: AdminListOrdersDto) {
    //   return this.ordersService.findAll(query);
    // }

    
   
  
    // // Convenience shortcut — admin lands here first when they open Orders
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
  
      const drivers = await this.driverRepo.find({
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
  
      return this.toSafeDriver(await this.driverRepo.save(driver));
    }
  
    async rejectDriver(driverId: string, dto: RejectDriverDto) {
      const driver = await this.findDriverOrFail(driverId);
  
      if (driver.approvalStatus === DriverApprovalStatus.REJECTED) {
        throw new ConflictException('Driver is already rejected');
      }
  
      driver.approvalStatus = DriverApprovalStatus.REJECTED;
      driver.rejectionReason = dto.reason;
  
      return this.toSafeDriver(await this.driverRepo.save(driver));
    }
  
    // ── Private ────────────────────────────────────────────────────────────────
  
    private async findDriverOrFail(id: string): Promise<Driver> {
      const driver = await this.driverRepo.findOne({
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

  
    
  }