import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsUUID,
  ValidateNested,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteStrategy } from 'src/database/entities/route-plan.entity';

// ── Shared ────────────────────────────────────────────────────────────────────

export class LatLngDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

// ── Geocode ───────────────────────────────────────────────────────────────────

export class GeocodeDto {
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class GeocodeResultDto {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string;
}

// ── Distance Matrix ───────────────────────────────────────────────────────────

export class DistanceMatrixDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LatLngDto)
  origins: LatLngDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LatLngDto)
  destinations: LatLngDto[];
}

export class DistanceMatrixElement {
  origin: LatLngDto;
  destination: LatLngDto;
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

// ── Route Optimization ────────────────────────────────────────────────────────

export class OptimizeRouteDto {
  @IsUUID()
  driverId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];

  @IsOptional()
  @IsEnum(RouteStrategy)
  strategy?: RouteStrategy;

  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  depotLocation?: LatLngDto;
}

export class OptimizeMultipleDriversDto {
  @IsArray()
  @IsUUID('4', { each: true })
  driverIds: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];

  @IsOptional()
  @IsEnum(RouteStrategy)
  strategy?: RouteStrategy;

  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  depotLocation?: LatLngDto;
}

// ── Route Analysis ────────────────────────────────────────────────────────────

export class AnalyzeRouteDto {
  @IsUUID()
  driverId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  additionalContext?: string;
}

// ── Route Plan Responses ──────────────────────────────────────────────────────

export class RouteLegDto {
  fromOrderId: string | 'depot';
  toOrderId: string | 'depot';
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  polyline?: string;
}

export class RouteStopDto {
  orderId: string;
  orderNumber: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  stopOrder: number;
  estimatedArrival: string;
  distanceFromPreviousKm: number;
  durationFromPreviousMin: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  priority?: string;
}

export class OptimizedRouteResponse {
  routePlanId?: string;
  driverId: string;
  driverName: string;
  strategy: RouteStrategy;
  totalDistanceKm: number;
  totalDurationMin: number;
  estimatedCompletionTime: string;
  stops: RouteStopDto[];
  legs: RouteLegDto[];
  googlePolyline?: string;
  aiAnalysis?: string;
  aiRecommendations?: string;
}

// ── Batch Assignment ──────────────────────────────────────────────────────────

export class BatchAssignDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriverAssignmentDto)
  assignments: DriverAssignmentDto[];
}

export class DriverAssignmentDto {
  @IsUUID()
  driverId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];
}

// ── Live Route Update ─────────────────────────────────────────────────────────

export class UpdateRouteProgressDto {
  @IsUUID()
  routePlanId: string;

  @IsUUID()
  completedOrderId: string;
}

// ── ETA Query ─────────────────────────────────────────────────────────────────

export class GetEtaDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  driverLocation?: LatLngDto;
}

export class EtaResponse {
  orderId: string;
  estimatedArrival: string;
  distanceRemainingKm: number;
  durationRemainingMin: number;
  currentLocation: LatLngDto;
  nextStop: RouteStopDto | null;
}
