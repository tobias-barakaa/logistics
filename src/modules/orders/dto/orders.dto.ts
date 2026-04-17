import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsNumber,
    IsBoolean,
    IsEnum,
    IsArray,
    ValidateNested,
    IsUUID,
    Min,
    MinLength,
    IsDateString,
    ValidateIf,
    IsMilitaryTime,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { OrderStatus } from 'src/common/enums/order-status.enum';
  import { PaymentMethod } from 'src/common/enums/payment.enum';
  import { ImageType, OrderPriority } from 'src/common/enums/order-image.enum';
  
  // ── Item DTO ──────────────────────────────────────────────────────────────────
  
  export class CreateOrderItemDto {
    @IsString()
    @IsNotEmpty()
    itemName: string;
  
    @IsNumber()
    @Min(1)
    quantity: number;
  
    @IsOptional()
    @IsNumber()
    unitPrice?: number;
  
    @IsOptional()
    @IsNumber()
    weightKg?: number;
  
    @IsOptional()
    @IsString()
    sku?: string;
  
    @IsOptional()
    @IsString()
    notes?: string;
  }
  
  // ── Image DTO ─────────────────────────────────────────────────────────────────
  
  export class CreateOrderImageDto {
    @IsString()
    @IsNotEmpty()
    imageUrl: string;
  
    @IsEnum(ImageType)
    imageType: ImageType;
  
    @IsOptional()
    @IsString()
    caption?: string;
  }
  
  // ── Create Order ──────────────────────────────────────────────────────────────
  
  export class CreateOrderDto {
    // Receiver / Customer
    @IsString()
    @IsNotEmpty()
    customerName: string;
  
    @IsString()
    @IsNotEmpty()
    customerPhone: string;
  
    @IsOptional()
    @IsEmail()
    customerEmail?: string;
  
    @IsString()
    @IsNotEmpty()
    deliveryAddress: string;
  
    @IsOptional()
    @IsString()
    deliveryLandmark?: string;
  
    @IsNumber()
    deliveryLat: number;
  
    @IsNumber()
    deliveryLng: number;
  
    // Pickup / Sender (all required together when requiresPickup = true)
    @IsOptional()
    @IsBoolean()
    requiresPickup?: boolean;
  
    @ValidateIf((o) => o.requiresPickup === true)
    @IsString()
    @IsNotEmpty()
    pickupName?: string;
  
    @ValidateIf((o) => o.requiresPickup === true)
    @IsString()
    @IsNotEmpty()
    pickupAddress?: string;
  
    @IsOptional()
    @IsString()
    pickupLandmark?: string;
  
    @ValidateIf((o) => o.requiresPickup === true)
    @IsNumber()
    pickupLat?: number;
  
    @ValidateIf((o) => o.requiresPickup === true)
    @IsNumber()
    pickupLng?: number;
  
    // Delivery constraints
    @IsOptional()
    @IsMilitaryTime()  // "09:00", "17:30"
    timeWindowStart?: string;
  
    @IsOptional()
    @IsMilitaryTime()
    timeWindowEnd?: string;
  
    @IsOptional()
    @IsEnum(OrderPriority)
    priority?: OrderPriority;
  
    @IsOptional()
    @IsString()
    deliveryInstructions?: string;
  
    @IsOptional()
    @IsBoolean()
    isFragile?: boolean;
  
    @IsOptional()
    @IsBoolean()
    requiresSignature?: boolean;
  
    @IsOptional()
    @IsBoolean()
    requiresPhoto?: boolean;
  
    // Financials
    @IsOptional()
    @IsNumber()
    subtotal?: number;
  
    @IsOptional()
    @IsNumber()
    deliveryFee?: number;
  
    @IsOptional()
    @IsNumber()
    totalAmount?: number;
  
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;
  
    // Relations
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items?: CreateOrderItemDto[];
  
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderImageDto)
    images?: CreateOrderImageDto[];
  
    @IsOptional()
    @IsString()
    adminNotes?: string;
  }
  
  // ── Update Order ──────────────────────────────────────────────────────────────
  
  export class UpdateOrderDto {
    @IsOptional()
    @IsString()
    customerName?: string;
  
    @IsOptional()
    @IsString()
    customerPhone?: string;
  
    @IsOptional()
    @IsString()
    deliveryAddress?: string;
  
    @IsOptional()
    @IsNumber()
    deliveryLat?: number;
  
    @IsOptional()
    @IsNumber()
    deliveryLng?: number;
  
    @IsOptional()
    @IsMilitaryTime()
    timeWindowStart?: string;
  
    @IsOptional()
    @IsMilitaryTime()
    timeWindowEnd?: string;
  
    @IsOptional()
    @IsEnum(OrderPriority)
    priority?: OrderPriority;
  
    @IsOptional()
    @IsString()
    deliveryInstructions?: string;
  
    @IsOptional()
    @IsBoolean()
    isFragile?: boolean;
  
    @IsOptional()
    @IsString()
    adminNotes?: string;
  
    @IsOptional()
    @IsNumber()
    deliveryFee?: number;
  
    @IsOptional()
    @IsNumber()
    totalAmount?: number;
  }
  
  // ── Assign Driver ─────────────────────────────────────────────────────────────
  
  export class AssignDriverDto {
    @IsUUID()
    driverId: string;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    routeStopOrder?: number;
  
    @IsOptional()
    @IsDateString()
    estimatedDeliveryTime?: string;
  
    @IsOptional()
    @IsString()
    adminNotes?: string;
  }
  
  // ── Cancel Order ──────────────────────────────────────────────────────────────
  
  export class CancelOrderDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(5, { message: 'Provide a meaningful cancellation reason' })
    reason: string;
  }
  
  // ── Update Status (driver-facing) ─────────────────────────────────────────────
  
  export class UpdateOrderStatusDto {
    @IsEnum(OrderStatus)
    status: OrderStatus;
  
    @IsOptional()
    @IsString()
    notes?: string;
  
    // Required when marking DELIVERED
    @IsOptional()
    @IsString()
    signatureImageUrl?: string;
  
    @IsOptional()
    @IsString()
    deliveryPhotoUrl?: string;
  
    // Required when marking FAILED
    @IsOptional()
    @IsString()
    failureReason?: string;
  }
  
  // ── Query / Filters ───────────────────────────────────────────────────────────
  
  export class FilterOrdersDto {
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
  
    @IsOptional()
    @IsUUID()
    driverId?: string;
  
    @IsOptional()
    @IsEnum(OrderPriority)
    priority?: OrderPriority;
  
    @IsOptional()
    @IsString()
    search?: string; // matches orderNumber, trackingNumber, customerName, customerPhone
  
    @IsOptional()
    @IsDateString()
    dateFrom?: string;
  
    @IsOptional()
    @IsDateString()
    dateTo?: string;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number;
  }