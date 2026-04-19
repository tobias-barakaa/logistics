import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { AssignDriverDto } from 'src/modules/orders/dto/orders.dto';
  import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
  import { RolesGuard } from 'src/common/guards/roles.guard';
  import { Roles } from 'src/common/decorators/roles.decorator';
  import { CurrentUser } from 'src/common/decorators/current-user.decorator';
  import { UserRole } from 'src/database/entities/user.entity';
  import { User } from 'src/database/entities/user.entity';
import { AdminService } from './admin.service';
import { AdminAddNoteDto, AdminCancelOrderDto, AdminListOrdersDto, ListDriversQueryDto, RejectDriverDto } from './admin.dto';
  
  @Controller('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  export class AdminController {
    constructor(private readonly adminService: AdminService) {}
  
    // ── Dashboard ──────────────────────────────────────────────────────────────
  
    // GET /api/v1/admin/overview
    // First call the admin dashboard makes — drivers summary + today's order stats
    @Get('overview')
    getOverview() {
      return this.adminService.getDashboardOverview();
    }
  
    // ── Orders ─────────────────────────────────────────────────────────────────
  
    // GET /api/v1/admin/orders
    // GET /api/v1/admin/orders?status=PENDING
    // GET /api/v1/admin/orders?status=ASSIGNED&driverId=xxx
    // GET /api/v1/admin/orders?search=John&dateFrom=2026-04-01&page=1&limit=20
    @Get('orders')
    listOrders(@Query() query: AdminListOrdersDto) {
      return this.adminService.listOrders(query);
    }
  
    // GET /api/v1/admin/orders/pending
    // Shortcut — this is what the admin sees the moment they open the orders page
    @Get('orders/pending')
    listPendingOrders() {
      return this.adminService.listPendingOrders();
    }


    // PATCH /api/v1/orders/:id/assign
        // Assign a driver and move status PENDING → ASSIGNED
        @Patch(':id/assign')
        @UseGuards(RolesGuard)
        @Roles(UserRole.ADMIN)
        @HttpCode(HttpStatus.OK)
        assignDriver(
          @Param('id', ParseUUIDPipe) id: string,
          @Body() dto: AssignDriverDto,
          @CurrentUser() actor: User,
        ) {
          return this.ordersService.assignDriver(id, dto, actor);
        }
  
    // GET /api/v1/admin/orders/track/:trackingNumber
    @Get('orders/track/:trackingNumber')
    findByTracking(@Param('trackingNumber') trackingNumber: string) {
      return this.adminService.findByTracking(trackingNumber);
    }
  
    // GET /api/v1/admin/orders/:id
    // Full order detail — includes items, images, statusHistory, submittedBy user
    @Get('orders/:id')
    getOrder(@Param('id', ParseUUIDPipe) id: string) {
      return this.adminService.getOrder(id);
    }
  
    // PATCH /api/v1/admin/orders/:id/assign
    // Body: { "driverId": "uuid", "estimatedDeliveryTime": "2026-04-18T14:00:00Z" }
    // Moves order PENDING → ASSIGNED
    // @Patch('orders/:id/assign')
    // @HttpCode(HttpStatus.OK)
    // assignDriver(
    //   @Param('id', ParseUUIDPipe) id: string,
    //   @Body() dto: AssignDriverDto,
    //   @CurrentUser() actor: User,
    // ) {
    //   return this.adminService.assignDriver(id, dto, actor);
    // }
  
    // // PATCH /api/v1/admin/orders/:id/cancel
    // // Body: { "reason": "Customer requested cancellation" }
    // @Patch('orders/:id/cancel')
    // @HttpCode(HttpStatus.OK)
    // cancelOrder(
    //   @Param('id', ParseUUIDPipe) id: string,
    //   @Body() dto: AdminCancelOrderDto,
    //   @CurrentUser() actor: User,
    // ) {
    //   return this.adminService.cancelOrder(id, dto, actor);
    // }
  
    // // POST /api/v1/admin/orders/:id/notes
    // // Body: { "note": "Customer called to confirm address" }
    // // Appends a timestamped note — doesn't overwrite previous notes
    // @Post('orders/:id/notes')
    // addNote(
    //   @Param('id', ParseUUIDPipe) id: string,
    //   @Body() dto: AdminAddNoteDto,
    //   @CurrentUser() actor: User,
    // ) {
    //   return this.adminService.addAdminNote(id, dto, actor);
    // }
  
    // ── Drivers ────────────────────────────────────────────────────────────────
  
    // GET /api/v1/admin/drivers
    // GET /api/v1/admin/drivers?approvalStatus=pending
    @Get('drivers')
    listDrivers(@Query() query: ListDriversQueryDto) {
      return this.adminService.listDrivers(query);
    }
  
    // GET /api/v1/admin/drivers/:id
    @Get('drivers/:id')
    getDriver(@Param('id', ParseUUIDPipe) id: string) {
      return this.adminService.getDriver(id);
    }
  
    // PATCH /api/v1/admin/drivers/:id/approve
    @Patch('drivers/:id/approve')
    @HttpCode(HttpStatus.OK)
    approveDriver(@Param('id', ParseUUIDPipe) id: string) {
      return this.adminService.approveDriver(id);
    }
  
    // PATCH /api/v1/admin/drivers/:id/reject
    // Body: { "reason": "License number unverifiable" }
    @Patch('drivers/:id/reject')
    @HttpCode(HttpStatus.OK)
    rejectDriver(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: RejectDriverDto,
    ) {
      return this.adminService.rejectDriver(id, dto);
    }
  }