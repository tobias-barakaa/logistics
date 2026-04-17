import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from 'src/database/entities/order.entity';
import { OrderImage } from 'src/database/entities/order-image.entity';
import { Driver } from 'src/database/entities/driver.entity';
import { OrderItem } from 'src/database/entities/order.item.entity';
import { OrderStatusHistory } from 'src/database/entities/order-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderImage,
      OrderStatusHistory,
      Driver,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // exported so AdminModule can call getDailyStats()
})
export class OrdersModule {}