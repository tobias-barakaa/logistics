import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;

export interface RouteContext {
  driverName: string;
  vehicleType: string;
  totalStops: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  stops: Array<{
    orderId: string;
    customerName: string;
    address: string;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    priority?: string;
    isFragile?: boolean;
    requiresSignature?: boolean;
  }>;
  trafficConditions?: string;
  weatherNote?: string;
}

export interface AiRouteAnalysis {
  summary: string;
  riskFactors: string[];
  recommendations: string[];
  estimatedFuelCost?: number;
  driverFatigueScore?: number;
  alternativeSuggestion?: string;
}

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('DEEPSEEK_API_KEY') ?? '';
    const baseURL = this.config.get<string>('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com/v1';
    this.model = 'deepseek-chat';

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async analyzeRoute(context: RouteContext): Promise<AiRouteAnalysis | null> {
    if (!this.apiKey) {
      this.logger.warn('DeepSeek API key not configured; skipping AI analysis.');
      return null;
    }

    const systemPrompt = `You are a logistics route optimization analyst. Analyze delivery routes and provide concise, actionable insights. Respond ONLY with valid JSON in this exact shape:
{
  "summary": "short overall assessment",
  "riskFactors": ["risk 1", "risk 2"],
  "recommendations": ["rec 1", "rec 2"],
  "estimatedFuelCost": number|null,
  "driverFatigueScore": 1-10|null,
  "alternativeSuggestion": "string|null"
}`;

    const userPrompt = this.buildPrompt(context);

    try {
      const { data } = await this.client.post<any>('/chat/completions', {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });

      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content) as AiRouteAnalysis;
      return parsed;
    } catch (err) {
      this.logger.error(`DeepSeek API error: ${err.message}`);
      return null;
    }
  }

  async compareRoutes(
    routeA: { name: string; distanceKm: number; durationMin: number; stops: number },
    routeB: { name: string; distanceKm: number; durationMin: number; stops: number },
  ): Promise<string | null> {
    if (!this.apiKey) return null;

    const prompt = `Compare these two delivery routes and recommend the better one in 2-3 sentences:
Route A (${routeA.name}): ${routeA.distanceKm}km, ${routeA.durationMin}min, ${routeA.stops} stops.
Route B (${routeB.name}): ${routeB.distanceKm}km, ${routeB.durationMin}min, ${routeB.stops} stops.`;

    try {
      const { data } = await this.client.post<any>('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 300,
      });

      return data.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      this.logger.error(`DeepSeek compare error: ${err.message}`);
      return null;
    }
  }

  async suggestDispatchStrategy(unassignedOrders: number, availableDrivers: number): Promise<string | null> {
    if (!this.apiKey) return null;

    const prompt = `We have ${unassignedOrders} unassigned delivery orders and ${availableDrivers} available drivers. Suggest a dispatch strategy in 2-3 sentences.`;

    try {
      const { data } = await this.client.post<any>('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 300,
      });

      return data.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      this.logger.error(`DeepSeek dispatch error: ${err.message}`);
      return null;
    }
  }

  private buildPrompt(ctx: RouteContext): string {
    const stopsText = ctx.stops
      .map(
        (s, i) =>
          `${i + 1}. ${s.customerName} @ ${s.address} | Window: ${s.timeWindowStart ?? 'N/A'}–${s.timeWindowEnd ?? 'N/A'} | Priority: ${s.priority ?? 'normal'} | Fragile: ${s.isFragile ? 'yes' : 'no'}`,
      )
      .join('\n');

    return `Analyze the following delivery route:
Driver: ${ctx.driverName}
Vehicle: ${ctx.vehicleType}
Total Stops: ${ctx.totalStops}
Total Distance: ${ctx.totalDistanceKm.toFixed(2)} km
Total Duration: ${ctx.totalDurationMin.toFixed(0)} min
Stops:
${stopsText}
Traffic: ${ctx.trafficConditions ?? 'unknown'}
Weather: ${ctx.weatherNote ?? 'unknown'}
`;
  }
}
