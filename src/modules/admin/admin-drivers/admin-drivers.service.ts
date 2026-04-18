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
  
  @Injectable()
  export class AdminDriverService {
    constructor(
      // @InjectRepository(Driver)
      // private readonly driverRepository: Repository<Driver>,
      @InjectRepository(Driver)
      private readonly driverRepo: Repository<Driver>,
    
      @InjectRepository(Vehicle)
      private readonly vehicleRepo: Repository<Vehicle>,
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
    }
  
    
  }