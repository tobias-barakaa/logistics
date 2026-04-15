import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export enum VehicleStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum VehicleType {
  MOTORCYCLE = 'motorcycle',
  VAN = 'van',
  TRUCK = 'truck',
  PICKUP = 'pickup',
}

export class CreateVehicleDto {
  @IsNotEmpty()
  @IsString()
  plateNumber: string;

  @IsNotEmpty()
  @IsEnum(VehicleType)
  type: VehicleType;

  @IsNotEmpty()
  @IsString()
  make: string;

  @IsNotEmpty()
  @IsString()
  model: string;

  @IsInt()
  @Min(1990)
  year: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityKg?: number;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityKg?: number;
}

export class UpdateVehicleStatusDto {
  @IsEnum(VehicleStatus)
  status: VehicleStatus;
}