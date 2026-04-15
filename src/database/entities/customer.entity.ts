import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
import { Order } from './order.entity';
  
  @Entity('customers')
  export class Customer {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    name: string;
  
    @Column({ unique: true })
    phone: string;
  
    @Column({ nullable: true })
    email: string;
  
    @Column({ nullable: true })
    address: string;
  
    // Geocoded coordinates for map display and routing
    @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
    latitude: number;
  
    @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
    longitude: number;
  
    @Column({ default: true })
    isActive: boolean;
  
    @OneToMany(() => Order, (order) => order.customer)
    orders: Order[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }