import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, DeepPartial } from 'typeorm';
import { CreateDriverProfileDto, CreateVehicleDto, UpdateDriverLocationDto, UpdateDriverProfileDto } from './dto/create-driver-profile.dto';
import { DriverResponseDto } from './dto/driver-response.dto';
import { Driver, DriverStatus } from 'src/database/entities/driver.entity';
import { User } from 'src/database/entities/user.entity';
import { Vehicle } from 'src/database/entities/vehicle.entity';
import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private dataSource: DataSource,
  ) {}

  async createDriverProfile(
    user: User,
    dto: CreateDriverProfileDto,
  ): Promise<DriverResponseDto> {
  
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
  
    try {
      const existingDriver = await queryRunner.manager.findOne(Driver, {
        where: { user: { id: user.id } },
      });
  
      if (existingDriver) {
        throw new ConflictException('Driver profile already exists');
      }
  
      if (user.role !== 'driver') {
        throw new ForbiddenException('Only drivers allowed');
      }
  
      let vehicle: Vehicle | null = null;
  
      if (dto.vehicleId) {
        vehicle = await queryRunner.manager.findOne(Vehicle, {
          where: { id: dto.vehicleId },
          relations: ['driver'],
        });
  
        if (!vehicle) throw new NotFoundException('Vehicle not found');
  
        if (vehicle.driver) {
          throw new ConflictException('Vehicle already assigned');
        }
      } 
      else if (dto.vehicle) {
        vehicle = await this.createVehicle(dto.vehicle, queryRunner.manager);
      }
  
      const driver = queryRunner.manager.create(Driver, {
        user: user,
        licenseNumber: dto.licenseNumber,
        status: dto.status ?? DriverStatus.OFFLINE,
        approvalStatus: DriverApprovalStatus.PENDING,
        currentLatitude: dto.currentLatitude,
        currentLongitude: dto.currentLongitude,
        lastLocationUpdate:
          dto.currentLatitude && dto.currentLongitude ? new Date() : null,
        vehicle: vehicle ?? undefined,
      } as DeepPartial<Driver>);
  
      const saved = await queryRunner.manager.save(Driver, driver);
  
      await queryRunner.commitTransaction();
  
      const completeDriver = await queryRunner.manager.findOne(Driver, {
        where: { id: saved.id },
        relations: ['user', 'vehicle'],
      });
  
      if (!completeDriver) {
        throw new NotFoundException('Driver not found after creation');
      }
  
      return this.mapToResponseDto(completeDriver);
  
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  };

  private async createVehicle(
    vehicleDto: CreateVehicleDto,
    manager: EntityManager,
  ): Promise<Vehicle> {
    const vehicle = manager.create(Vehicle, {
      plateNumber: vehicleDto.plateNumber,
      model: vehicleDto.model,
      type: vehicleDto.type,
      year: vehicleDto.year,
      capacityKg: vehicleDto.capacityKg,
    });
  
    return await manager.save(Vehicle, vehicle);
  }

  async getMyDriverProfile(user: User): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user', 'vehicle', 'orders'],
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.mapToResponseDto(driver);
  }

//   async updateDriverLocation(user: User, dto: UpdateDriverLocationDto): Promise<DriverResponseDto> {
//     const driver = await this.driverRepository.findOne({
//       where: { user: { id: user.id } },
//     });

//     if (!driver) {
//       throw new NotFoundException('Driver profile not found');
//     }

//     driver.currentLatitude = dto.latitude;
//     driver.currentLongitude = dto.longitude;
//     driver.lastLocationUpdate = new Date();

//     const saved = await this.driverRepository.save(driver);
//     return this.mapToResponseDto(await this.getDriverWithRelations(saved.id));
//   }

//   async updateDriverProfile(user: User, dto: UpdateDriverProfileDto): Promise<DriverResponseDto> {
//     const driver = await this.driverRepository.findOne({
//       where: { user: { id: user.id } },
//     });
  
//     if (!driver) {
//       throw new NotFoundException('Driver profile not found');
//     }
  
//     // Update only the fields that are provided
//     if (dto.licenseNumber) driver.licenseNumber = dto.licenseNumber;
//     if (dto.phone) driver.phone = dto.phone;
//     if (dto.emergencyContactName) driver.emergencyContactName = dto.emergencyContactName;
//     if (dto.emergencyContactPhone) driver.emergencyContactPhone = dto.emergencyContactPhone;
//     if (dto.bankName) driver.bankName = dto.bankName;
//     if (dto.bankAccountNumber) driver.bankAccountNumber = dto.bankAccountNumber;
//     if (dto.bankAccountName) driver.bankAccountName = dto.bankAccountName;
  
//     const saved = await this.driverRepository.save(driver);
//     return this.mapToResponseDto(await this.getDriverWithRelations(saved.id));
//   }


  async updateDriverStatus(user: User, status: DriverStatus): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    driver.status = status;
    const saved = await this.driverRepository.save(driver);
    return this.mapToResponseDto(await this.getDriverWithRelations(saved.id));
  }

  async updateDriverVehicle(user: User, vehicleId: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    driver.vehicle = vehicle;
    const saved = await this.driverRepository.save(driver);
    return this.mapToResponseDto(await this.getDriverWithRelations(saved.id));
  }

  async getDriverById(id: string): Promise<DriverResponseDto> {
    const driver = await this.getDriverWithRelations(id);
    
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return this.mapToResponseDto(driver);
  }

  async getAllDrivers(filters?: { status?: DriverStatus; approvalStatus?: DriverApprovalStatus }): Promise<DriverResponseDto[]> {
    const query = this.driverRepository.createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .leftJoinAndSelect('driver.vehicle', 'vehicle');

    if (filters?.status) {
      query.andWhere('driver.status = :status', { status: filters.status });
    }

    if (filters?.approvalStatus) {
      query.andWhere('driver.approvalStatus = :approvalStatus', { approvalStatus: filters.approvalStatus });
    }

    const drivers = await query.getMany();
    return drivers.map(driver => this.mapToResponseDto(driver));
  }

  async approveDriver(user: User, driverId: string): Promise<DriverResponseDto> {
    // Check if requesting user is admin
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can approve drivers');
    }

    const driver = await this.getDriverWithRelations(driverId);
    
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    driver.approvalStatus = DriverApprovalStatus.APPROVED;
    const saved = await this.driverRepository.save(driver);
    return this.mapToResponseDto(await this.getDriverWithRelations(saved.id));
  }

  async rejectDriver(user: User, driverId: string, reason?: string): Promise<DriverResponseDto> {
    // Check if requesting user is admin
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can reject drivers');
    }

    const driver = await this.getDriverWithRelations(driverId);
    
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    driver.approvalStatus = DriverApprovalStatus.REJECTED;
    // You might want to add a rejection reason column
    const saved = await this.driverRepository.save(driver);
    return this.mapToResponseDto(await this.getDriverWithRelations(saved.id));
  }

  private async getDriverWithRelations(id: string): Promise<Driver> {
    const driver = await this.driverRepository.findOne({
      where: { id },
      relations: ['user', 'vehicle', 'orders'],
    });
  
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
  
    return driver;
  }

  private mapToResponseDto(driver: Driver): DriverResponseDto {
    const { user, vehicle, orders, ...rest } = driver;
  
    return {
      ...rest,
      user,
      vehicle: vehicle || undefined,
    };
  }
//   private mapToResponseDto(driver: Driver): DriverResponseDto {
//     const { user, vehicle, orders, ...rest } = driver;
//     return {
//       ...rest,
//       user,
//       vehicle: vehicle || undefined,
//       orders: orders || [],
//     };
//   }
}