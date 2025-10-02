from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import os
from pathlib import Path
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time
from functools import lru_cache
import plotly.graph_objects as go
import plotly.express as px
import plotly

app = Flask(__name__)
CORS(app, origins=[
        "http://localhost",
        "http://localhost:*",
        "http://127.0.0.1",
        "http://127.0.0.1:*",
        "https://*.vercel.app",  # Vercel domains
        "https://*.netlify.app",  # Netlify domains
        "https://vangon-vanlife-tracker.vercel.app",  # Your specific Vercel domain
        "https://vangon-vanlife-tracker.netlify.app"  # Alternative domain
    ],
     allow_headers=["Content-Type", "Authorization"], 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Path to the Google Timeline data
TIMELINE_JSON_PATH = Path(__file__).parent / "src" / "data" / "google_timeline.json"

class TimelineProcessor:
    def __init__(self, json_path):
        self.json_path = json_path
        self.timeline_data = None
        self.timeline_semantic_df = None
        self.activity_final = None
        self.visit_df = None
        self.geocoder = Nominatim(user_agent="van_journey_app")
        self._load_and_process_data()
    
    def _load_and_process_data(self):
        """Load and process the Google Timeline JSON data"""
        try:
            with open(self.json_path, 'r') as f:
                self.timeline_data = json.load(f)
            
            # Create semantic segments dataframe
            self.timeline_semantic_df = pd.DataFrame(self.timeline_data['semanticSegments'])
            
            # Add boolean flags for activity types
            self.timeline_semantic_df['is_path'] = np.where(
                self.timeline_semantic_df['timelinePath'].notnull(), 1, 0
            )
            self.timeline_semantic_df['is_visit'] = np.where(
                self.timeline_semantic_df['visit'].notnull(), 1, 0
            )
            self.timeline_semantic_df['is_activity'] = np.where(
                self.timeline_semantic_df['activity'].notnull(), 1, 0
            )
            
            # Convert timestamps
            self.timeline_semantic_df['startTime'] = pd.to_datetime(
                self.timeline_semantic_df['startTime'], utc=True
            )
            self.timeline_semantic_df['endTime'] = pd.to_datetime(
                self.timeline_semantic_df['endTime'], utc=True
            )
            
            # Filter for entries from June 10th onwards (as in notebook)
            self.timeline_semantic_df = self.timeline_semantic_df[
                self.timeline_semantic_df['startTime'] >= pd.to_datetime('2025-06-10', utc=True)
            ]
            
            # Process activities and visits
            self._process_activities()
            self._process_visits()
            
        except Exception as e:
            print(f"Error processing timeline data: {e}")
            # Initialize empty dataframes as fallback
            self.timeline_semantic_df = pd.DataFrame()
            self.activity_final = pd.DataFrame()
            self.visit_df = pd.DataFrame()
    
    def _process_activities(self):
        """Process activity data similar to notebook logic"""
        activity_df = self.timeline_semantic_df[self.timeline_semantic_df['is_activity'] == 1]
        
        if activity_df.empty:
            self.activity_final = pd.DataFrame()
            return
        
        # Expand activity column
        activity_expanded = pd.json_normalize(activity_df['activity'])
        
        # Extract coordinates from latLng strings
        if 'start.latLng' in activity_expanded.columns:
            activity_expanded['start_latitude'] = activity_expanded['start.latLng'].str.extract(r'([\d.-]+)°').astype(float)
            activity_expanded['start_longitude'] = activity_expanded['start.latLng'].str.extract(r', ([\d.-]+)°').astype(float)
        
        if 'end.latLng' in activity_expanded.columns:
            activity_expanded['end_latitude'] = activity_expanded['end.latLng'].str.extract(r'([\d.-]+)°').astype(float)
            activity_expanded['end_longitude'] = activity_expanded['end.latLng'].str.extract(r', ([\d.-]+)°').astype(float)
        
        if 'parking.location.latLng' in activity_expanded.columns:
            activity_expanded['parking_latitude'] = activity_expanded['parking.location.latLng'].str.extract(r'([\d.-]+)°').astype(float)
            activity_expanded['parking_longitude'] = activity_expanded['parking.location.latLng'].str.extract(r', ([\d.-]+)°').astype(float)
        
        # Select relevant columns
        clean_cols = [col for col in [
            'start_latitude', 'start_longitude', 'end_latitude', 'end_longitude',
            'distanceMeters', 'probability', 'topCandidate.type', 'parking.startTime',
            'parking_latitude', 'parking_longitude'
        ] if col in activity_expanded.columns]
        
        # Combine with original activity data
        self.activity_final = pd.concat([
            activity_df.reset_index(drop=True),
            activity_expanded[clean_cols].reset_index(drop=True)
        ], axis=1)
    
    def _process_visits(self):
        """Process visit data"""
        self.visit_df = self.timeline_semantic_df[self.timeline_semantic_df['is_visit'] == 1]
        
        # Extract visit locations
        if not self.visit_df.empty:
            visit_locations = []
            for _, visit in self.visit_df.iterrows():
                visit_data = visit.get('visit', {})
                if isinstance(visit_data, dict):
                    location = visit_data.get('topCandidate', {}).get('placeLocation', {})
                    lat_lng = location.get('latLng', '')
                    if lat_lng:
                        coords = self._extract_coordinates(lat_lng)
                        if coords:
                            visit_locations.append(coords)
            
            self.visit_locations = visit_locations
    
    def _extract_coordinates(self, lat_lng_str):
        """Extract latitude and longitude from latLng string"""
        try:
            import re
            match = re.search(r'([\d.-]+)°, ([\d.-]+)°', lat_lng_str)
            if match:
                lat = float(match.group(1))
                lng = float(match.group(2))
                return (lat, lng)
        except:
            pass
        return None
    
    @lru_cache(maxsize=2000)
    def _reverse_geocode(self, lat, lng):
        """Get location details from coordinates with caching"""
        try:
            time.sleep(0.15)  # Increased rate limiting for free service
            location = self.geocoder.reverse(f"{lat}, {lng}", timeout=15, exactly_one=True)
            if location and location.raw:
                address = location.raw.get('address', {})
                country = address.get('country', '')
                if not country and 'display_name' in location.raw:
                    # Try to extract country from display_name as fallback
                    display_parts = location.raw['display_name'].split(', ')
                    if len(display_parts) > 0:
                        country = display_parts[-1]
                
                return {
                    'name': location.address,
                    'city': address.get('city', address.get('town', address.get('village', ''))),
                    'country': country,
                    'country_code': address.get('country_code', '').upper(),
                    'state': address.get('state', ''),
                    'display_name': location.address
                }
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            print(f"Geocoding timeout/service error for {lat}, {lng}: {e}")
            time.sleep(1)  # Wait longer after errors
        except Exception as e:
            print(f"Geocoding error for {lat}, {lng}: {e}")
        
        return {
            'name': f"Location at {lat:.4f}, {lng:.4f}",
            'city': '',
            'country': '',
            'country_code': '',
            'state': '',
            'display_name': f"Unknown location at {lat:.4f}, {lng:.4f}"
        }
    
    @lru_cache(maxsize=1)
    def get_dashboard_stats(self):
        """Calculate dashboard statistics (cached)"""
        if self.activity_final.empty and self.visit_df.empty:
            return {
                'vehicle_distance': 0,
                'walking_distance': 0,
                'cycling_distance': 0,
                'countries_visited': 0,
                'days_on_road': 0,
                'current_location': 'Unknown',
                'total_activities': 0,
                'avg_distance_per_day': 0,
                'most_common_activity': 'Unknown'
            }
        
        vehicle_distance = 0
        walking_distance = 0
        cycling_distance = 0
        
        if not self.activity_final.empty and 'distanceMeters' in self.activity_final.columns and 'topCandidate.type' in self.activity_final.columns:
            # Calculate vehicle distance (IN_PASSENGER_VEHICLE only)
            vehicle_df = self.activity_final[self.activity_final['topCandidate.type'] == 'IN_PASSENGER_VEHICLE']
            if not vehicle_df.empty:
                vehicle_distance = vehicle_df['distanceMeters'].sum() / 1000  # Convert to km
            
            # Calculate walking distance
            walking_df = self.activity_final[self.activity_final['topCandidate.type'].isin(['WALKING', 'ON_FOOT'])]
            if not walking_df.empty:
                walking_distance = walking_df['distanceMeters'].sum() / 1000
            
            # Calculate cycling distance
            cycling_df = self.activity_final[self.activity_final['topCandidate.type'] == 'CYCLING']
            if not cycling_df.empty:
                cycling_distance = cycling_df['distanceMeters'].sum() / 1000
        
        # Calculate days on road from fixed journey start date to today
        journey_start = pd.to_datetime('2025-06-10', utc=True)
        today = pd.Timestamp.utcnow()
        days_on_road = max((today - journey_start).days, 0)
        
        # Get most common activity type
        most_common_activity = 'Unknown'
        if not self.activity_final.empty and 'topCandidate.type' in self.activity_final.columns:
            activity_counts = self.activity_final['topCandidate.type'].value_counts()
            most_common_activity = activity_counts.index[0] if not activity_counts.empty else 'Unknown'
        
        # Calculate average vehicle distance per day
        avg_distance_per_day = vehicle_distance / max(days_on_road, 1) if days_on_road > 0 else 0
        
        # Get countries visited from real location data
        countries_visited = self._get_countries_visited()
        
        # Get current location from most recent data
        current_location = self._get_current_location()
        
        return {
            'vehicle_distance': round(vehicle_distance, 1),
            'walking_distance': round(walking_distance, 1),
            'cycling_distance': round(cycling_distance, 1),
            'countries_visited': countries_visited,
            'days_on_road': days_on_road,
            'current_location': current_location,
            'total_activities': len(self.activity_final),
            'avg_distance_per_day': round(avg_distance_per_day, 1),
            'most_common_activity': most_common_activity
        }
    
    def _get_countries_visited(self):
        """Calculate unique countries visited using geographic bounds for speed"""
        # Use fast geographic bounds detection instead of expensive geocoding
        countries = set()
        
        if not self.activity_final.empty:
            lats = []
            lngs = []
            
            # Collect all coordinates
            for _, activity in self.activity_final.iterrows():
                if pd.notna(activity.get('start_latitude')) and pd.notna(activity.get('start_longitude')):
                    lats.append(float(activity['start_latitude']))
                    lngs.append(float(activity['start_longitude']))
                if pd.notna(activity.get('end_latitude')) and pd.notna(activity.get('end_longitude')):
                    lats.append(float(activity['end_latitude']))
                    lngs.append(float(activity['end_longitude']))
            
            if lats and lngs:
                # Use the same comprehensive bounds as _get_country_from_coords
                for lat, lng in zip(lats, lngs):
                    country = self._get_country_from_coords(lat, lng)
                    if country:
                        countries.add(country)
                
                print(f"Countries found by geographic bounds: {sorted(list(countries))}")
        
        return len(countries)
    
    def _get_current_location(self):
        """Get current location from most recent data"""
        # Try to get from most recent activity
        if not self.activity_final.empty:
            latest_activity = self.activity_final.iloc[-1]
            if pd.notna(latest_activity.get('end_latitude')) and pd.notna(latest_activity.get('end_longitude')):
                try:
                    location_info = self._reverse_geocode(
                        float(latest_activity['end_latitude']),
                        float(latest_activity['end_longitude'])
                    )
                    return location_info['city'] or location_info['country'] or 'Unknown'
                except:
                    pass
        
        # Try to get from most recent visit
        if not self.visit_df.empty:
            latest_visit = self.visit_df.iloc[-1]
            visit_data = latest_visit.get('visit', {})
            if isinstance(visit_data, dict):
                location = visit_data.get('topCandidate', {}).get('placeLocation', {})
                lat_lng = location.get('latLng', '')
                if lat_lng:
                    coords = self._extract_coordinates(lat_lng)
                    if coords:
                        try:
                            location_info = self._reverse_geocode(coords[0], coords[1])
                            return location_info['city'] or location_info['country'] or 'Unknown'
                        except:
                            pass
        
        return 'Unknown'
    
    def _get_country_from_coords(self, lat, lng):
        """Enhanced country detection using comprehensive European bounds"""
        # Comprehensive European country bounds (more accurate)
        country_bounds = {
            # Western Europe
            'Portugal': ((36.8, 42.2), (-9.5, -6.2)),
            'Spain': ((35.2, 43.8), (-9.3, 4.3)),
            'Liechtenstein': ((47.0, 47.3), (9.4, 9.6)),
            'France': ((41.3, 51.1), (-5.1, 9.6)),
            'Ireland': ((51.4, 55.4), (-10.5, -5.9)),
            'United Kingdom': ((49.9, 60.8), (-8.2, 1.8)),
            
            # Central Europe
            'Germany': ((47.3, 55.1), (5.9, 15.0)),
            'Austria': ((46.4, 49.0), (9.5, 17.2)),
            'Switzerland': ((45.8, 47.8), (5.9, 10.5)),
            
            # Benelux
            'Netherlands': ((50.8, 53.6), (3.4, 7.2)),
            'Belgium': ((49.5, 51.5), (2.5, 6.4)),
            'Luxembourg': ((49.4, 50.2), (5.7, 6.5)),
            
            # Nordic Countries
            'Norway': ((57.9, 71.2), (4.6, 31.3)),
            'Sweden': ((55.3, 69.1), (11.0, 24.2)),
            'Finland': ((59.8, 70.1), (20.6, 31.6)),
            'Denmark': ((54.6, 57.8), (8.1, 15.2)),
            'Iceland': ((63.4, 66.6), (-24.5, -13.5)),
            
            # Eastern Europe
            'Poland': ((49.0, 54.8), (14.1, 24.1)),
            'Czech Republic': ((48.6, 51.1), (12.1, 18.9)),
            'Slovakia': ((47.7, 49.6), (16.8, 22.6)),
            'Hungary': ((45.7, 48.6), (16.1, 22.9)),
            'Slovenia': ((45.4, 46.9), (13.4, 16.6)),
            'Croatia': ((42.4, 46.5), (13.5, 19.4)),
            'Bosnia and Herzegovina': ((42.6, 45.3), (15.7, 19.6)),
            'Serbia': ((42.2, 46.2), (18.8, 23.0)),
            'Montenegro': ((41.9, 43.6), (18.4, 20.4)),
            'North Macedonia': ((40.8, 42.4), (20.4, 23.0)),
            'Albania': ((39.6, 42.7), (19.1, 21.1)),
            'Kosovo': ((41.8, 43.3), (20.0, 21.8)),
            
            # Southern Europe
            'Italy': ((35.5, 47.1), (6.6, 18.5)),
            'San Marino': ((43.9, 43.9), (12.4, 12.5)),
            'Vatican City': ((41.9, 41.9), (12.4, 12.5)),
            'Malta': ((35.8, 36.1), (14.2, 14.6)),
            'Greece': ((34.8, 41.7), (19.4, 29.7)),
            'Cyprus': ((34.6, 35.7), (32.3, 34.6)),
            
            # Baltic States
            'Estonia': ((57.5, 59.7), (21.8, 28.2)),
            'Latvia': ((55.7, 58.1), (20.7, 28.2)),
            'Lithuania': ((53.9, 56.4), (20.9, 26.8)),
            
            # Eastern Europe (continued)
            'Belarus': ((51.3, 56.2), (23.2, 32.8)),
            'Moldova': ((45.5, 48.5), (26.6, 30.2)),
            'Ukraine': ((45.0, 52.4), (22.1, 40.2)),
            'Romania': ((43.7, 48.3), (20.2, 29.7)),
            'Bulgaria': ((41.2, 44.2), (22.4, 28.6)),
            
            # Russia (European part)
            'Russia': ((41.2, 81.9), (19.6, -169.0)),
            
            # Caucasus
            'Georgia': ((41.1, 43.6), (39.9, 46.7)),
            'Armenia': ((38.8, 41.3), (43.4, 46.8)),
            'Azerbaijan': ((38.4, 42.0), (44.8, 50.4)),
            
            # Turkey (European part)
            'Turkey': ((35.8, 42.1), (25.7, 44.8))
        }
        
        # Check each country's bounds
        for country, ((lat_min, lat_max), (lng_min, lng_max)) in country_bounds.items():
            if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
                return country
        
        # If no European country matches, return None
        return None
    
    def get_map_data(self, start_date=None, end_date=None):
        """Get map visualization data"""
        if self.activity_final.empty:
            return []
        
        df_filtered = self.activity_final.copy()
        
        # Apply date filters
        if start_date:
            start_date = pd.to_datetime(start_date, utc=True)
            df_filtered = df_filtered[df_filtered['startTime'] >= start_date]
        if end_date:
            end_date = pd.to_datetime(end_date, utc=True)
            df_filtered = df_filtered[df_filtered['startTime'] <= end_date]
        
        # Color mapping for activities
        color_map = {
            'IN_PASSENGER_VEHICLE': '#1f77b4',
            'CYCLING': '#2ca02c',
            'WALKING': '#ff7f0e',
            'IN_VEHICLE': '#d62728',
            'ON_FOOT': '#9467bd',
            'RUNNING': '#8c564b',
            'IN_ROAD_VEHICLE': '#e377c2',
            'IN_RAIL_VEHICLE': '#7f7f7f',
            'MOTORCYCLING': '#bcbd22',
            'FLYING': '#8b4513'
        }
        
        map_data = []
        for _, row in df_filtered.iterrows():
            if pd.notna(row['start_latitude']) and pd.notna(row['end_latitude']):
                activity_type = row.get('topCandidate.type', 'UNKNOWN')
                
                # Use fast geographic bounds to determine country (no API calls)
                start_country = self._get_country_from_coords(
                    float(row['start_latitude']),
                    float(row['start_longitude'])
                )
                end_country = self._get_country_from_coords(
                    float(row['end_latitude']),
                    float(row['end_longitude'])
                )
                
                map_data.append({
                    'start_lat': float(row['start_latitude']),
                    'start_lng': float(row['start_longitude']),
                    'end_lat': float(row['end_latitude']),
                    'end_lng': float(row['end_longitude']),
                    'activity_type': activity_type,
                    'color': color_map.get(activity_type, '#636363'),
                    'distance_meters': float(row.get('distanceMeters', 0)),
                    'start_time': row['startTime'].isoformat(),
                    'end_time': row['endTime'].isoformat(),
                    'duration_hours': (row['endTime'] - row['startTime']).total_seconds() / 3600,
                    'start_location': start_country,
                    'end_location': end_country
                })
        
        return map_data
    
    def get_recent_stops(self, limit=10):
        """Get recent stops/visits with geocoded location names"""
        if self.visit_df.empty:
            return []
        
        recent_visits = self.visit_df.nlargest(limit, 'startTime')
        stops = []
        
        for _, visit in recent_visits.iterrows():
            visit_data = visit.get('visit', {})
            if isinstance(visit_data, dict):
                location = visit_data.get('topCandidate', {}).get('placeLocation', {})
                lat_lng = location.get('latLng', '')
                
                # Get location name through geocoding
                location_name = 'Unknown Location'
                if lat_lng:
                    coords = self._extract_coordinates(lat_lng)
                    if coords:
                        try:
                            location_info = self._reverse_geocode(coords[0], coords[1])
                            location_name = location_info['city'] or location_info['name'] or f"Location at {coords[0]:.4f}, {coords[1]:.4f}"
                        except:
                            location_name = f"Location at {coords[0]:.4f}, {coords[1]:.4f}"
                
                stops.append({
                    'name': location_name,
                    'start_time': visit['startTime'].isoformat(),
                    'end_time': visit['endTime'].isoformat(),
                    'duration_hours': (visit['endTime'] - visit['startTime']).total_seconds() / 3600,
                    'coordinates': coords if lat_lng else None
                })
        
        return stops
    
    def get_plotly_map(self, country_filter=None, transport_filter=None, start_date=None, end_date=None):
        """Generate optimized Plotly map with filters"""
        if self.activity_final.empty:
            return {"data": [], "layout": {}}
        
        df_filtered = self.activity_final.copy()
        
        # Apply filters
        if start_date:
            start_date = pd.to_datetime(start_date, utc=True)
            df_filtered = df_filtered[df_filtered['startTime'] >= start_date]
        if end_date:
            end_date = pd.to_datetime(end_date, utc=True)
            df_filtered = df_filtered[df_filtered['startTime'] <= end_date]
        if transport_filter and 'topCandidate.type' in df_filtered.columns:
            df_filtered = df_filtered[df_filtered['topCandidate.type'] == transport_filter]
        
        if df_filtered.empty:
            return {"data": [], "layout": {}}
        
        # OPTIMIZATION: Limit to max 200 activities for performance
        if len(df_filtered) > 200:
            # Sample evenly across the dataset
            step = len(df_filtered) // 200
            df_filtered = df_filtered.iloc[::step].head(200)
        
        # Color mapping for activities
        color_map = {
            'IN_PASSENGER_VEHICLE': '#1f77b4', 'CYCLING': '#2ca02c', 'WALKING': '#ff7f0e',
            'IN_VEHICLE': '#d62728', 'ON_FOOT': '#9467bd', 'RUNNING': '#8c564b',
            'IN_ROAD_VEHICLE': '#e377c2', 'IN_RAIL_VEHICLE': '#7f7f7f', 
            'MOTORCYCLING': '#bcbd22', 'FLYING': '#8b4513', 'IN_BUS': '#17becf',
            'IN_TRAIN': '#bcbd22', 'IN_TRAM': '#e377c2', 'IN_SUBWAY': '#7f7f7f',
            'SAILING': '#1f77b4'
        }
        
        # Group activities by type for efficient plotting
        traces = []
        activity_types = df_filtered['topCandidate.type'].unique() if 'topCandidate.type' in df_filtered.columns else ['UNKNOWN']
        
        for activity_type in activity_types:
            if pd.notna(activity_type):
                df_type = df_filtered[df_filtered['topCandidate.type'] == activity_type] if 'topCandidate.type' in df_filtered.columns else df_filtered
                
                if df_type.empty:
                    continue
                
                # Collect all coordinates for this activity type
                lats, lons, hover_texts = [], [], []
                
                for _, row in df_type.iterrows():
                    if pd.notna(row.get('start_latitude')) and pd.notna(row.get('end_latitude')):
                        lats.extend([row['start_latitude'], row['end_latitude'], None])  # None creates line break
                        lons.extend([row['start_longitude'], row['end_longitude'], None])
                        
                        hover_text = f"{activity_type}<br>Distance: {row.get('distanceMeters', 0):.0f}m<br>Date: {row['startTime'].strftime('%Y-%m-%d')}"
                        hover_texts.extend([hover_text, hover_text, None])
                
                if lats and lons:
                    traces.append(go.Scattermapbox(
                        mode="lines",
                        lon=lons,
                        lat=lats,
                        name=activity_type.replace('_', ' '),
                        line=dict(width=3, color=color_map.get(activity_type, '#636363')),
                        hovertemplate="%{text}<extra></extra>",
                        text=hover_texts
                    ))
        
        # Create figure
        fig = go.Figure(data=traces)
        
        # Calculate center point for map
        all_lats = df_filtered[['start_latitude', 'end_latitude']].values.flatten()
        all_lons = df_filtered[['start_longitude', 'end_longitude']].values.flatten()
        valid_lats = all_lats[~pd.isna(all_lats)]
        valid_lons = all_lons[~pd.isna(all_lons)]
        
        center_lat = valid_lats.mean() if len(valid_lats) > 0 else 40.0
        center_lon = valid_lons.mean() if len(valid_lons) > 0 else 0.0
        
        # Update layout with optimized settings
        fig.update_layout(
            mapbox=dict(
                style="open-street-map",
                center=dict(lat=center_lat, lon=center_lon),
                zoom=6
            ),
            title=f"Journey Map ({len(df_filtered)} activities)",
            height=600,
            margin={"r":0,"t":50,"l":0,"b":0},
            legend=dict(yanchor="top", y=0.99, xanchor="left", x=0.01, bgcolor="rgba(255,255,255,0.8)"),
            showlegend=True
        )
        
        return fig.to_dict()
    
    @lru_cache(maxsize=1)
    def get_available_filters(self):
        """Get available filter options for the frontend (cached)"""
        filters = {
            'countries': [],
            'transport_modes': [],
            'date_range': {
                'min_date': None,
                'max_date': None
            }
        }
        
        if not self.activity_final.empty:
            # Get available transport modes
            if 'topCandidate.type' in self.activity_final.columns:
                transport_modes = self.activity_final['topCandidate.type'].dropna().unique().tolist()
                filters['transport_modes'] = sorted(transport_modes)
            
            # Get date range
            if 'startTime' in self.activity_final.columns:
                min_date = self.activity_final['startTime'].min()
                max_date = self.activity_final['startTime'].max()
                if not pd.isna(min_date) and not pd.isna(max_date):
                    filters['date_range']['min_date'] = min_date.strftime('%Y-%m-%d')
                    filters['date_range']['max_date'] = max_date.strftime('%Y-%m-%d')
        
            # Get only countries that actually have data
            countries_with_data = set()
            if not self.activity_final.empty:
                for _, activity in self.activity_final.iterrows():
                    if pd.notna(activity.get('start_latitude')) and pd.notna(activity.get('start_longitude')):
                        country = self._get_country_from_coords(
                            float(activity['start_latitude']),
                            float(activity['start_longitude'])
                        )
                        if country:
                            countries_with_data.add(country)
                    
                    if pd.notna(activity.get('end_latitude')) and pd.notna(activity.get('end_longitude')):
                        country = self._get_country_from_coords(
                            float(activity['end_latitude']),
                            float(activity['end_longitude'])
                        )
                        if country:
                            countries_with_data.add(country)
            
            filters['countries'] = sorted(list(countries_with_data))
        
        return filters

# Initialize the timeline processor
timeline_processor = TimelineProcessor(TIMELINE_JSON_PATH)

# API Routes
@app.route('/api/dashboard/stats')
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        stats = timeline_processor.get_dashboard_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/map/data')
def get_map_data():
    """Get map visualization data"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        map_data = timeline_processor.get_map_data(start_date, end_date)
        return jsonify(map_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recent-stops')
def get_recent_stops():
    """Get recent stops/visits"""
    try:
        limit = int(request.args.get('limit', 10))
        stops = timeline_processor.get_recent_stops(limit)
        return jsonify(stops)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/map/plotly')
def get_plotly_map():
    """Get Plotly map visualization with filters"""
    try:
        country_filter = request.args.get('country')
        transport_filter = request.args.get('transport_mode')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        map_data = timeline_processor.get_plotly_map(
            country_filter=country_filter,
            transport_filter=transport_filter,
            start_date=start_date,
            end_date=end_date
        )
        return jsonify(map_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/filters')
def get_filters():
    """Get available filter options"""
    try:
        filters = timeline_processor.get_available_filters()
        return jsonify(filters)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/waitlist', methods=['POST'])
def add_to_waitlist():
    """Add email to waitlist"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Simple email validation
        if '@' not in email or '.' not in email.split('@')[1]:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Store in a simple JSON file (you can replace this with a database)
        waitlist_file = Path(__file__).parent / "src" / "data" / "waitlist.json"
        waitlist_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing emails
        if waitlist_file.exists():
            with open(waitlist_file, 'r') as f:
                waitlist = json.load(f)
        else:
            waitlist = []
        
        # Check if email already exists
        existing_emails = [entry['email'] for entry in waitlist]
        if email in existing_emails:
            return jsonify({'message': 'Email already on waitlist'}), 200
        
        # Add new email
        waitlist.append({
            'email': email,
            'timestamp': datetime.now().isoformat(),
            'source': data.get('source', 'homepage')
        })
        
        # Save back to file
        with open(waitlist_file, 'w') as f:
            json.dump(waitlist, f, indent=2)
        
        return jsonify({
            'message': 'Successfully added to waitlist',
            'email': email,
            'timestamp': datetime.now().isoformat()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timeline_loaded': timeline_processor.timeline_data is not None,
        'activities_count': len(timeline_processor.activity_final) if timeline_processor.activity_final is not None else 0
    })

if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=5001)
