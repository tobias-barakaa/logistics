import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsUUID, IsPhoneNumber, IsNotEmpty } from 'class-validator';
import { DriverStatus } from 'src/database/entities/driver.entity';
import { VehicleType } from 'src/database/entities/vehicle.entity';

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
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsNumber()
  capacityKg?: number;
}

export class CreateDriverProfileDto {
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  currentLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  currentLongitude?: number;

  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  phone?: string;

  // Vehicle information - either create new or assign existing
  @IsOptional()
  @IsUUID()
  vehicleId?: string; // Assign existing vehicle

  @IsOptional()
  vehicle?: CreateVehicleDto; // Create new vehicle
  
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;
}

// This is the one I forgot - for updating driver location
export class UpdateDriverLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  longitude: number;
}

// Additional DTOs you might need
export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus)
  @IsNotEmpty()
  status: DriverStatus;
}

export class UpdateDriverVehicleDto {
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;
}

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;
}

export class AdminDriverActionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}