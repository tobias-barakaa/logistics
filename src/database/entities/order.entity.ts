import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    BeforeInsert,
  } from 'typeorm';
  import { Customer } from './customer.entity';

  import { TrackingEvent } from './tracking-event.entity';
  import { Driver } from './driver.entity';
  
  export enum OrderStatus {
    PENDING = 'pending',       // created, not yet assigned
    ASSIGNED = 'assigned',     // driver assigned, not yet picked up
    PICKED_UP = 'picked_up',   // driver confirmed pickup
    IN_TRANSIT = 'in_transit', // en-route to delivery
    DELIVERED = 'delivered',   // successfully delivered
    FAILED = 'failed',         // delivery attempted but failed
    CANCELLED = 'cancelled',   // cancelled before pickup
  }
  
  @Entity('orders')
  export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ unique: true })
    orderNumber: string; // human-readable: ORD-ABC123
  
    @ManyToOne(() => Customer, (customer) => customer.orders)
    @JoinColumn()
    customer: Customer;
  
    @ManyToOne(() => Driver, (driver) => driver.orders, { nullable: true })
    @JoinColumn()
    driver: Driver;
  
    // Pickup location
    @Column()
    pickupAddress: string;
  
    @Column({ type: 'decimal', precision: 10, scale: 8 })
    pickupLatitude: number;
  
    @Column({ type: 'decimal', precision: 11, scale: 8 })
    pickupLongitude: number;
  
    // Delivery location
    @Column()
    deliveryAddress: string;
  
    @Column({ type: 'decimal', precision: 10, scale: 8 })
    deliveryLatitude: number;
  
    @Column({ type: 'decimal', precision: 11, scale: 8 })
    deliveryLongitude: number;
  
    // @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    // status: OrderStatus;

    @Column({
      type: 'enum',
      enum: OrderStatus,
      enumName: 'order_status_enum',
      default: OrderStatus.PENDING,
    })
    status: OrderStatus;
  
    @Column({ nullable: true })
    notes: string;
  
    @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
    weightKg: number;
  
    @Column({ type: 'timestamp', nullable: true })
    estimatedDeliveryTime: Date;
  
    @Column({ type: 'timestamp', nullable: true })
    actualDeliveryTime: Date;
  
    @OneToMany(() => TrackingEvent, (event) => event.order)
    trackingEvents: TrackingEvent[];
  
    @BeforeInsert()
    generateOrderNumber() {
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
      this.orderNumber = `ORD-${ts}-${rand}`;
    }
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }