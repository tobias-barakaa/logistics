import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Order } from './order.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';
  
  @Entity('tracking_events')
  export class TrackingEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    // @ManyToOne(() => Order, (order) => order.trackingEvents, { onDelete: 'CASCADE' })
    // @JoinColumn()
    // order: Order;
  
    // GPS coordinates at time of event
    @Column({ type: 'decimal', precision: 10, scale: 8 })
    latitude: number;
  
    @Column({ type: 'decimal', precision: 11, scale: 8 })
    longitude: number;
  
   
    @Column({
      type: 'enum',
      enum: OrderStatus,
      enumName: 'order_status_enum', 
      nullable: true,
    })
    statusSnapshot: OrderStatus;
  
    // Human-readable note e.g. "Driver picked up package"
    @Column({ nullable: true })
    description: string;
  
    @CreateDateColumn()
    timestamp: Date;
  }