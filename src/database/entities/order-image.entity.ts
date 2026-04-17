import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
  } from 'typeorm';
  import { Order } from './order.entity';
import { ImageType, UploadedBy } from 'src/common/enums/order-image.enum';
  
  @Entity('order_images')
  export class OrderImage {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ManyToOne(() => Order, (order) => order.images, { onDelete: 'CASCADE' })
    @JoinColumn()
    order: Order;
  
    @Column({ type: 'text' })
    imageUrl: string;
  
    @Column({ type: 'enum', enum: ImageType })
    imageType: ImageType;
  
    @Column({ nullable: true, type: 'text' })
    caption: string;
  
    @Column({ type: 'enum', enum: UploadedBy, default: UploadedBy.ADMIN })
    uploadedBy: UploadedBy;
  
    @CreateDateColumn()
    uploadedAt: Date;
  }