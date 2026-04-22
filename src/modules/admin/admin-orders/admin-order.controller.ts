import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole } from 'src/database/entities/user.entity';
import { AssignDriverDto, CreateOrderDto } from 'src/modules/orders/dto/orders.dto';
import { AdminOrdersService } from './admin-order.service';
import { AdminListOrdersDto, ListDriversQueryDto, RejectDriverDto } from '../admin.dto';
import { RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';

// This controller handles what any authenticated user can do with orders.
// Admin management (list all, assign, cancel, status) lives in AdminController.
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: AdminOrdersService) {}

  // POST /api/v1/orders
  // Any logged-in user — client, driver, or admin — can submit an order.
  // It lands as PENDING and sits in the admin queue for review.
  // @Post()
  // create(@Body() dto: CreateOrderDto, @CurrentUser() actor: User) {
  //   return this.ordersService.create(dto, actor);
  // }

  // GET /api/v1/orders/my-orders
  // Each user only sees orders they personally submitted.
  @Get('my-orders')
  getMyOrders(@CurrentUser() actor: User) {
    return this.ordersService.findMyOrders(actor);
  }

  // GET /api/v1/orders/track/:trackingNumber
  // Anyone with a tracking number can check their delivery status.
  // Intentionally placed in the public orders controller, not admin.


    
     
  
  
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
        return this.ordersService.findByTracking(trackingNumber);
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
      //   return this.ordersService.assignDriver(id, dto, actor);
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
      //   return this.ordersService.cancelOrder(id, dto, actor);
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
      //   return this.ordersService.addAdminNote(id, dto, actor);
      // }
    
      // ── Drivers ────────────────────────────────────────────────────────────────
    
      // GET /api/v1/admin/drivers
      // GET /api/v1/admin/drivers?approvalStatus=pending
      @Get('drivers')
      listDrivers(@Query() query: ListDriversQueryDto) {
        return this.ordersService.listDrivers(query);
      }
    
      // GET /api/v1/admin/drivers/:id
      @Get('drivers/:id')
      getDriver(@Param('id', ParseUUIDPipe) id: string) {
        return this.ordersService.getDriver(id);
      }
    
      // PATCH /api/v1/admin/drivers/:id/approve
      @Patch('drivers/:id/approve')
      @HttpCode(HttpStatus.OK)
      approveDriver(@Param('id', ParseUUIDPipe) id: string) {
        return this.ordersService.approveDriver(id);
      }
    
      // PATCH /api/v1/admin/drivers/:id/reject
      // Body: { "reason": "License number unverifiable" }
      @Patch('drivers/:id/reject')
      @HttpCode(HttpStatus.OK)
      rejectDriver(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectDriverDto,
      ) {
        return this.ordersService.rejectDriver(id, dto);
      }
}