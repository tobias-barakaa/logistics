import {
    IsString,
    IsNotEmpty,
    MinLength,
    IsOptional,
    IsEnum,
    IsDateString,
    IsNumber,
    IsUUID,
    Min,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';
  import { OrderStatus } from 'src/common/enums/order-status.enum';
  import { OrderPriority } from 'src/common/enums/order-priority.enum';
  
  // ── Drivers ────────────────────────────────────────────────────────────────────
  
  export class RejectDriverDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(10, { message: 'Provide a meaningful reason (min 10 characters)' })
    reason: string;
  }
  
  export class ListDriversQueryDto {
    @IsOptional()
    @IsEnum(DriverApprovalStatus)
    approvalStatus?: DriverApprovalStatus;
  }
  
  // ── Orders ─────────────────────────────────────────────────────────────────────
  
  export class AdminListOrdersDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
  
    @IsOptional()
    @IsEnum(OrderPriority)
    priority?: OrderPriority;
  
    @IsOptional()
    @IsUUID()
    driverId?: string;
  
    @IsOptional()
    @IsString()
    search?: string;
  
    @IsOptional()
    @IsDateString()
    dateFrom?: string;
  
    @IsOptional()
    @IsDateString()
    dateTo?: string;
  
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number;
  
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number;
  }
  
  export class AdminCancelOrderDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(5, { message: 'Provide a reason (min 5 characters)' })
    reason: string;
  }
  
  export class AdminAddNoteDto {
    @IsString()
    @IsNotEmpty()
    note: string;
  }