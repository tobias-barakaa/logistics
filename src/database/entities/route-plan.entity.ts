import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';

export interface RouteStop {
  orderId: string;
  orderNumber: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  stopOrder: number;
  estimatedArrival: string;
  distanceFromPrevious: number;
  durationFromPrevious: number;
}

export enum RouteStrategy {
  SHORTEST = 'shortest',
  FASTEST = 'fastest',
  BALANCED = 'balanced',
  PRIORITY = 'priority',
}

@Entity('route_plans')
export class RoutePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Driver, (driver) => driver.id, { onDelete: 'CASCADE' })
  @JoinColumn()
  driver: Driver;

  @Column()
  driverId: string;

  @Column({ type: 'enum', enum: RouteStrategy, default: RouteStrategy.BALANCED })
  strategy: RouteStrategy;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalDistanceKm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalDurationMin: number;

  @Column({ type: 'jsonb' })
  stops: RouteStop[];

  @Column({ type: 'text', nullable: true })
  googlePolyline: string;

  @Column({ type: 'text', nullable: true })
  aiAnalysis: string;

  @Column({ type: 'text', nullable: true })
  aiRecommendations: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
