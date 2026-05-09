import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;
import { LatLngDto } from '../dto/routing.dto';

export interface DistanceMatrixResult {
  originIndex: number;
  destinationIndex: number;
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

export interface DirectionsResult {
  polyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legs: DirectionsLeg[];
}

export interface DirectionsLeg {
  distanceMeters: number;
  durationSeconds: number;
  startLocation: LatLngDto;
  endLocation: LatLngDto;
  polyline: string;
  instructions: string;
}

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY') ?? '';
    this.client = axios.create({
      baseURL: 'https://maps.googleapis.com/maps/api',
      timeout: 15000,
    });
  }

  // ── Geocoding ───────────────────────────────────────────────────────────────

  async geocode(address: string): Promise<{ lat: number; lng: number; formattedAddress: string; placeId: string } | null> {
    try {
      const { data } = await this.client.get<any>('/geocode/json', {
        params: { address, key: this.apiKey },
      });

      if (data.status !== 'OK' || !data.results?.length) {
        this.logger.warn(`Geocode failed: ${data.status} for "${address}"`);
        return null;
      }

      const result = data.results[0];
      const loc = result.geometry.location;
      return {
        lat: loc.lat,
        lng: loc.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
      };
    } catch (err) {
      this.logger.error(`Geocode error: ${err.message}`);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const { data } = await this.client.get<any>('/geocode/json', {
        params: { latlng: `${lat},${lng}`, key: this.apiKey },
      });

      if (data.status !== 'OK' || !data.results?.length) return null;
      return data.results[0].formatted_address;
    } catch (err) {
      this.logger.error(`Reverse geocode error: ${err.message}`);
      return null;
    }
  }

  // ── Distance Matrix ─────────────────────────────────────────────────────────

  async distanceMatrix(
    origins: LatLngDto[],
    destinations: LatLngDto[],
  ): Promise<DistanceMatrixResult[]> {
    if (!origins.length || !destinations.length) return [];

    const originStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
    const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

    try {
      const { data } = await this.client.get<any>('/distancematrix/json', {
        params: {
          origins: originStr,
          destinations: destStr,
          mode: 'driving',
          departure_time: 'now',
          key: this.apiKey,
        },
      });

      if (data.status !== 'OK') {
        this.logger.warn(`Distance Matrix failed: ${data.status}`);
        return [];
      }

      const results: DistanceMatrixResult[] = [];
      data.rows.forEach((row: any, i: number) => {
        row.elements.forEach((el: any, j: number) => {
          if (el.status === 'OK') {
            results.push({
              originIndex: i,
              destinationIndex: j,
              distanceMeters: el.distance.value,
              durationSeconds: el.duration_in_traffic?.value ?? el.duration.value,
              distanceText: el.distance.text,
              durationText: el.duration_in_traffic?.text ?? el.duration.text,
            });
          }
        });
      });

      return results;
    } catch (err) {
      this.logger.error(`Distance Matrix error: ${err.message}`);
      return [];
    }
  }

  // ── Directions ──────────────────────────────────────────────────────────────

  async getDirections(
    waypoints: LatLngDto[],
    optimize?: boolean,
  ): Promise<DirectionsResult | null> {
    if (waypoints.length < 2) return null;

    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
    const via = waypoints.slice(1, -1);
    const waypointStr = via.length
      ? `optimize:${optimize ?? false}|` + via.map((w) => `${w.lat},${w.lng}`).join('|')
      : undefined;

    try {
      const { data } = await this.client.get<any>('/directions/json', {
        params: {
          origin,
          destination,
          waypoints: waypointStr,
          mode: 'driving',
          departure_time: 'now',
          key: this.apiKey,
        },
      });

      if (data.status !== 'OK' || !data.routes?.length) {
        this.logger.warn(`Directions failed: ${data.status}`);
        return null;
      }

      const route = data.routes[0];
      const legData = route.legs ?? [];
      const legs: DirectionsLeg[] = legData.map((l: any) => ({
        distanceMeters: l.distance.value,
        durationSeconds: l.duration_in_traffic?.value ?? l.duration.value,
        startLocation: { lat: l.start_location.lat, lng: l.start_location.lng },
        endLocation: { lat: l.end_location.lat, lng: l.end_location.lng },
        polyline: l.steps.map((s: any) => s.polyline.points).join(''),
        instructions: l.steps.map((s: any) => s.html_instructions).join(' | '),
      }));

      const totalDistanceMeters = legs.reduce((sum, l) => sum + l.distanceMeters, 0);
      const totalDurationSeconds = legs.reduce((sum, l) => sum + l.durationSeconds, 0);

      return {
        polyline: route.overview_polyline?.points ?? '',
        totalDistanceMeters,
        totalDurationSeconds,
        legs,
      };
    } catch (err) {
      this.logger.error(`Directions error: ${err.message}`);
      return null;
    }
  }

  // ── Snap to Roads ───────────────────────────────────────────────────────────

  async snapToRoads(points: LatLngDto[]): Promise<LatLngDto[] | null> {
    if (points.length < 2) return points;
    const path = points.map((p) => `${p.lat},${p.lng}`).join('|');

    try {
      const { data } = await this.client.get<any>('/snapToRoads', {
        params: { path, interpolate: true, key: this.apiKey },
      });

      if (!data.snappedPoints) return null;
      return data.snappedPoints.map((sp: any) => ({
        lat: sp.location.latitude,
        lng: sp.location.longitude,
      }));
    } catch (err) {
      this.logger.error(`Snap to roads error: ${err.message}`);
      return null;
    }
  }

  // ── Utility: build full distance matrix for a set of stops ──────────────────

  async buildFullDistanceMatrix(stops: LatLngDto[]): Promise<number[][]> {
    const n = stops.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));

    const results = await this.distanceMatrix(stops, stops);
    for (const r of results) {
      matrix[r.originIndex][r.destinationIndex] = r.durationSeconds;
    }

    for (let i = 0; i < n; i++) matrix[i][i] = 0;
    return matrix;
  }
}
