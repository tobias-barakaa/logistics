import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
  } from '@nestjs/common';
  import { JwtAuthGuard, RolesGuard } from 'src/common/guards';
  import { Roles } from 'src/common/decorators/roles.decorator';
  import { UserRole } from 'src/database/entities/user.entity';
  import { VehicleStatus } from 'src/database/entities/vehicle.entity';
  import {
    CreateVehicleDto,
    FilterVehiclesDto,
    UpdateVehicleDto,
  } from './vehicle.dto';
import { VehiclesService } from './vehicle.service';
  
  @Controller('vehicles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)           // all vehicle routes are admin-only by default
  export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) {}
  
    // ── POST /api/v1/vehicles ──────────────────────────────────────────────────
    // Register a new vehicle in the fleet.
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() dto: CreateVehicleDto) {
      return this.vehiclesService.create(dto);
    }
  
    // ── GET /api/v1/vehicles ───────────────────────────────────────────────────
    // List all vehicles with optional filters:
    //   ?type=motorcycle|pickup|van|truck
    //   ?status=available|in_transit|maintenance|inactive
    //   ?search=KCA
    //   ?page=1&limit=20
    @Get()
    findAll(@Query() filters: FilterVehiclesDto) {
      return this.vehiclesService.findAll(filters);
    }
  
    // ── GET /api/v1/vehicles/plate/:plateNumber ────────────────────────────────
    // Look up a vehicle by its plate number.
    @Get('plate/:plateNumber')
    findByPlate(@Param('plateNumber') plateNumber: string) {
      return this.vehiclesService.findByPlate(plateNumber);
    }
  
    // ── GET /api/v1/vehicles/:id ───────────────────────────────────────────────
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
      return this.vehiclesService.findOne(id);
    }
  
    // ── PATCH /api/v1/vehicles/:id ─────────────────────────────────────────────
    // Update any editable field (partial update).
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    update(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateVehicleDto,
    ) {
      return this.vehiclesService.update(id, dto);
    }
  
    // ── PATCH /api/v1/vehicles/:id/status ─────────────────────────────────────
    // Convenience endpoint — change only the vehicle status.
    // Body: { "status": "maintenance" }
    @Patch(':id/status')
    @HttpCode(HttpStatus.OK)
    updateStatus(
      @Param('id', ParseUUIDPipe) id: string,
      @Body('status') status: VehicleStatus,
    ) {
      return this.vehiclesService.updateStatus(id, status);
    }
  
    // ── DELETE /api/v1/vehicles/:id ────────────────────────────────────────────
    // Hard-delete. Blocked if the vehicle is currently IN_TRANSIT.
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    remove(@Param('id', ParseUUIDPipe) id: string) {
      return this.vehiclesService.remove(id);
    }
  }