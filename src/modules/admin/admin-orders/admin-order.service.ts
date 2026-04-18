import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from 'src/database/entities/order.entity';
import { OrderImage } from 'src/database/entities/order-image.entity';
import { OrderStatusHistory } from 'src/database/entities/order-status-history.entity';
import { Driver } from 'src/database/entities/driver.entity';
import { User } from 'src/database/entities/user.entity';
import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from 'src/common/enums/order-status.enum';
import { DriverApprovalStatus } from 'src/common/enums/driver-approval.enum';
import { ImageType, UploadedBy } from 'src/common/enums/order-image.enum';
import { OrderItem } from 'src/database/entities/order.item.entity';
import { AssignDriverDto, CancelOrderDto, CreateOrderDto, CreateOrderImageDto, CreateOrderItemDto, FilterOrdersDto, UpdateOrderDto, UpdateOrderStatusDto } from 'src/modules/orders/dto/orders.dto';

const ORDER_RELATIONS = [
  'submittedBy',
  'driver',
  'driver.user',
  'items',
  'images',
  'statusHistory',
];

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepository: Repository<OrderItem>,
    @InjectRepository(OrderImage)
    private readonly imageRepository: Repository<OrderImage>,
    @InjectRepository(OrderStatusHistory)
    private readonly historyRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────
  // Any authenticated user can submit an order.
  // The order lands as PENDING and waits for admin review.

  async create(dto: CreateOrderDto, actor: User): Promise<Order> {
    if (dto.requiresPickup) {
      if (!dto.pickupName || !dto.pickupAddress || !dto.pickupLat || !dto.pickupLng) {
        throw new BadRequestException(
          'pickupName, pickupAddress, pickupLat, and pickupLng are required when requiresPickup is true',
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        submittedBy: actor,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        deliveryAddress: dto.deliveryAddress,
        deliveryLandmark: dto.deliveryLandmark,
        deliveryLat: dto.deliveryLat,
        deliveryLng: dto.deliveryLng,
        requiresPickup: dto.requiresPickup ?? false,
        pickupName: dto.pickupName,
        pickupAddress: dto.pickupAddress,
        pickupLandmark: dto.pickupLandmark,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        timeWindowStart: dto.timeWindowStart,
        timeWindowEnd: dto.timeWindowEnd,
        priority: dto.priority,
        deliveryInstructions: dto.deliveryInstructions,
        isFragile: dto.isFragile ?? false,
        requiresSignature: dto.requiresSignature ?? true,
        requiresPhoto: dto.requiresPhoto ?? true,
        subtotal: dto.subtotal,
        deliveryFee: dto.deliveryFee ?? 0,
        totalAmount: dto.totalAmount,
        paymentMethod: dto.paymentMethod,
        status: OrderStatus.PENDING,
      });

      const saved = await queryRunner.manager.save(Order, order);

      if (dto.items?.length) {
        const items = dto.items.map((item, index) =>
          queryRunner.manager.create(OrderItem, {
            order: saved,
            ...item,
            sortOrder: index,
          }),
        );
        await queryRunner.manager.save(OrderItem, items);
      }

      if (dto.images?.length) {
        const images = dto.images.map((img) =>
          queryRunner.manager.create(OrderImage, {
            order: saved,
            ...img,
            uploadedBy: UploadedBy.CLIENT,
          }),
        );
        await queryRunner.manager.save(OrderImage, images);
      }

      await this.writeHistory(
        queryRunner.manager,
        saved,
        null,
        OrderStatus.PENDING,
        `${actor.role}: ${actor.name}`,
        'Order submitted — awaiting admin review',
      );

      await queryRunner.commitTransaction();
      return this.findOneOrFail(saved.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── My orders (client view) ────────────────────────────────────────────────
  // Returns only the orders submitted by the calling user.

  async findMyOrders(actor: User): Promise<Order[]> {
    return this.orderRepository.find({
      where: { submittedBy: { id: actor.id } },
      relations: ['items', 'images', 'driver', 'driver.user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Admin: list all orders ─────────────────────────────────────────────────

  async findAll(
    filters: FilterOrdersDto,
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.submittedBy', 'submittedBy')
      .leftJoinAndSelect('order.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'driverUser')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.images', 'images')
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) {
      qb.andWhere('order.status = :status', { status: filters.status });
    }
    if (filters.driverId) {
      qb.andWhere('driver.id = :driverId', { driverId: filters.driverId });
    }
    if (filters.priority) {
      qb.andWhere('order.priority = :priority', { priority: filters.priority });
    }
    if (filters.search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :s OR order.trackingNumber ILIKE :s OR order.customerName ILIKE :s OR order.customerPhone ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }
    if (filters.dateFrom) {
      qb.andWhere('order.createdAt >= :from', { from: new Date(filters.dateFrom) });
    }
    if (filters.dateTo) {
      qb.andWhere('order.createdAt <= :to', { to: new Date(filters.dateTo) });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Order> {
    return this.findOneOrFail(id);
  }

  async findByTracking(trackingNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { trackingNumber },
      relations: ORDER_RELATIONS,
    });
    if (!order) throw new NotFoundException(`Tracking number "${trackingNumber}" not found`);
    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ORDER_RELATIONS,
    });
    if (!order) throw new NotFoundException(`Order number "${orderNumber}" not found`);
    return order;
  }

  // ── Admin: update editable fields ─────────────────────────────────────────

  async update(id: string, dto: UpdateOrderDto, actor: User): Promise<Order> {
    const order = await this.findOneOrFail(id);

    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new ForbiddenException(`Cannot edit an order with status "${order.status}"`);
    }

    await this.orderRepository.update(id, { ...dto });
    return this.findOneOrFail(id);
  }

  // ── Admin: assign driver ───────────────────────────────────────────────────
  // Moves order PENDING → ASSIGNED

  async assignDriver(orderId: string, dto: AssignDriverDto, actor: User): Promise<Order> {
    const order = await this.findOneOrFail(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING orders can be assigned. Current status: ${order.status}`,
      );
    }

    const driver = await this.driverRepository.findOne({
      where: { id: dto.driverId },
      relations: ['user'],
    });
    if (!driver) throw new NotFoundException('Driver not found');

    if (driver.approvalStatus !== DriverApprovalStatus.APPROVED) {
      throw new BadRequestException('Cannot assign an unapproved driver');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(Order, orderId, {
        driver,
        status: OrderStatus.ASSIGNED,
        assignedAt: new Date(),
        routeStopOrder: dto.routeStopOrder,
        estimatedDeliveryTime: dto.estimatedDeliveryTime
          ? new Date(dto.estimatedDeliveryTime)
          : undefined,
        adminNotes: dto.adminNotes
          ? `${order.adminNotes ?? ''}\n[Assign] ${dto.adminNotes}`.trim()
          : order.adminNotes,
      });

      await this.writeHistory(
        queryRunner.manager,
        order,
        OrderStatus.PENDING,
        OrderStatus.ASSIGNED,
        `admin: ${actor.name}`,
        `Assigned to driver: ${driver.user.name}`,
      );

      await queryRunner.commitTransaction();
      return this.findOneOrFail(orderId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Admin: cancel order ───────────────────────────────────────────────────

  async cancel(orderId: string, dto: CancelOrderDto, actor: User): Promise<Order> {
    const order = await this.findOneOrFail(orderId);

    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`Order is already ${order.status}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(Order, orderId, {
        status: OrderStatus.CANCELLED,
        cancellationReason: dto.reason,
      });

      await this.writeHistory(
        queryRunner.manager,
        order,
        order.status,
        OrderStatus.CANCELLED,
        `admin: ${actor.name}`,
        dto.reason,
      );

      await queryRunner.commitTransaction();
      return this.findOneOrFail(orderId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Status transition (driver-facing) ─────────────────────────────────────

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actor: User,
  ): Promise<Order> {
    const order = await this.findOneOrFail(orderId);
    const allowed = ORDER_STATUS_TRANSITIONS[order.status];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition "${order.status}" → "${dto.status}". Allowed: [${allowed.join(', ')}]`,
      );
    }

    if (dto.status === OrderStatus.DELIVERED) {
      if (order.requiresSignature && !dto.signatureImageUrl) {
        throw new BadRequestException('Signature image is required');
      }
      if (order.requiresPhoto && !dto.deliveryPhotoUrl) {
        throw new BadRequestException('Delivery photo is required');
      }
    }

    if (dto.status === OrderStatus.FAILED && !dto.failureReason) {
      throw new BadRequestException('Failure reason is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const patch: Partial<Order> = { status: dto.status };
      if (dto.status === OrderStatus.PICKED_UP) patch.pickedUpAt = new Date();
      if (dto.status === OrderStatus.DELIVERED) patch.deliveredAt = new Date();
      if (dto.status === OrderStatus.FAILED) patch.cancellationReason = dto.failureReason;

      await queryRunner.manager.update(Order, orderId, patch);

      if (dto.signatureImageUrl) {
        await queryRunner.manager.save(OrderImage, {
          order,
          imageUrl: dto.signatureImageUrl,
          imageType: ImageType.SIGNATURE,
          uploadedBy: UploadedBy.DRIVER,
        });
      }
      if (dto.deliveryPhotoUrl) {
        await queryRunner.manager.save(OrderImage, {
          order,
          imageUrl: dto.deliveryPhotoUrl,
          imageType: ImageType.DELIVERY_PROOF,
          uploadedBy: UploadedBy.DRIVER,
        });
      }

      await this.writeHistory(
        queryRunner.manager,
        order,
        order.status,
        dto.status,
        `${actor.role}: ${actor.name}`,
        dto.notes ?? dto.failureReason,
      );

      await queryRunner.commitTransaction();
      return this.findOneOrFail(orderId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  async addItem(orderId: string, dto: CreateOrderItemDto): Promise<OrderItem> {
    const order = await this.findOneOrFail(orderId);

    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new ForbiddenException('Cannot add items to a completed or cancelled order');
    }

    const last = await this.itemRepository.findOne({
      where: { order: { id: orderId } },
      order: { sortOrder: 'DESC' },
    });

    return this.itemRepository.save(
      this.itemRepository.create({
        order,
        ...dto,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      }),
    );
  }

  async removeItem(itemId: string): Promise<void> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['order'],
    });
    if (!item) throw new NotFoundException('Item not found');
    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(item.order.status)) {
      throw new ForbiddenException('Cannot remove items from a closed order');
    }
    await this.itemRepository.remove(item);
  }

  // ── Images ────────────────────────────────────────────────────────────────

  async addImage(
    orderId: string,
    dto: CreateOrderImageDto,
    uploadedBy: UploadedBy,
  ): Promise<OrderImage> {
    const order = await this.findOneOrFail(orderId);
    return this.imageRepository.save(
      this.imageRepository.create({ order, ...dto, uploadedBy }),
    );
  }

  async removeImage(imageId: string): Promise<void> {
    const image = await this.imageRepository.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image not found');
    await this.imageRepository.remove(image);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getDailyStats(): Promise<Record<string, number>> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt >= :todayStart', { todayStart })
      .groupBy('order.status')
      .getRawMany();

    return Object.fromEntries(rows.map((r) => [r.status, parseInt(r.count, 10)]));
  }

  // ── Private ───────────────────────────────────────────────────────────────

  async findOneOrFail(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ORDER_RELATIONS,
    });
    if (!order) throw new NotFoundException(`Order "${id}" not found`);
    return order;
  }

  private async writeHistory(
    manager: any,
    order: Order,
    oldStatus: OrderStatus | null,
    newStatus: OrderStatus,
    changedBy: string,
    notes?: string,
  ): Promise<void> {
    await manager.save(
      manager.create(OrderStatusHistory, {
        order,
        oldStatus,
        newStatus,
        changedBy,
        notes: notes ?? null,
      }),
    );
  }
}