import {
    Injectable,
    NotFoundException,
    ConflictException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Driver } from 'src/database/entities/driver.entity';
  import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';
import { ListDriversQueryDto, RejectDriverDto } from './dto/admin-driver.dto';
  
  @Injectable()
  export class AdminDriverService {
    constructor(
      @InjectRepository(Driver)
      private readonly driverRepository: Repository<Driver>,
    ) {}
  
    // ── List drivers ─────────────────────────────────────────────────────────────
    // If no approvalStatus query param is passed, returns ALL drivers.
    // Admin typically lands on this with ?approvalStatus=pending first.
  
    async listDrivers(query: ListDriversQueryDto) {
        const where: any = {};
      
        if (query.approvalStatus) {
          where.approvalStatus = query.approvalStatus;
        }
      
        const drivers = await this.driverRepository.find({
          where,
          relations: ['user', 'vehicle'],
          order: { createdAt: 'DESC' },
        });
      
        return drivers.map((d) => this.toSafeDriver(d));
      }
  
    // ── Approve ───────────────────────────────────────────────────────────────────
  
    async approveDriver(driverId: string) {
      const driver = await this.findDriverOrFail(driverId);
  
      if (driver.approvalStatus === DriverApprovalStatus.APPROVED) {
        throw new ConflictException('Driver is already approved');
      }
  
      driver.approvalStatus = DriverApprovalStatus.APPROVED;
      driver.rejectionReason = null; // clear any previous rejection reason
  
      const saved = await this.driverRepository.save(driver);
      return this.toSafeDriver(saved);
    }
  
    // ── Reject ────────────────────────────────────────────────────────────────────
  
    async rejectDriver(driverId: string, dto: RejectDriverDto) {
      const driver = await this.findDriverOrFail(driverId);
  
      if (driver.approvalStatus === DriverApprovalStatus.REJECTED) {
        throw new ConflictException('Driver is already rejected');
      }
  
      driver.approvalStatus = DriverApprovalStatus.REJECTED;
      driver.rejectionReason = dto.reason;
  
      const saved = await this.driverRepository.save(driver);
      return this.toSafeDriver(saved);
    }
  
    // ── Get single driver (admin view) ───────────────────────────────────────────
  
    async getDriver(driverId: string) {
      const driver = await this.findDriverOrFail(driverId);
      return this.toSafeDriver(driver);
    }
  
    // ── Helpers ───────────────────────────────────────────────────────────────────
  
    private async findDriverOrFail(driverId: string): Promise<Driver> {
      const driver = await this.driverRepository.findOne({
        where: { id: driverId },
        relations: ['user', 'vehicle'],
      });
  
      if (!driver) {
        throw new NotFoundException(`Driver with id "${driverId}" not found`);
      }
  
      return driver;
    }
  
    // Strip the password off the nested user before sending to frontend
    private toSafeDriver(driver: Driver) {
      const { user, ...rest } = driver;
      if (user) {
        const { password, ...safeUser } = user as any;
        return { ...rest, user: safeUser };
      }
      return rest;
    }
  }