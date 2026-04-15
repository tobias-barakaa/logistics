import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
  } from 'typeorm';
  import { Driver } from './driver.entity';
  
  export enum VehicleType {
    MOTORCYCLE = 'motorcycle',
    PICKUP = 'pickup',
    VAN = 'van',
    TRUCK = 'truck',
  }
  
  export enum VehicleStatus {
    AVAILABLE = 'available',
    IN_TRANSIT = 'in_transit',
    MAINTENANCE = 'maintenance',
    INACTIVE = 'inactive',
  }
  
  @Entity('vehicles')
  export class Vehicle {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ unique: true })
    plateNumber: string;
  
    @Column()
    model: string;
  
    @Column({ type: 'enum', enum: VehicleType })
    type: VehicleType;
  
    @Column({
      type: 'enum',
      enum: VehicleStatus,
      default: VehicleStatus.AVAILABLE,
    })
    status: VehicleStatus;
  
    @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
    capacityKg: number;
  
    @Column({ nullable: true })
    year: number;
  
    // Reverse side of the Driver → Vehicle relation
    @OneToOne(() => Driver, (driver) => driver.vehicle)
    driver: Driver;

    
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }