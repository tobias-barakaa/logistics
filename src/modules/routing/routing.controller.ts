import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RoutingService } from './routing.service';
import {
  OptimizeRouteDto,
  OptimizeMultipleDriversDto,
  AnalyzeRouteDto,
  GeocodeDto,
  DistanceMatrixDto,
  GetEtaDto,
  UpdateRouteProgressDto,
} from './dto/routing.dto';

@ApiTags('Routing & Map Analysis')
@Controller('routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  // ── Geocoding ─────────────────────────────────────────────────────────────────

  @Post('geocode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Geocode an address to lat/lng' })
  async geocode(@Body() dto: GeocodeDto) {
    return this.routingService.geocodeAddress(dto.address);
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Reverse geocode lat/lng to address' })
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.routingService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  }

  // ── Distance Matrix ───────────────────────────────────────────────────────────

  @Post('distance-matrix')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get distance & duration matrix between points' })
  async distanceMatrix(@Body() dto: DistanceMatrixDto) {
    return this.routingService.getDistanceMatrix(dto.origins, dto.destinations);
  }

  // ── Route Optimization ────────────────────────────────────────────────────────

  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Optimize route for a single driver' })
  async optimize(@Body() dto: OptimizeRouteDto) {
    return this.routingService.optimizeRoute(dto);
  }

  @Post('optimize-batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Optimize routes for multiple drivers simultaneously' })
  async optimizeBatch(@Body() dto: OptimizeMultipleDriversDto) {
    return this.routingService.optimizeMultipleDrivers(dto);
  }

  // ── AI Analysis ───────────────────────────────────────────────────────────────

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get DeepSeek AI analysis for a planned route' })
  async analyze(@Body() dto: AnalyzeRouteDto) {
    return this.routingService.analyzeRoute(dto);
  }

  // ── ETA ───────────────────────────────────────────────────────────────────────

  @Post('eta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get live ETA for an order' })
  async getEta(@Body() dto: GetEtaDto) {
    return this.routingService.getEta(dto.orderId, dto.driverLocation);
  }

  // ── Route Plans ───────────────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'List route plans (optionally filter by driver)' })
  async listPlans(@Query('driverId') driverId?: string) {
    return this.routingService.listRoutePlans(driverId);
  }

  @Get('plans/active/:driverId')
  @ApiOperation({ summary: 'Get the active route plan for a driver' })
  @ApiParam({ name: 'driverId', type: 'string' })
  async getActivePlan(@Param('driverId') driverId: string) {
    return this.routingService.getActiveRouteForDriver(driverId);
  }

  @Post('plans/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a route plan as completed' })
  @ApiParam({ name: 'id', type: 'string' })
  async completePlan(@Param('id') id: string) {
    return this.routingService.markRouteCompleted(id);
  }
}
