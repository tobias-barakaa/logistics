import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
    Post,
  } from '@nestjs/common';
  import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
  import { RolesGuard } from 'src/common/guards/roles.guard';
  import { Roles } from 'src/common/decorators/roles.decorator';
  import { User, UserRole } from 'src/database/entities/user.entity';
import { ListDriversQueryDto, RejectDriverDto } from './dto/admin-driver.dto';
import { AdminDriverService } from './admin-drivers.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateDriverProfileDto } from 'src/modules/driver/dto/create-driver-profile.dto';
  
  // Every route in this controller requires:
  // 1. A valid JWT cookie (JwtAuthGuard)
  // 2. The user's role must be 'admin' (RolesGuard + @Roles)
  @Controller('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  export class AdminJDriverController {
    constructor(private readonly adminService: AdminDriverService) {}
  
    // GET /api/v1/admin/drivers
    // GET /api/v1/admin/drivers?approvalStatus=pending
    // GET /api/v1/admin/drivers?approvalStatus=approved
    // GET /api/v1/admin/drivers?approvalStatus=rejected
    // @Get('drivers')
    
    // listDrivers(@CurrentUser() user: User, @Query() query: ListDriversQueryDto) {
    //     console.log(user)
    //   return this.adminService.listDrivers(query);
    // }
    



    @Post('profile')
    @UseGuards(RolesGuard) 
    @Roles(UserRole.DRIVER)
    createDriverProfile(
      @CurrentUser() user: User,
      @Body() dto: CreateDriverProfileDto,
    ) {
      console.log(`not reached here yet....${user}`)
      return this.adminService.createDriverProfile(user, dto);
    }

    @Get('drivers')
    listDrivers(@Query() query: ListDriversQueryDto) {
      return this.adminService.listDrivers(query);
    }


   
  }


  



  //   import {
  //     Controller,
  //     Get,
  //     Patch,
  //     Param,
  //     Body,
  //     Query,
  //     UseGuards,
  //     ParseUUIDPipe,
  //     HttpCode,
  //     HttpStatus,
  //   } from '@nestjs/common';
  //   import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
  //   import { RolesGuard } from 'src/common/guards/roles.guard';
  //   import { Roles } from 'src/common/decorators/roles.decorator';
  //   import { User, UserRole } from 'src/database/entities/user.entity';
  // import { ListDriversQueryDto, RejectDriverDto } from './dto/admin-driver.dto';
  // import { AdminDriverService } from './admin-drivers.service';
  // import { CurrentUser } from 'src/common/decorators/current-user.decorator';
    
  //   // Every route in this controller requires:
  //   // 1. A valid JWT cookie (JwtAuthGuard)
  //   // 2. The user's role must be 'admin' (RolesGuard + @Roles)
  //   @Controller('admin')
  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles(UserRole.ADMIN)
  //   export class AdminJDriverController {
  //     constructor(private readonly adminService: AdminDriverService) {}
    
  //     // // GET /api/v1/admin/drivers
  //     // // GET /api/v1/admin/drivers?approvalStatus=pending
  //     // // GET /api/v1/admin/drivers?approvalStatus=approved
  //     // // GET /api/v1/admin/drivers?approvalStatus=rejected
  //     // @Get('drivers')
      
  //     // listDrivers(@CurrentUser() user: User, @Query() query: ListDriversQueryDto) {
  //     //     console.log(user)
  //     //   return this.adminService.listDrivers(query);
  //     // }
    
  //     // GET /api/v1/admin/drivers/:id
  //     @Get('drivers/:id')
  //     getDriver(@Param('id', ParseUUIDPipe) id: string) {
  //       return this.adminService.getDriver(id);
  //     }
    
  //     // PATCH /api/v1/admin/drivers/:id/approve
  //     // Body: none needed — approving has no extra data
  //     @Patch('drivers/:id/approve')
  //     @HttpCode(HttpStatus.OK)
  //     approveDriver(@Param('id', ParseUUIDPipe) id: string) {
  //       return this.adminService.approveDriver(id);
  //     }
      
    
  //     // PATCH /api/v1/admin/drivers/:id/reject
  //     // Body: { "reason": "License number could not be verified" }
  //     // @Patch('drivers/:id/reject')
  //     // @HttpCode(HttpStatus.OK)
  //     // rejectDriver(
  //     //   @Param('id', ParseUUIDPipe) id: string,
  //     //   @Body() dto: RejectDriverDto,
  //     // ) {
  //     //   return this.adminService.rejectDriver(id, dto);
  //     // }
  
  
  //     @Patch('drivers/:id/reject')
  //     @HttpCode(HttpStatus.OK)
  //     rejectDriver(
  //       @Param('id', ParseUUIDPipe) id: string,
  //       @Body() dto: RejectDriverDto,
  //     ) {
  //       return this.adminService.rejectDriver(id, dto);
  //     }
  
  
  
  //     // ── Drivers ────────────────────────────────────────────────────────────────
    
  //     // GET /api/v1/admin/drivers
  //     // GET /api/v1/admin/drivers?approvalStatus=pending
  //     @Get('drivers')
  //     listDrivers(@Query() query: ListDriversQueryDto) {
  //       return this.adminService.listDrivers(query);
  //     }
    
  //     // GET /api/v1/admin/drivers/:id
  //     // @Get('drivers/:id')
  //     // getDriver(@Param('id', ParseUUIDPipe) id: string) {
  //     //   return this.adminService.getDriver(id);
  //     // }
    
  //     // // PATCH /api/v1/admin/drivers/:id/approve
  //     // @Patch('drivers/:id/approve')
  //     // @HttpCode(HttpStatus.OK)
  //     // approveDriver(@Param('id', ParseUUIDPipe) id: string) {
  //     //   return this.adminService.approveDriver(id);
  //     // }
    
  //     // PATCH /api/v1/admin/drivers/:id/reject
  //     // Body: { "reason": "License number unverifiable" }
  //   }
  
  
  // //    @Post('profile')
  // //     @UseGuards(RolesGuard) 
  // //     @Roles(UserRole.DRIVER)
  // //     createDriverProfile(
  // //       @CurrentUser() user: User,
  // //       @Body() dto: CreateDriverProfileDto,
  // //     ) {
  // //       console.log(`not reached here yet....${user}`)
  // //       return this.driverService.createDriverProfile(user, dto);
  // //     }