import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
  } from 'typeorm';
  import { Order } from './order.entity';
  
  @Entity('order_items')
  export class OrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn()
    order: Order;
  
    @Column()
    itemName: string;
  
    @Column({ type: 'int', default: 1 })
    quantity: number;
  
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    unitPrice: number;
  
    @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
    weightKg: number;
  
    @Column({ nullable: true })
    sku: string;
  
    @Column({ nullable: true, type: 'text' })
    notes: string;
  
    @Column({ type: 'int', default: 0 })
    sortOrder: number;
  
    @CreateDateColumn()
    createdAt: Date;
  }