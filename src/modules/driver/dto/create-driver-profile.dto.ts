import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { DriverStatus } from 'src/database/entities/driver.entity';

export class CreateDriverProfileDto {
  @IsString()
  licenseNumber: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}

export class UpdateDriverLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}