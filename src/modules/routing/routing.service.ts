import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from 'src/database/entities/order.entity';
import { Driver } from 'src/database/entities/driver.entity';
import { RoutePlan, RouteStrategy } from 'src/database/entities/route-plan.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { DriverStatus } from 'src/database/entities/driver.entity';
import { GoogleMapsService } from './services/google-maps.service';
import { DeepSeekService, RouteContext } from './services/deepseek.service';
import { RouteOptimizerService, StopNode } from './services/route-optimizer.service';
import {
  OptimizeRouteDto,
  OptimizeMultipleDriversDto,
  AnalyzeRouteDto,
  OptimizedRouteResponse,
  RouteStopDto,
  RouteLegDto,
  LatLngDto,
  EtaResponse,
  GeocodeResultDto,
  DistanceMatrixElement,
} from './dto/routing.dto';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(RoutePlan)
    private readonly routePlanRepo: Repository<RoutePlan>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly maps: GoogleMapsService,
    private readonly ai: DeepSeekService,
    private readonly optimizer: RouteOptimizerService,
  ) {}

  // ── Geocoding ─────────────────────────────────────────────────────────────────

  async geocodeAddress(address: string): Promise<GeocodeResultDto | null> {
    const result = await this.maps.geocode(address);
    if (!result) return null;
    return {
      formattedAddress: result.formattedAddress,
      lat: result.lat,
      lng: result.lng,
      placeId: result.placeId,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    return this.maps.reverseGeocode(lat, lng);
  }

  // ── Distance Matrix ───────────────────────────────────────────────────────────

  async getDistanceMatrix(
    origins: LatLngDto[],
    destinations: LatLngDto[],
  ): Promise<DistanceMatrixElement[]> {
    const results = await this.maps.distanceMatrix(origins, destinations);
    return results.map((r) => ({
      origin: origins[r.originIndex],
      destination: destinations[r.destinationIndex],
      distanceMeters: r.distanceMeters,
      durationSeconds: r.durationSeconds,
      distanceText: r.distanceText,
      durationText: r.durationText,
    }));
  }

  // ── Single Driver Route Optimization ──────────────────────────────────────────

  async optimizeRoute(dto: OptimizeRouteDto): Promise<OptimizedRouteResponse> {
    const driver = await this.driverRepo.findOne({
      where: { id: dto.driverId },
      relations: ['user', 'vehicle'],
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const orders = await this.fetchOrdersForOptimization(dto.orderIds);
    if (!orders.length) throw new BadRequestException('No valid orders provided');

    const depot: LatLngDto = dto.depotLocation ?? {
      lat: parseFloat(this.config.get<string>('DEFAULT_DEPOT_LAT') ?? '-6.7924'),
      lng: parseFloat(this.config.get<string>('DEFAULT_DEPOT_LNG') ?? '39.2083'),
    };

    // Build stop nodes (depot + orders)
    const nodes: StopNode[] = [
      { id: 'depot', lat: depot.lat, lng: depot.lng },
      ...orders.map((o) => ({
        id: o.id,
        lat: Number(o.deliveryLat),
        lng: Number(o.deliveryLng),
        priority: this.priorityToNumber(o.priority),
        timeWindowStart: o.timeWindowStart
          ? this.timeToMinutes(o.timeWindowStart)
          : undefined,
        timeWindowEnd: o.timeWindowEnd
          ? this.timeToMinutes(o.timeWindowEnd)
          : undefined,
      })),
    ];

    // Build full distance matrix via Google Maps
    const latLngs = nodes.map((n) => ({ lat: n.lat, lng: n.lng }));
    const dm = await this.maps.distanceMatrix(latLngs, latLngs);
    const n = nodes.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    for (const r of dm) {
      matrix[r.originIndex][r.destinationIndex] = r.durationSeconds;
    }
    for (let i = 0; i < n; i++) matrix[i][i] = 0;

    // Optimize using our algorithms
    const strategy = dto.strategy ?? RouteStrategy.BALANCED;
    const optimized = this.optimizer.optimizeRoute(nodes, matrix, strategy as any);

    // Remove depot from sequence
    const depotIndex = optimized.orderedIds.indexOf('depot');
    const orderedIds = optimized.orderedIds.filter((id) => id !== 'depot');
    const orderedOrders = orderedIds.map((id) => orders.find((o) => o.id === id)!);

    // Get directions polyline from Google
    const waypointLatLngs = [depot, ...orderedOrders.map((o) => ({ lat: Number(o.deliveryLat), lng: Number(o.deliveryLng) }))];
    const directions = await this.maps.getDirections(waypointLatLngs, false);

    // Build stops with ETAs
    const now = new Date();
    let cumulativeMin = 0;
    const stops: RouteStopDto[] = orderedOrders.map((o, idx) => {
      const fromNodeIdx = idx === 0 ? 0 : nodes.findIndex((n) => n.id === orderedIds[idx - 1])!;
      const toNodeIdx = nodes.findIndex((n) => n.id === o.id)!;
      const legDurMin = matrix[fromNodeIdx][toNodeIdx] / 60;
      const legDistM =
        dm.find((d) => d.originIndex === fromNodeIdx && d.destinationIndex === toNodeIdx)
          ?.distanceMeters ?? 0;
      cumulativeMin += legDurMin;

      const eta = new Date(now.getTime() + cumulativeMin * 60000);
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        address: o.deliveryAddress,
        lat: Number(o.deliveryLat),
        lng: Number(o.deliveryLng),
        stopOrder: idx + 1,
        estimatedArrival: eta.toISOString(),
        distanceFromPreviousKm: Math.round((legDistM / 1000) * 100) / 100,
        durationFromPreviousMin: Math.round(legDurMin * 100) / 100,
        timeWindowStart: o.timeWindowStart ?? undefined,
        timeWindowEnd: o.timeWindowEnd ?? undefined,
        priority: o.priority,
      };
    });

    const legs: RouteLegDto[] = [];
    for (let i = 0; i < orderedOrders.length; i++) {
      const fromId = i === 0 ? 'depot' : orderedOrders[i - 1].id;
      const toId = orderedOrders[i].id;
      const fromIdx = nodes.findIndex((n) => n.id === fromId);
      const toIdx = nodes.findIndex((n) => n.id === toId);
      const dmEl = dm.find((d) => d.originIndex === fromIdx && d.destinationIndex === toIdx);
      legs.push({
        fromOrderId: fromId,
        toOrderId: toId,
        distanceMeters: dmEl?.distanceMeters ?? 0,
        durationSeconds: dmEl?.durationSeconds ?? 0,
        distanceText: dmEl?.distanceText ?? '',
        durationText: dmEl?.durationText ?? '',
        polyline: directions?.legs?.[i]?.polyline,
      });
    }

    const totalDistanceKm = Math.round((optimized.metrics.totalDistanceMeters / 1000) * 100) / 100;
    const totalDurationMin = Math.round(optimized.metrics.totalDurationSeconds / 60);
    const completionTime = new Date(now.getTime() + totalDurationMin * 60000);

    // AI Analysis
    const aiContext: RouteContext = {
      driverName: driver.user?.name ?? 'Unknown',
      vehicleType: driver.vehicle?.type ?? 'unknown',
      totalStops: orderedOrders.length,
      totalDistanceKm,
      totalDurationMin,
      stops: orderedOrders.map((o) => ({
        orderId: o.id,
        customerName: o.customerName,
        address: o.deliveryAddress,
        timeWindowStart: o.timeWindowStart,
        timeWindowEnd: o.timeWindowEnd,
        priority: o.priority,
        isFragile: o.isFragile,
        requiresSignature: o.requiresSignature,
      })),
    };

    let aiAnalysis: string | undefined;
    let aiRecommendations: string | undefined;
    const aiResult = await this.ai.analyzeRoute(aiContext);
    if (aiResult) {
      aiAnalysis = aiResult.summary;
      aiRecommendations = [
        ...aiResult.riskFactors.map((r) => `Risk: ${r}`),
        ...aiResult.recommendations.map((r) => `Tip: ${r}`),
        aiResult.alternativeSuggestion ? `Alt: ${aiResult.alternativeSuggestion}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    // Persist route plan
    const saved = (await this.routePlanRepo.save({
      driver,
      driverId: driver.id,
      strategy: strategy as RouteStrategy,
      totalDistanceKm: totalDistanceKm,
      totalDurationMin: totalDurationMin,
      stops: stops.map((s) => ({
        orderId: s.orderId,
        orderNumber: s.orderNumber,
        customerName: s.customerName,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        stopOrder: s.stopOrder,
        estimatedArrival: s.estimatedArrival,
        distanceFromPrevious: s.distanceFromPreviousKm,
        durationFromPrevious: s.durationFromPreviousMin,
      })),
      googlePolyline: directions?.polyline ?? null,
      aiAnalysis: aiAnalysis ?? null,
      aiRecommendations: aiRecommendations ?? null,
      isActive: true,
    } as any)) as RoutePlan;

    // Mark orders as assigned and link driver
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (let i = 0; i < orderedOrders.length; i++) {
        await queryRunner.manager.update(Order, orderedOrders[i].id, {
          driver,
          status: OrderStatus.ASSIGNED,
          assignedAt: new Date(),
          routeStopOrder: i + 1,
          estimatedDeliveryTime: new Date(stops[i].estimatedArrival),
        });
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return {
      routePlanId: saved.id,
      driverId: driver.id,
      driverName: driver.user?.name ?? 'Unknown',
      strategy: strategy as RouteStrategy,
      totalDistanceKm,
      totalDurationMin,
      estimatedCompletionTime: completionTime.toISOString(),
      stops,
      legs,
      googlePolyline: directions?.polyline,
      aiAnalysis,
      aiRecommendations,
    };
  }

  // ── Multi-Driver Batch Optimization ───────────────────────────────────────────

  async optimizeMultipleDrivers(
    dto: OptimizeMultipleDriversDto,
  ): Promise<OptimizedRouteResponse[]> {
    const drivers = await this.driverRepo.find({
      where: dto.driverIds.map((id) => ({ id })),
      relations: ['user', 'vehicle'],
    });
    if (drivers.length !== dto.driverIds.length) {
      throw new BadRequestException('One or more driver IDs are invalid');
    }

    const orders = await this.fetchOrdersForOptimization(dto.orderIds);
    if (!orders.length) throw new BadRequestException('No valid orders provided');

    const depot: LatLngDto = dto.depotLocation ?? {
      lat: parseFloat(this.config.get<string>('DEFAULT_DEPOT_LAT') ?? '-6.7924'),
      lng: parseFloat(this.config.get<string>('DEFAULT_DEPOT_LNG') ?? '39.2083'),
    };

    const driverNodes = drivers.map((d) => ({
      id: d.id,
      lat: Number(d.currentLatitude ?? depot.lat),
      lng: Number(d.currentLongitude ?? depot.lng),
    }));

    const orderNodes: StopNode[] = orders.map((o) => ({
      id: o.id,
      lat: Number(o.deliveryLat),
      lng: Number(o.deliveryLng),
      priority: this.priorityToNumber(o.priority),
    }));

    const assignments = this.optimizer.assignOrdersToDrivers(
      driverNodes,
      orderNodes,
      [],
      (dto.strategy ?? RouteStrategy.BALANCED) as any,
    );

    const responses: OptimizedRouteResponse[] = [];
    for (const driver of drivers) {
      const assignedOrderIds = assignments.get(driver.id)?.orderedIds ?? [];
      if (!assignedOrderIds.length) continue;

      const driverDto: OptimizeRouteDto = {
        driverId: driver.id,
        orderIds: assignedOrderIds,
        strategy: dto.strategy ?? RouteStrategy.BALANCED,
        depotLocation: depot,
      };

      try {
        const resp = await this.optimizeRoute(driverDto);
        responses.push(resp);
      } catch (err) {
        this.logger.error(`Failed to optimize route for driver ${driver.id}: ${err.message}`);
      }
    }

    return responses;
  }

  // ── AI Route Analysis (no persistence) ────────────────────────────────────────

  async analyzeRoute(dto: AnalyzeRouteDto): Promise<{ analysis: string; recommendations: string }> {
    const driver = await this.driverRepo.findOne({
      where: { id: dto.driverId },
      relations: ['user', 'vehicle'],
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const orders = await this.fetchOrdersForOptimization(dto.orderIds);
    if (!orders.length) throw new BadRequestException('No valid orders provided');

    const totalDistanceKm = this.estimateTotalDistance(
      driver.currentLatitude ?? 0,
      driver.currentLongitude ?? 0,
      orders,
    );
    const totalDurationMin = Math.round((totalDistanceKm / 30) * 60); // rough urban estimate

    const context: RouteContext = {
      driverName: driver.user?.name ?? 'Unknown',
      vehicleType: driver.vehicle?.type ?? 'unknown',
      totalStops: orders.length,
      totalDistanceKm,
      totalDurationMin,
      stops: orders.map((o) => ({
        orderId: o.id,
        customerName: o.customerName,
        address: o.deliveryAddress,
        timeWindowStart: o.timeWindowStart,
        timeWindowEnd: o.timeWindowEnd,
        priority: o.priority,
        isFragile: o.isFragile,
        requiresSignature: o.requiresSignature,
      })),
    };

    const aiResult = await this.ai.analyzeRoute(context);
    if (!aiResult) {
      return {
        analysis: 'AI analysis unavailable (DeepSeek API not configured or failed).',
        recommendations: 'Ensure DEEPSEEK_API_KEY is set in environment.',
      };
    }

    return {
      analysis: aiResult.summary,
      recommendations: [
        ...aiResult.riskFactors.map((r) => `⚠️ ${r}`),
        ...aiResult.recommendations.map((r) => `💡 ${r}`),
      ].join('\n'),
    };
  }

  // ── ETA for a single order ────────────────────────────────────────────────────

  async getEta(orderId: string, driverLocation?: LatLngDto): Promise<EtaResponse> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['driver'],
    });
    if (!order) throw new NotFoundException('Order not found');

    const loc =
      driverLocation ??
      (order.driver
        ? {
            lat: Number(order.driver.currentLatitude ?? 0),
            lng: Number(order.driver.currentLongitude ?? 0),
          }
        : null);

    if (!loc) throw new BadRequestException('Driver location not available');

    const dm = await this.maps.distanceMatrix([loc], [
      { lat: Number(order.deliveryLat), lng: Number(order.deliveryLng) },
    ]);

    const el = dm[0];
    const eta = new Date(Date.now() + (el?.durationSeconds ?? 0) * 1000);

    return {
      orderId,
      estimatedArrival: eta.toISOString(),
      distanceRemainingKm: Math.round(((el?.distanceMeters ?? 0) / 1000) * 100) / 100,
      durationRemainingMin: Math.round(((el?.durationSeconds ?? 0) / 60) * 100) / 100,
      currentLocation: loc,
      nextStop: null,
    };
  }

  // ── Active Route Plans ────────────────────────────────────────────────────────

  async getActiveRouteForDriver(driverId: string): Promise<RoutePlan | null> {
    return this.routePlanRepo.findOne({
      where: { driverId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async markRouteCompleted(routePlanId: string): Promise<RoutePlan> {
    const plan = await this.routePlanRepo.findOne({ where: { id: routePlanId } });
    if (!plan) throw new NotFoundException('Route plan not found');
    plan.isActive = false;
    plan.completedAt = new Date();
    return this.routePlanRepo.save(plan);
  }

  async listRoutePlans(driverId?: string): Promise<RoutePlan[]> {
    const qb = this.routePlanRepo.createQueryBuilder('rp').leftJoinAndSelect('rp.driver', 'driver');
    if (driverId) {
      qb.where('rp.driverId = :driverId', { driverId });
    }
    qb.orderBy('rp.createdAt', 'DESC');
    return qb.getMany();
  }

  // ── Private Helpers ───────────────────────────────────────────────────────────

  private async fetchOrdersForOptimization(orderIds: string[]): Promise<Order[]> {
    const orders = await this.orderRepo.find({
      where: orderIds.map((id) => ({ id })),
    });

    const valid = orders.filter(
      (o) =>
        o.deliveryLat != null &&
        o.deliveryLng != null &&
        ![OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(o.status),
    );

    return valid;
  }

  private priorityToNumber(priority?: string): number {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 10;
      case 'high':
        return 7;
      case 'normal':
        return 5;
      case 'low':
        return 2;
      default:
        return 5;
    }
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  private estimateTotalDistance(
    driverLat: number,
    driverLng: number,
    orders: Order[],
  ): number {
    let dist = 0;
    let lat = driverLat;
    let lng = driverLng;
    for (const o of orders) {
      const dLat = (Number(o.deliveryLat) - lat) * 111;
      const dLng = (Number(o.deliveryLng) - lng) * 111 * Math.cos((lat * Math.PI) / 180);
      dist += Math.sqrt(dLat * dLat + dLng * dLng);
      lat = Number(o.deliveryLat);
      lng = Number(o.deliveryLng);
    }
    return Math.round(dist * 100) / 100;
  }
}
