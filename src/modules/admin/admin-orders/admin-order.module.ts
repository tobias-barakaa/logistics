import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from 'src/database/entities/driver.entity';
// import { OrdersController } from './admin-order.controller';
import { AdminOrdersService } from './admin-order.service';
import { OrdersController } from './admin-order.controller';
import { Order } from 'src/database/entities/order.entity';
import { OrderItem } from 'src/database/entities/order.item.entity';
import { OrderImage } from 'src/database/entities/order-image.entity';
import { OrderStatusHistory } from 'src/database/entities/order-status-history.entity';
import { OrdersModule } from 'src/modules/orders/orders.module';

@Module({
  imports: [
    // Only Driver is needed here — user and vehicle come in via relations
    TypeOrmModule.forFeature([Driver, Order, OrderItem, OrderImage, OrderStatusHistory]),
    OrdersModule
  ],
  controllers: [OrdersController],
  providers: [AdminOrdersService],
})
export class AdminOrderModule {}