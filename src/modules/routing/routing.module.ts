import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutePlan } from 'src/database/entities/route-plan.entity';
import { Order } from 'src/database/entities/order.entity';
import { Driver } from 'src/database/entities/driver.entity';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { GoogleMapsService, DeepSeekService, RouteOptimizerService } from './services';

@Module({
  imports: [TypeOrmModule.forFeature([RoutePlan, Order, Driver])],
  controllers: [RoutingController],
  providers: [RoutingService, GoogleMapsService, DeepSeekService, RouteOptimizerService],
  exports: [RoutingService, GoogleMapsService, DeepSeekService, RouteOptimizerService],
})
export class RoutingModule {}
