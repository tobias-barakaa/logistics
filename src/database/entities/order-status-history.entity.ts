import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
  } from 'typeorm';
  import { Order } from './order.entity';
  import { OrderStatus } from 'src/common/enums/order-status.enum';
  
  @Entity('order_status_history')
  export class OrderStatusHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ManyToOne(() => Order, (order) => order.statusHistory, { onDelete: 'CASCADE' })
    @JoinColumn()
    order: Order;
  
    @Column({ type: 'enum', enum: OrderStatus, nullable: true })
    oldStatus: OrderStatus | null;
  
    @Column({ type: 'enum', enum: OrderStatus })
    newStatus: OrderStatus;
  
    // Who made the change — "Admin: barakaH" or "Driver: John Mwangi"
    @Column()
    changedBy: string;
  
    @Column({ nullable: true, type: 'text' })
    notes: string;
  
    @CreateDateColumn()
    changedAt: Date;
  }