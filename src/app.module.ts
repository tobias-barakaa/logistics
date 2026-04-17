import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DriverModule } from './modules/driver/driver.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RoutingModule } from './modules/routing/routing.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DriversModule } from './drivers/drivers.module';
import { AdminDriversModule } from './modules/admin/admin-drivers/admin-drivers.module';
// import { AdminDriversModule } from './admin/admin-drivers/admin-drivers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        // auto-discovers every *.entity.ts file anywhere under src/
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        // synchronize ONLY in development — never in production
        synchronize: config.get<string>('NODE_ENV') === 'development',
        logging: config.get<string>('NODE_ENV') === 'development',
        // Neon requires SSL

        dropSchema: config.get<string>('DROP_SCHEMA') === 'false',

        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    AuthModule,
    CustomersModule,
    DriverModule,
    VehiclesModule,
    OrdersModule,
    RoutingModule,
    TrackingModule,
    NotificationsModule,
    AnalyticsModule,
    DriversModule,
    AdminDriversModule,
  ],
})
export class AppModule {}