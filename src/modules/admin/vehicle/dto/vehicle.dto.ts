import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleStatus, VehicleType } from 'src/database/entities/vehicle.entity';

// ── Create ─────────────────────────────────────────────────────────────────

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsEnum(VehicleType)
  type: VehicleType;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;
}

// ── Update ─────────────────────────────────────────────────────────────────
// All fields optional — clients PATCH only what they need to change.

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;
}

// ── Filter / List ──────────────────────────────────────────────────────────

export class FilterVehiclesDto {
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  /** Free-text search on plateNumber or model */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}