import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  vehicle_distance: number;
  walking_distance: number;
  cycling_distance: number;
  countries_visited: number;
  days_on_road: number;
  current_location: string;
  total_activities: number;
  avg_distance_per_day: number;
  most_common_activity: string;
}

export interface MapDataPoint {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  activity_type: string;
  color: string;
  distance_meters: number;
  start_time: string;
  end_time: string;
  duration_hours: number;
  start_location?: string;
  end_location?: string;
}

export interface RecentStop {
  name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  coordinates?: [number, number];
}

export interface HealthCheck {
  status: string;
  timeline_loaded: boolean;
  activities_count: number;
}

export interface FilterOptions {
  countries: string[];
  transport_modes: string[];
  date_range: {
    min_date: string | null;
    max_date: string | null;
  };
}

interface PlotlyFilters {
  country?: string;
  transport_mode?: string;
  start_date?: string;
  end_date?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard/stats`);
  }

  getMapData(startDate?: string, endDate?: string): Observable<MapDataPoint[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    return this.http.get<MapDataPoint[]>(`${this.baseUrl}/map/data`, { params });
  }

  getRecentStops(limit: number = 10): Observable<RecentStop[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<RecentStop[]>(`${this.baseUrl}/recent-stops`, { params });
  }

  getHealth(): Observable<HealthCheck> {
    return this.http.get<HealthCheck>(`${this.baseUrl}/health`);
  }

  getPlotlyMap(filters: PlotlyFilters = {}): Observable<unknown> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get(`${this.baseUrl}/map/plotly`, { params });
  }

  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.baseUrl}/filters`);
  }
}
