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
import { Driver } from './driver.entity';
import { User } from './user.entity';
import { OrderImage } from './order-image.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { PaymentStatus, PaymentMethod } from 'src/common/enums/payment.enum';
import { OrderPriority } from 'src/common/enums/order-image.enum';
import { OrderItem } from './order.item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column({ unique: true })
  trackingNumber: string;

  // ── Who submitted this order ─────────────────────────────────────────────────
  // Nullable because admin can also create orders on behalf of someone
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn()
  submittedBy: User;

  // ── Customer / Receiver ──────────────────────────────────────────────────────
  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ type: 'text' })
  deliveryAddress: string;

  @Column({ nullable: true, type: 'text' })
  deliveryLandmark: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  deliveryLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  deliveryLng: number;

  // ── Pickup / Sender ──────────────────────────────────────────────────────────
  @Column({ default: false })
  requiresPickup: boolean;

  @Column({ nullable: true })
  pickupName: string;

  @Column({ nullable: true, type: 'text' })
  pickupAddress: string;

  @Column({ nullable: true, type: 'text' })
  pickupLandmark: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  pickupLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  pickupLng: number;

  // ── Delivery constraints ─────────────────────────────────────────────────────
  @Column({ type: 'time', nullable: true })
  timeWindowStart: string;

  @Column({ type: 'time', nullable: true })
  timeWindowEnd: string;

  @Column({ type: 'enum', enum: OrderPriority, default: OrderPriority.NORMAL })
  priority: OrderPriority;

  @Column({ nullable: true, type: 'text' })
  deliveryInstructions: string;

  @Column({ default: false })
  isFragile: boolean;

  @Column({ default: true })
  requiresSignature: boolean;

  @Column({ default: true })
  requiresPhoto: boolean;

  // ── Financials ───────────────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.COD })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  // ── Status ───────────────────────────────────────────────────────────────────
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // ── Assignment ───────────────────────────────────────────────────────────────
  @ManyToOne(() => Driver, (driver) => driver.orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  driver: Driver;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'int', nullable: true })
  routeStopOrder: number;

  // ── Timestamps ───────────────────────────────────────────────────────────────
  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  // ── Notes ────────────────────────────────────────────────────────────────────
  @Column({ nullable: true, type: 'text' })
  adminNotes: string;

  @Column({ nullable: true, type: 'text' })
  driverNotes: string;

  @Column({ nullable: true, type: 'text' })
  cancellationReason: string;

  // ── Relations ────────────────────────────────────────────────────────────────
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderImage, (image) => image.order, { cascade: true })
  images: OrderImage[];

  @OneToMany(() => OrderStatusHistory, (h) => h.order, { cascade: true })
  statusHistory: OrderStatusHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateIdentifiers() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = () => Math.random().toString(36).substring(2, 5).toUpperCase();
    this.orderNumber = `ORD-${ts}-${rand()}`;
    this.trackingNumber = `TRK-${rand()}${rand()}`;
  }
}