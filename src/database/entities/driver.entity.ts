import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    OneToMany,
  } from 'typeorm';
  import { User } from './user.entity';
  import { Vehicle } from './vehicle.entity';
import { Order } from './order.entity';
import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';
  
  export enum DriverStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    ON_DELIVERY = 'on_delivery',
  }
  
  @Entity('drivers')
  export class Driver {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    // Every driver has exactly one user account (role = driver)
    @OneToOne(() => User, { eager: true })
    @JoinColumn()
    user: User;
  
    @Column({ nullable: true })
    licenseNumber: string;
  
    // A driver may have a vehicle assigned (nullable until assigned)
    @OneToOne(() => Vehicle, (vehicle) => vehicle.driver, { nullable: true, eager: true })
    @JoinColumn()
    vehicle: Vehicle;
  
    @Column({
      type: 'enum',
      enum: DriverStatus,
      default: DriverStatus.OFFLINE,
    })
    status: DriverStatus;
  
    // Live GPS location — updated via WebSocket from the driver app
    @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
    currentLatitude: number;
  
    @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
    currentLongitude: number;
  
    @Column({ type: 'timestamp', nullable: true })
    lastLocationUpdate: Date;
  
    @OneToMany(() => Order, (order) => order.driver)
    orders: Order[];

    @Column({
      type: 'enum',
      enum: DriverApprovalStatus,
      default: DriverApprovalStatus.PENDING,
    })
    approvalStatus: DriverApprovalStatus;

    @Column({ nullable: true, type: 'text' })
    rejectionReason: string | null;

  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }