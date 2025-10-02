import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, effect, inject, signal, AfterViewInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import {
  ApiService,
  DashboardStats,
  FilterOptions,
  MapDataPoint,
  RecentStop
} from '../../services/api.service';

interface MetricCard {
  label: string;
  primary: string;
  secondary: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;
  private routesLayer: L.LayerGroup | null = null;

  loading = signal(true);
  error = signal<string | null>(null);
  stats = signal<DashboardStats | null>(null);

  recentStops = signal<RecentStop[]>([]);
  filterOptions = signal<FilterOptions | null>(null);

  selectedCountry = signal<string>('');
  selectedTransportMode = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');

  mapLoading = signal(false);
  mapData = signal<MapDataPoint[] | null>(null);

  journeyStats = signal<{ label: string; value: string }[]>([]);

  // Centralized activity type mappings
  readonly activityLabels: Record<string, string> = {
    'IN_PASSENGER_VEHICLE': 'Van Drive',
    'CYCLING': 'Cycling',
    'WALKING': 'Walking',
    'IN_VEHICLE': 'Car Ride',
    'ON_FOOT': 'On Foot',
    'RUNNING': 'Running',
    'IN_ROAD_VEHICLE': 'Road Vehicle',
    'IN_RAIL_VEHICLE': 'Train',
    'MOTORCYCLING': 'Motorcycle',
    'FLYING': 'Flight',
    'IN_BUS': 'Bus',
    'IN_SUBWAY': 'Subway',
    'IN_TRAIN': 'Train',
    'IN_TRAM': 'Tram',
    'SAILING': 'Sailing'
  };

  readonly colorMap: Record<string, string> = {
    'IN_PASSENGER_VEHICLE': '#4FC3F7',  // Bright cyan blue
    'CYCLING': '#66BB6A',               // Green
    'WALKING': '#FFA726',               // Orange
    'IN_VEHICLE': '#EF5350',            // Red
    'ON_FOOT': '#AB47BC',               // Purple
    'RUNNING': '#EC407A',               // Pink
    'IN_ROAD_VEHICLE': '#7E57C2',       // Deep purple
    'IN_RAIL_VEHICLE': '#9CCC65',       // Light green
    'MOTORCYCLING': '#FFEE58',          // Yellow
    'FLYING': '#FF7043',                // Deep orange
    'IN_BUS': '#17becf',                // Cyan
    'IN_SUBWAY': '#bcbd22',             // Olive
    'IN_TRAIN': '#e377c2',              // Pink
    'IN_TRAM': '#7f7f7f',              // Gray
    'SAILING': '#1f77b4'                // Blue
  };

  constructor() {
    // Watch for filter changes - must be in constructor for injection context
    effect(() => {
      const transport = this.selectedTransportMode();
      const country = this.selectedCountry();
      const startDate = this.startDate();
      const endDate = this.endDate();
      const mapData = this.mapData();
      
      console.log('Filter effect triggered:', { transport, country, startDate, endDate, hasMap: !!this.map, dataLength: mapData?.length });
      
      if (this.map && mapData && mapData.length > 0) {
        console.log('Updating map with filters');
        this.updateMapRoutes();
      }
    });
  }

  metricCards = computed<MetricCard[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }

    return [
      {
        label: 'Vehicle Kilometers',
        primary: `${Math.round(stats.vehicle_distance).toLocaleString()} km`,
        secondary: `${stats.avg_distance_per_day.toFixed(1)} km per day`,
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a4 4 0 108 0m-8 0a4 4 0 118 0m-8 0H3m5 0v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7m16 0a4 4 0 10-8 0m8 0a4 4 0 11-8 0m8 0h3m-3 0v10a2 2 0 002 2h1a2 2 0 002-2V7"/>'
      },
      {
        label: 'Walking Distance',
        primary: `${Math.round(stats.walking_distance).toLocaleString()} km`,
        secondary: 'On foot exploration',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>'
      },
      {
        label: 'Cycling Distance',
        primary: `${Math.round(stats.cycling_distance).toLocaleString()} km`,
        secondary: 'Pedal-powered adventures',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>'
      },
      {
        label: 'Countries Traveled',
        primary: `${stats.countries_visited}`,
        secondary: `${stats.total_activities} recorded activities`,
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>'
      },
      {
        label: 'Days On The Road',
        primary: `${stats.days_on_road}`,
        secondary: 'Since June 10, 2025',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>'
      }
    ];
  });

  ngOnInit(): void {
    // Scroll to top when navigating to dashboard
    window.scrollTo(0, 0);
    this.loadDashboard();
    // Load map data immediately on init
    this.fetchMapData();
  }

  ngAfterViewInit(): void {
    // View is ready - map initialization will happen when data arrives
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .getDashboardStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: stats => {
          console.log('Dashboard stats received:', stats);
          this.stats.set(stats);
          this.loading.set(false);
          this.error.set(null);
          this.refreshJourneyStats();
        },
        error: err => {
          console.error('Dashboard stats error:', err);
          this.error.set(this.parseError(err));
          this.loading.set(false);
        }
      });

    this.api
      .getRecentStops()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ 
        next: stops => this.recentStops.set(stops), 
        error: (err) => {
          console.error('Recent stops error:', err);
          this.recentStops.set([]);
        }
      });

    this.api
      .getFilterOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: filters => {
          this.filterOptions.set(filters);
          if (filters.date_range.min_date && filters.date_range.max_date) {
            this.startDate.set(filters.date_range.min_date);
            this.endDate.set(filters.date_range.max_date);
          }
        },
        error: (err) => {
          console.error('Filter options error:', err);
          this.filterOptions.set(null);
        }
      });
  }

  private refreshJourneyStats(): void {
    const stats = this.stats();
    if (!stats) {
      this.journeyStats.set([]);
      return;
    }

    this.journeyStats.set([
      { label: 'Average Distance / Day', value: `${stats.avg_distance_per_day.toFixed(1)} km` },
      { label: 'Total Activities Logged', value: `${stats.total_activities}` },
      { label: 'Most Frequent Mode', value: stats.most_common_activity.replace(/_/g, ' ') }
    ]);
  }

  private fetchMapData(): void {
    this.mapLoading.set(true);

    this.api
      .getMapData(this.startDate(), this.endDate())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          console.log('Map data received:', data.length, 'segments');
          this.mapData.set(data);
          this.mapLoading.set(false);
          
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (!this.map && this.mapContainer && data.length > 0) {
                this.initializeMap();
              } else if (this.map) {
                this.updateMapRoutes();
              }
            }, 200);
          });
        },
        error: (err) => {
          console.error('Map data error:', err);
          this.mapData.set(null);
          this.mapLoading.set(false);
        }
      });
  }

  private initializeMap(): void {
    const data = this.mapData();
    if (!data || data.length === 0 || !this.mapContainer) {
      console.warn('Cannot initialize map: missing data or container');
      return;
    }

    if (this.map) {
      console.log('Map already initialized, updating routes');
      this.updateMapRoutes();
      return;
    }

    try {
      // Calculate center
      const allLats = data.flatMap(d => [d.start_lat, d.end_lat]);
      const allLons = data.flatMap(d => [d.start_lng, d.end_lng]);
      const centerLat = allLats.reduce((a, b) => a + b, 0) / allLats.length;
      const centerLon = allLons.reduce((a, b) => a + b, 0) / allLons.length;

      console.log('Initializing Leaflet map at', centerLat, centerLon);

      // Initialize map
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [centerLat, centerLon],
        zoom: 6,
        scrollWheelZoom: true,
        preferCanvas: true
      });

      // Add CartoDB Voyager tiles (clean modern style with subtle colors)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(this.map);

      // Initialize routes layer
      this.routesLayer = L.layerGroup().addTo(this.map);

      // Add legend
      this.addMapLegend();

      // Force map to recalculate size
      setTimeout(() => {
        this.map?.invalidateSize();
        this.updateMapRoutes();
      }, 100);

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.map = null;
      this.routesLayer = null;
    }
  }

  private addMapLegend(): void {
    if (!this.map) return;

    // Create legend HTML using centralized mappings
    const legendHtml = `
      <div style="
        background: rgba(15, 118, 110, 0.9);
        border: 1px solid rgba(45, 212, 191, 0.3);
        border-radius: 12px;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: #f8fafc;
        box-shadow: 0 8px 20px rgba(15, 118, 110, 0.3);
        backdrop-filter: blur(8px);
        min-width: 180px;
      ">
        <div style="
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #bbf7d0;
        ">Activity Types</div>
        ${Object.entries(this.activityLabels).map(([activity, label]) => `
          <div style="
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 11px;
          ">
            <div style="
              width: 16px;
              height: 3px;
              background-color: ${this.colorMap[activity] || '#636363'};
              margin-right: 10px;
              border-radius: 2px;
            "></div>
            <span style="color: #e2e8f0;">${label}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Add legend to map
    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = legendHtml;
      return div;
    };
    legend.addTo(this.map);
  }

  private updateMapRoutes(): void {
    if (!this.map || !this.routesLayer) {
      return;
    }

    const data = this.mapData();
    if (!data || data.length === 0) {
      return;
    }

    // Clear existing routes
    this.routesLayer.clearLayers();

    // Apply all filters
    let filteredData = data;
    
    // Filter by transport mode
    const transport = this.selectedTransportMode();
    if (transport) {
      filteredData = filteredData.filter(d => d.activity_type === transport);
    }

        // Filter by country (check both start and end locations)
        const country = this.selectedCountry();
        if (country) {
          const beforeCountryFilter = filteredData.length;
          filteredData = filteredData.filter(d => {
            const startMatch = d.start_location && d.start_location === country;
            const endMatch = d.end_location && d.end_location === country;
            return startMatch || endMatch;
          });
          console.log(`Country filter "${country}": ${beforeCountryFilter} -> ${filteredData.length} routes`);
        }

    // Filter by date range
    const startDateStr = this.startDate();
    const endDateStr = this.endDate();
    if (startDateStr || endDateStr) {
      filteredData = filteredData.filter(d => {
        const routeDate = new Date(d.start_time);
        let include = true;
        
        if (startDateStr) {
          const filterStart = new Date(startDateStr);
          include = include && routeDate >= filterStart;
        }
        
        if (endDateStr) {
          const filterEnd = new Date(endDateStr);
          filterEnd.setHours(23, 59, 59, 999); // Include the entire end date
          include = include && routeDate <= filterEnd;
        }
        
        return include;
      });
    }

    console.log(`Filtered ${data.length} routes to ${filteredData.length} routes`);

    if (filteredData.length === 0) {
      console.warn('No routes match the current filters');
      return;
    }

    // Use centralized color mapping

    // Add routes to map
    const bounds: L.LatLngBounds = L.latLngBounds([]);
    
    filteredData.forEach(d => {
      const latlngs: L.LatLngExpression[] = [
        [d.start_lat, d.start_lng],
        [d.end_lat, d.end_lng]
      ];

      const color = this.colorMap[d.activity_type] || '#636363';
      
      const polyline = L.polyline(latlngs, {
        color: color,
        weight: 4,
        opacity: 0.8
      }).addTo(this.routesLayer!);

          // Add popup with details using centralized mapping
          polyline.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong>${this.activityLabels[d.activity_type] || d.activity_type}</strong><br>
              Distance: ${(d.distance_meters / 1000).toFixed(1)} km<br>
              Duration: ${d.duration_hours.toFixed(1)}h
            </div>
          `);

      // Extend bounds
      latlngs.forEach(latlng => bounds.extend(latlng));
    });

    // Fit map to show all routes
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  private parseError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return 'Failed to load data';
    }
  }
}
