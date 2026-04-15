import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle, VehicleStatus } from 'src/database/entities/vehicle.entity';
import { Repository } from 'typeorm';
import { CreateVehicleDto, UpdateVehicleDto, UpdateVehicleStatusDto } from './dto/vehicles.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const existing = await this.vehicleRepo.findOne({
      where: { plateNumber: dto.plateNumber },
    });
    if (existing) {
      throw new ConflictException(`Vehicle with plate ${dto.plateNumber} already exists`);
    }
    const vehicle = this.vehicleRepo.create({
      ...dto,
      status: VehicleStatus.AVAILABLE,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehicleRepo.find({
      relations: ['driver'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id },
      relations: ['driver'],
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }

  async findAvailable(): Promise<Vehicle[]> {
    return this.vehicleRepo.find({
      where: { status: VehicleStatus.AVAILABLE },
      order: { type: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);
    Object.assign(vehicle, dto);
    return this.vehicleRepo.save(vehicle);
  }

  async updateStatus(id: string, dto: UpdateVehicleStatusDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);
    vehicle.status = dto.status;
    return this.vehicleRepo.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehicleRepo.remove(vehicle);
  }

  // Used internally by analytics
  async getFleetStats() {
    const counts = await this.vehicleRepo
      .createQueryBuilder('v')
      .select('v.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('v.status')
      .getRawMany();
    return counts.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);
  }
}