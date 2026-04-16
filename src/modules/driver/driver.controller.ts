import { Controller, Post, Get, Patch, Body, UseGuards, Param, Query, Put } from '@nestjs/common';
import { DriverService } from './driver.service';
import { 
  CreateDriverProfileDto, 
  UpdateDriverLocationDto, 
  UpdateDriverStatusDto,
  UpdateDriverVehicleDto,
  UpdateDriverProfileDto,
  AdminDriverActionDto
} from './dto/create-driver-profile.dto';
import { JwtAuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User, UserRole } from 'src/database/entities/user.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DriverStatus } from 'src/database/entities/driver.entity';
import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';

@Controller('driver')
@UseGuards(JwtAuthGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post('profile')
  @UseGuards(RolesGuard) 
  @Roles(UserRole.DRIVER)
  createDriverProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateDriverProfileDto,
  ) {
    console.log(`not reached here yet....${user}`)
    return this.driverService.createDriverProfile(user, dto);
  }

  @Get('me')
  @Roles(UserRole.DRIVER)
  @UseGuards(RolesGuard)
  getMyDriverProfile(@CurrentUser() user: User) {
    return this.driverService.getMyDriverProfile(user);
  }

//   @Patch('location')
//   @Roles(UserRole.DRIVER)
//   @UseGuards(RolesGuard)
//   updateDriverLocation(
//     @CurrentUser() user: User,
//     @Body() dto: UpdateDriverLocationDto,  // Now properly typed
//   ) {
//     return this.driverService.updateDriverLocation(user, dto);
//   }

  @Patch('status')
  @Roles(UserRole.DRIVER)
  @UseGuards(RolesGuard)
  updateDriverStatus(
    @CurrentUser() user: User,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driverService.updateDriverStatus(user, dto.status);
  }

  @Put('vehicle')
  @Roles(UserRole.DRIVER)
  @UseGuards(RolesGuard)
  updateDriverVehicle(
    @CurrentUser() user: User,
    @Body() dto: UpdateDriverVehicleDto,
  ) {
    return this.driverService.updateDriverVehicle(user, dto.vehicleId);
  }

//   @Patch('profile')
//   @Roles(UserRole.DRIVER)
//   @UseGuards(RolesGuard)
//   updateDriverProfile(
//     @CurrentUser() user: User,
//     @Body() dto: UpdateDriverProfileDto,
//   ) {
//     return this.driverService.updateDriverProfile(user, dto);
//   }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  getAllDrivers(
    @Query('status') status?: DriverStatus,
    @Query('approvalStatus') approvalStatus?: DriverApprovalStatus,
  ) {
    return this.driverService.getAllDrivers({ status, approvalStatus });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  getDriverById(@Param('id') id: string) {
    return this.driverService.getDriverById(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  approveDriver(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.driverService.approveDriver(user, id);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  rejectDriver(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AdminDriverActionDto,
  ) {
    return this.driverService.rejectDriver(user, id, dto.reason);
  }
}