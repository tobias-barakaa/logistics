import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from 'src/database/entities/vehicle.entity';
import { VehiclesController } from './vehicle.controller';
import { VehiclesService } from './vehicle.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],   // export so other modules (e.g. drivers) can use it
})
export class VehiclesModule {}