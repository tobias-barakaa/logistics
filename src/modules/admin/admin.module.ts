import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Driver } from 'src/database/entities/driver.entity';
import { OrdersModule } from 'src/modules/orders/orders.module';
import { OrdersController } from '../orders/orders.controller';
import { AdminJDriverController } from './admin-drivers/admin-drivers.controller';
import { Vehicle } from 'src/database/entities/vehicle.entity';
import { AdminDriversModule } from './admin-drivers/admin-drivers.module';
import { AdminOrderModule } from './admin-orders/admin-order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver]),
    // OrdersModule exports OrdersService so AdminService can inject it
    AdminOrderModule,
    OrdersModule,
    AdminDriversModule,
    


  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}