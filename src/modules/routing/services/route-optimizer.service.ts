import { Injectable, Logger } from '@nestjs/common';
import { LatLngDto } from '../dto/routing.dto';

export interface StopNode {
  id: string;
  lat: number;
  lng: number;
  priority?: number;
  timeWindowStart?: number;
  timeWindowEnd?: number;
  weight?: number;
}

export interface OptimizedSequence {
  orderedIds: string[];
  totalCost: number;
  metrics: {
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    averageLegDistanceMeters: number;
    averageLegDurationSeconds: number;
  };
}

@Injectable()
export class RouteOptimizerService {
  private readonly logger = new Logger(RouteOptimizerService.name);

  /**
   * Compute an optimized stop sequence using a hybrid algorithm.
   *
   * 1. Start with Nearest Neighbor for a fast feasible route.
   * 2. Apply 2-opt local search to improve it.
   * 3. If priority strategy, reorder high-priority stops earlier while
   *    keeping the route roughly short.
   */
  optimizeRoute(
    nodes: StopNode[],
    distanceMatrix: number[][],
    strategy: 'shortest' | 'fastest' | 'balanced' | 'priority' = 'balanced',
  ): OptimizedSequence {
    if (nodes.length === 0) {
      return { orderedIds: [], totalCost: 0, metrics: { totalDistanceMeters: 0, totalDurationSeconds: 0, averageLegDistanceMeters: 0, averageLegDurationSeconds: 0 } };
    }
    if (nodes.length === 1) {
      return {
        orderedIds: [nodes[0].id],
        totalCost: 0,
        metrics: { totalDistanceMeters: 0, totalDurationSeconds: 0, averageLegDistanceMeters: 0, averageLegDurationSeconds: 0 },
      };
    }

    // Use duration as default cost; for "shortest" we could weight distance more,
    // but since the matrix is built from Google Maps duration-in-traffic,
    // duration is usually the best proxy for "best" route.
    const costMatrix = distanceMatrix;

    let sequence: number[];

    switch (strategy) {
      case 'shortest':
        sequence = this.nearestNeighbor(nodes, costMatrix, false);
        sequence = this.twoOpt(sequence, costMatrix);
        break;
      case 'fastest':
        sequence = this.nearestNeighbor(nodes, costMatrix, true);
        sequence = this.twoOpt(sequence, costMatrix);
        break;
      case 'priority':
        sequence = this.priorityOptimized(nodes, costMatrix);
        break;
      case 'balanced':
      default:
        sequence = this.nearestNeighbor(nodes, costMatrix, true);
        sequence = this.twoOpt(sequence, costMatrix);
        sequence = this.balanceWithTimeWindows(nodes, sequence, costMatrix);
        break;
    }

    const orderedIds = sequence.map((idx) => nodes[idx].id);
    const { totalCost, metrics } = this.computeMetrics(sequence, costMatrix);

    return { orderedIds, totalCost, metrics };
  }

  /**
   * Assign orders to multiple drivers using a greedy clustering approach
   * followed by per-driver route optimization.
   */
  assignOrdersToDrivers(
    drivers: { id: string; lat: number; lng: number }[],
    orders: StopNode[],
    distanceMatrix: number[][],
    strategy: 'shortest' | 'fastest' | 'balanced' | 'priority' = 'balanced',
  ): Map<string, OptimizedSequence> {
    if (!drivers.length || !orders.length) return new Map();

    // Build a cost matrix that includes depot (driver starts) as index 0..drivers.length-1
    // and orders as indices after that. This is simplified: we cluster by nearest driver
    // then optimize each cluster independently.

    const assignments = new Map<string, StopNode[]>();
    for (const d of drivers) assignments.set(d.id, []);

    // Greedy nearest-driver assignment
    for (const order of orders) {
      let bestDriver = drivers[0].id;
      let bestCost = Infinity;

      for (const d of drivers) {
        const dist = this.haversine(d.lat, d.lng, order.lat, order.lng);
        if (dist < bestCost) {
          bestCost = dist;
          bestDriver = d.id;
        }
      }

      assignments.get(bestDriver)!.push(order);
    }

    const result = new Map<string, OptimizedSequence>();
    for (const d of drivers) {
      const cluster = assignments.get(d.id)!;
      if (!cluster.length) {
        result.set(d.id, {
          orderedIds: [],
          totalCost: 0,
          metrics: { totalDistanceMeters: 0, totalDurationSeconds: 0, averageLegDistanceMeters: 0, averageLegDurationSeconds: 0 },
        });
        continue;
      }

      // For per-driver optimization we use a local matrix among the cluster stops.
      // To include the driver start location, prepend a depot node.
      const depotNode: StopNode = { id: `depot_${d.id}`, lat: d.lat, lng: d.lng };
      const clusterWithDepot = [depotNode, ...cluster];
      const localMatrix = this.buildLocalDistanceMatrix(clusterWithDepot);

      // Optimize from depot (index 0) but don't include depot in final orderedIds
      const seq = this.optimizeRoute(clusterWithDepot, localMatrix, strategy);
      const withoutDepot = seq.orderedIds.filter((id) => id !== depotNode.id);
      result.set(d.id, { ...seq, orderedIds: withoutDepot });
    }

    return result;
  }

  // ── Algorithms ──────────────────────────────────────────────────────────────

  private nearestNeighbor(
    nodes: StopNode[],
    matrix: number[][],
    minimizeDuration = true,
  ): number[] {
    const n = nodes.length;
    const visited = new Array(n).fill(false);
    const route: number[] = [];

    // Start from the node closest to geographic center if no depot,
    // or just index 0 if there is an explicit depot (first node).
    let current = 0;
    visited[current] = true;
    route.push(current);

    while (route.length < n) {
      let next = -1;
      let best = Infinity;

      for (let i = 0; i < n; i++) {
        if (visited[i]) continue;
        const cost = matrix[current][i];
        if (cost < best) {
          best = cost;
          next = i;
        }
      }

      if (next === -1) break;
      visited[next] = true;
      route.push(next);
      current = next;
    }

    return route;
  }

  private twoOpt(route: number[], matrix: number[][]): number[] {
    const n = route.length;
    if (n < 4) return route;

    let improved = true;
    let best = [...route];
    let bestCost = this.routeCost(best, matrix);

    const MAX_ITER = 500;
    let iter = 0;

    while (improved && iter < MAX_ITER) {
      improved = false;
      iter++;

      for (let i = 1; i < n - 2; i++) {
        for (let j = i + 1; j < n; j++) {
          const newRoute = this.twoOptSwap(best, i, j);
          const newCost = this.routeCost(newRoute, matrix);

          if (newCost < bestCost) {
            best = newRoute;
            bestCost = newCost;
            improved = true;
          }
        }
      }
    }

    return best;
  }

  private twoOptSwap(route: number[], i: number, j: number): number[] {
    const prefix = route.slice(0, i);
    const middle = route.slice(i, j + 1).reverse();
    const suffix = route.slice(j + 1);
    return [...prefix, ...middle, ...suffix];
  }

  private priorityOptimized(nodes: StopNode[], matrix: number[][]): number[] {
    // Sort by priority descending, then optimize sub-clusters via NN+2opt
    const withIndex = nodes.map((n, idx) => ({ ...n, idx }));
    withIndex.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Build route greedily: always pick highest-priority unvisited node that
    // doesn't massively inflate cost from current position.
    const n = nodes.length;
    const visited = new Array(n).fill(false);
    const route: number[] = [];

    let current = withIndex[0].idx;
    visited[current] = true;
    route.push(current);

    while (route.length < n) {
      let next = -1;
      let bestScore = Infinity;

      for (let i = 0; i < n; i++) {
        if (visited[i]) continue;
        const travelCost = matrix[current][i];
        const priorityBonus = (nodes[i].priority ?? 0) * 60; // seconds saved per priority point
        const score = travelCost - priorityBonus;
        if (score < bestScore) {
          bestScore = score;
          next = i;
        }
      }

      if (next === -1) break;
      visited[next] = true;
      route.push(next);
      current = next;
    }

    return this.twoOpt(route, matrix);
  }

  private balanceWithTimeWindows(
    nodes: StopNode[],
    sequence: number[],
    matrix: number[][],
  ): number[] {
    // Simple post-processing: if a stop with a tight time window is too late,
    // try moving it earlier without destroying route quality too much.
    // For now, just return the sequence (can be extended with full VRP solver).
    return sequence;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private routeCost(route: number[], matrix: number[][]): number {
    let cost = 0;
    for (let i = 0; i < route.length - 1; i++) {
      cost += matrix[route[i]][route[i + 1]];
    }
    return cost;
  }

  private computeMetrics(
    sequence: number[],
    matrix: number[][],
  ): { totalCost: number; metrics: OptimizedSequence['metrics'] } {
    let totalDurationSeconds = 0;
    let totalDistanceMeters = 0;
    const legs = sequence.length > 1 ? sequence.length - 1 : 0;

    for (let i = 0; i < sequence.length - 1; i++) {
      const from = sequence[i];
      const to = sequence[i + 1];
      const dur = matrix[from][to];
      totalDurationSeconds += dur;
      // Approximate distance from duration assuming ~30 km/h urban average
      totalDistanceMeters += dur * 8.33;
    }

    return {
      totalCost: totalDurationSeconds,
      metrics: {
        totalDistanceMeters: Math.round(totalDistanceMeters),
        totalDurationSeconds: Math.round(totalDurationSeconds),
        averageLegDistanceMeters: legs ? Math.round(totalDistanceMeters / legs) : 0,
        averageLegDurationSeconds: legs ? Math.round(totalDurationSeconds / legs) : 0,
      },
    };
  }

  private buildLocalDistanceMatrix(nodes: StopNode[]): number[][] {
    const n = nodes.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          matrix[i][j] = this.haversine(nodes[i].lat, nodes[i].lng, nodes[j].lat, nodes[j].lng);
        }
      }
    }
    return matrix;
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
