import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from 'src/database/entities/driver.entity';
import { AdminDriverService } from './admin-drivers.service';
import { AdminJDriverController } from './admin-drivers.controller';
import { Vehicle } from 'src/database/entities/vehicle.entity';

@Module({
  imports: [
    // Only Driver is needed here — user and vehicle come in via relations
    TypeOrmModule.forFeature([Driver, Vehicle]),
  ],
  controllers: [AdminJDriverController],
  providers: [AdminDriverService],
})
export class AdminDriversModule {}