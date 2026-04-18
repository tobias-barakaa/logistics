import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Driver } from 'src/database/entities/driver.entity';
import { OrdersModule } from 'src/modules/orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver]),
    // OrdersModule exports OrdersService so AdminService can inject it
    OrdersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}