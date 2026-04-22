import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { OrdersService } from './orders.service';
  import {
    CreateOrderDto,
    UpdateOrderDto,
    AssignDriverDto,
    CancelOrderDto,
    UpdateOrderStatusDto,
    FilterOrdersDto,
    CreateOrderItemDto,
    CreateOrderImageDto,
  } from './dto/orders.dto';
  import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
  import { RolesGuard } from 'src/common/guards/roles.guard';
  import { Roles } from 'src/common/decorators/roles.decorator';
  import { CurrentUser } from 'src/common/decorators/current-user.decorator';
  import { UserRole } from 'src/database/entities/user.entity';
  import { User } from 'src/database/entities/user.entity';
import { UploadedBy } from 'src/common/enums/order-image.enum';
  
  @Controller('orders')
  @UseGuards(JwtAuthGuard)
  export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}
  
    // ── CREATE ────────────────────────────────────────────────────────────────────
  
    // POST /api/v1/orders
    // Admin only — orders are created by admin, not by customers in this system
    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.DRIVER)
    create(@Body() dto: CreateOrderDto, @CurrentUser() actor: User) {
      return this.ordersService.create(dto, actor);
    }
  
    // ── LIST ──────────────────────────────────────────────────────────────────────
  
    // GET /api/v1/orders
    // GET /api/v1/orders?status=PENDING
    // GET /api/v1/orders?status=IN_TRANSIT&driverId=xxx
    // GET /api/v1/orders?search=ORD-ABC&dateFrom=2026-01-01&dateTo=2026-12-31
    // GET /api/v1/orders?page=2&limit=10
   
  
    // GET /api/v1/orders/stats/today
    @Get('stats/today')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    getDailyStats() {
      return this.ordersService.getDailyStats();
    }
  
    // GET /api/v1/orders/track/:trackingNumber
    // Public-ish — authenticated users can look up any tracking number
    @Get('track/:trackingNumber')
    findByTracking(@Param('trackingNumber') trackingNumber: string) {
      return this.ordersService.findByTracking(trackingNumber);
    }
  
    // GET /api/v1/orders/number/:orderNumber
    @Get('number/:orderNumber')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findByOrderNumber(@Param('orderNumber') orderNumber: string) {
      return this.ordersService.findByOrderNumber(orderNumber);
    }
  
    // GET /api/v1/orders/:id
    @Get(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findOne(@Param('id', ParseUUIDPipe) id: string) {
      return this.ordersService.findOne(id);
    }
  
    // ── UPDATE ────────────────────────────────────────────────────────────────────
  
    // PATCH /api/v1/orders/:id
    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    update(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateOrderDto,
    ) {
      return this.ordersService.update(id, dto);
    }
  
    
  
    // PATCH /api/v1/orders/:id/status
    // Used by both admin and drivers to move the order through the pipeline
    @Patch(':id/status')
    @HttpCode(HttpStatus.OK)
    updateStatus(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateOrderStatusDto,
      @CurrentUser() actor: User,
    ) {
      return this.ordersService.updateStatus(id, dto, actor);
    }
  
    // PATCH /api/v1/orders/:id/cancel
    @Patch(':id/cancel')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    cancel(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: CancelOrderDto,
      @CurrentUser() actor: User,
    ) {
      return this.ordersService.cancel(id, dto, actor);
    }
  
    // ── ITEMS ─────────────────────────────────────────────────────────────────────
  
    // POST /api/v1/orders/:id/items
    @Post(':id/items')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    addItem(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: CreateOrderItemDto,
    ) {
      return this.ordersService.addItem(id, dto);
    }
  
    // DELETE /api/v1/orders/items/:itemId
    @Delete('items/:itemId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    removeItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
      return this.ordersService.removeItem(itemId);
    }
  
    // ── IMAGES ────────────────────────────────────────────────────────────────────
  
    // POST /api/v1/orders/:id/images
    // Admin uploads item photos or pickup proof
    @Post(':id/images')
    addImage(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: CreateOrderImageDto,
      @CurrentUser() actor: User,
    ) {
      const uploadedBy =
        actor.role === UserRole.ADMIN ? UploadedBy.ADMIN : UploadedBy.DRIVER;
      return this.ordersService.addImage(id, dto, uploadedBy);
    }
  
    // DELETE /api/v1/orders/images/:imageId
    @Delete('images/:imageId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    removeImage(@Param('imageId', ParseUUIDPipe) imageId: string) {
      return this.ordersService.removeImage(imageId);
    }
  }