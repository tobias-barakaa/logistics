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
  import { AssignDriverDto, FilterOrdersDto } from 'src/modules/orders/dto/orders.dto';
  import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
  import { RolesGuard } from 'src/common/guards/roles.guard';
  import { Roles } from 'src/common/decorators/roles.decorator';
  import { CurrentUser } from 'src/common/decorators/current-user.decorator';
  import { UserRole } from 'src/database/entities/user.entity';
  import { User } from 'src/database/entities/user.entity';
import { AdminService } from './admin.service';
import { AdminAddNoteDto, AdminCancelOrderDto, AdminListOrdersDto, ListDriversQueryDto, RejectDriverDto } from './admin.dto';
import { OrdersService } from '../orders/orders.service';
  
  @Controller('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  export class AdminController {
    constructor(private readonly adminService: AdminService, private readonly ordersService: OrdersService) {}
  
    // ── Dashboard ──────────────────────────────────────────────────────────────
  
    // GET /api/v1/admin/overview
    // First call the admin dashboard makes — drivers summary + today's order stats
    @Get('overview')
    getOverview() {
      return this.adminService.getDashboardOverview();
    }

    @Get('orders')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll(@Query() filters: FilterOrdersDto) {
      return this.adminService.findAll(filters);
    }
  }