import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from 'src/database/entities/driver.entity';
// import { OrdersController } from './admin-order.controller';
import { AdminOrdersService } from './admin-order.service';
import { OrdersController } from './admin-order.controller';

@Module({
  imports: [
    // Only Driver is needed here — user and vehicle come in via relations
    TypeOrmModule.forFeature([Driver]),
  ],
  controllers: [OrdersController],
  providers: [AdminOrdersService],
})
export class AdminOrderModule {}