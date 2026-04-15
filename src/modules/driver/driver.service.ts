import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDriverProfileDto, UpdateDriverLocationDto } from './dto/create-driver-profile.dto';
import { DriverResponseDto } from './dto/driver-response.dto';
import { User } from 'src/database/entities/user.entity';
import { Driver, DriverStatus } from 'src/database/entities/driver.entity';
import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createDriverProfile(user: User, dto: CreateDriverProfileDto): Promise<DriverResponseDto> {
    // Check if user already has a driver profile
    const existingDriver = await this.driverRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (existingDriver) {
      throw new ConflictException('Driver profile already exists for this user');
    }

    // Ensure user role is DRIVER
    if (user.role !== 'driver') {
      throw new ForbiddenException('Only users with driver role can create driver profiles');
    }

    const driver = this.driverRepository.create({
      user,
      licenseNumber: dto.licenseNumber,
      status: dto.status || DriverStatus.OFFLINE,
      approvalStatus: DriverApprovalStatus.PENDING,
    });

    const saved = await this.driverRepository.save(driver);
    return this.mapToResponseDto(saved);
  }

  async getMyDriverProfile(user: User): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['vehicle'],
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return this.mapToResponseDto(driver);
  }

  async updateDriverLocation(user: User, dto: UpdateDriverLocationDto): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    driver.currentLatitude = dto.latitude;
    driver.currentLongitude = dto.longitude;
    driver.lastLocationUpdate = new Date();

    const saved = await this.driverRepository.save(driver);
    return this.mapToResponseDto(saved);
  }

  async updateDriverStatus(user: User, status: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    driver.status = status as any;
    const saved = await this.driverRepository.save(driver);
    return this.mapToResponseDto(saved);
  }

  async getDriverById(id: string): Promise<DriverResponseDto> {
    const driver = await this.driverRepository.findOne({
      where: { id },
      relations: ['user', 'vehicle'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return this.mapToResponseDto(driver);
  }

  private mapToResponseDto(driver: Driver): DriverResponseDto {
    const { user, vehicle, ...rest } = driver;
    return {
      ...rest,
      user,
      vehicle: vehicle || undefined,
    };
  }
}