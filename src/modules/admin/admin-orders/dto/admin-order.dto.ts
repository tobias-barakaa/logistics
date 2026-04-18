import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";
import { OrderPriority } from "src/common/enums/order-image.enum";
import { OrderStatus } from "src/common/enums/order-status.enum";

 
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
   