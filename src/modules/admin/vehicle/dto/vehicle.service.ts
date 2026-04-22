import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, ILike } from 'typeorm';
  import { Vehicle, VehicleStatus } from 'src/database/entities/vehicle.entity';
  import {
    CreateVehicleDto,
    FilterVehiclesDto,
    UpdateVehicleDto,
  } from './vehicle.dto';
  
  @Injectable()
  export class VehiclesService {
    constructor(
      @InjectRepository(Vehicle)
      private readonly vehicleRepository: Repository<Vehicle>,
    ) {}
  
    // ── Helpers ────────────────────────────────────────────────────────────────
  
    private async findOneOrFail(id: string): Promise<Vehicle> {
      const vehicle = await this.vehicleRepository.findOne({
        where: { id },
        relations: ['driver', 'driver.user'],
      });
      if (!vehicle) throw new NotFoundException(`Vehicle "${id}" not found`);
      return vehicle;
    }
  
    // ── Create ─────────────────────────────────────────────────────────────────
  
    async create(dto: CreateVehicleDto): Promise<Vehicle> {
      const existing = await this.vehicleRepository.findOne({
        where: { plateNumber: dto.plateNumber },
      });
      if (existing) {
        throw new ConflictException(
          `A vehicle with plate number "${dto.plateNumber}" already exists`,
        );
      }
  
      const vehicle = this.vehicleRepository.create(dto);
      return this.vehicleRepository.save(vehicle);
    }
  
    // ── List (paginated + filtered) ────────────────────────────────────────────
  
    async findAll(
      filters: FilterVehiclesDto,
    ): Promise<{ data: Vehicle[]; total: number; page: number; limit: number }> {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
  
      const qb = this.vehicleRepository
        .createQueryBuilder('vehicle')
        .leftJoinAndSelect('vehicle.driver', 'driver')
        .leftJoinAndSelect('driver.user', 'driverUser')
        .orderBy('vehicle.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);
  
      if (filters.type) {
        qb.andWhere('vehicle.type = :type', { type: filters.type });
      }
      if (filters.status) {
        qb.andWhere('vehicle.status = :status', { status: filters.status });
      }
      if (filters.search) {
        qb.andWhere(
          '(vehicle.plateNumber ILIKE :s OR vehicle.model ILIKE :s)',
          { s: `%${filters.search}%` },
        );
      }
  
      const [data, total] = await qb.getManyAndCount();
      return { data, total, page, limit };
    }
  
    // ── Find one ───────────────────────────────────────────────────────────────
  
    async findOne(id: string): Promise<Vehicle> {
      return this.findOneOrFail(id);
    }
  
    async findByPlate(plateNumber: string): Promise<Vehicle> {
      const vehicle = await this.vehicleRepository.findOne({
        where: { plateNumber },
        relations: ['driver', 'driver.user'],
      });
      if (!vehicle)
        throw new NotFoundException(`Vehicle with plate "${plateNumber}" not found`);
      return vehicle;
    }
  
    // ── Update ─────────────────────────────────────────────────────────────────
  
    async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
      const vehicle = await this.findOneOrFail(id);
  
      // Guard: don't allow plate-number collision on updates
      if (dto.plateNumber && dto.plateNumber !== vehicle.plateNumber) {
        const clash = await this.vehicleRepository.findOne({
          where: { plateNumber: dto.plateNumber },
        });
        if (clash) {
          throw new ConflictException(
            `Plate number "${dto.plateNumber}" is already in use`,
          );
        }
      }
  
      await this.vehicleRepository.update(id, { ...dto });
      return this.findOneOrFail(id);
    }
  
    // ── Update status only ─────────────────────────────────────────────────────
  
    async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
      await this.findOneOrFail(id);
      await this.vehicleRepository.update(id, { status });
      return this.findOneOrFail(id);
    }
  
    // ── Delete ─────────────────────────────────────────────────────────────────
  
    async remove(id: string): Promise<{ message: string }> {
      const vehicle = await this.findOneOrFail(id);
  
      if (vehicle.status === VehicleStatus.IN_TRANSIT) {
        throw new BadRequestException(
          'Cannot delete a vehicle that is currently in transit',
        );
      }
  
      await this.vehicleRepository.delete(id);
      return { message: `Vehicle "${id}" deleted successfully` };
    }
  }