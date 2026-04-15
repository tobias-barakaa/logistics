import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { DriverService } from './driver.service';
import { CreateDriverProfileDto, UpdateDriverLocationDto } from './dto/create-driver-profile.dto';
import { JwtAuthGuard, RolesGuard } from 'src/common/guards';
import { User, UserRole } from 'src/database/entities/user.entity';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('driver')
@UseGuards(JwtAuthGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post('profile')
  @Roles(UserRole.DRIVER)
  @UseGuards(RolesGuard)
  createDriverProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateDriverProfileDto,
  ) {
    return this.driverService.createDriverProfile(user, dto);
  }

  @Get('me')
  @Roles(UserRole.DRIVER)
  @UseGuards(RolesGuard)
  getMyDriverProfile(@CurrentUser() user: User) {
    return this.driverService.getMyDriverProfile(user);
  }

  @Patch('location')
  @Roles(UserRole.DRIVER)
  @UseGuards(RolesGuard)
  updateDriverLocation(
    @CurrentUser() user: User,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    return this.driverService.updateDriverLocation(user, dto);
  }

  @Patch('status')
  @Roles(UserRole.DRIVER)
  @UseGuards(RolesGuard)
  updateDriverStatus(
    @CurrentUser() user: User,
    @Body('status') status: string,
  ) {
    return this.driverService.updateDriverStatus(user, status);
  }
}