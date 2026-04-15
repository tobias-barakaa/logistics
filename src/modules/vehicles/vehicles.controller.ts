import {
    Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
  } from '@nestjs/common';
  import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard, RolesGuard } from 'src/common/guards';
import { UserRole } from 'src/database/entities/user.entity';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateVehicleDto, UpdateVehicleDto, UpdateVehicleStatusDto } from './dto/vehicles.dto';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Controller('vehicles')
  export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) {}
  
    @Post()
    create(@Body() dto: CreateVehicleDto) {
      return this.vehiclesService.create(dto);
    }
  
    @Get()
    findAll() {
      return this.vehiclesService.findAll();
    }
  
    @Get('available')
    findAvailable() {
      return this.vehiclesService.findAvailable();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.vehiclesService.findOne(id);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
      return this.vehiclesService.update(id, dto);
    }
  
    // @Patch(':id/status')
    // updateStatus(@Param('id') id: string, @Body() dto: UpdateVehicleStatusDto) {
    //   return this.vehiclesService.updateStatus(id, dto);
    // }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.vehiclesService.remove(id);
    }
  }