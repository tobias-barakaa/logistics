import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/database/entities/user.entity';
import { CreateOrderDto } from 'src/modules/orders/dto/orders.dto';
import { AdminOrdersService } from './admin-order.service';

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
}