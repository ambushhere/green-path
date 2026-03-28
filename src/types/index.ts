export interface LatLng {
  lat: number;
  lng: number;
}

export type DataSource = 'live' | 'mock';
export type RouteType = 'direct' | 'green' | 'scenic';
export type RouteAirQualitySource = 'live' | 'mixed' | 'mock';

export interface AirQualityData {
  location: LatLng;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  timestamp: string;
  source: DataSource;
  warning?: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  airQuality?: AirQualityData;
}

export interface Route {
  type: RouteType;
  points: RoutePoint[];
  distance: number;
  duration: number;
  avgPM25: number;
  score: number;
  airQualitySource: RouteAirQualitySource;
  safety: 'safe' | 'moderate' | 'unsafe';
}

export interface SearchLocation {
  name: string;
  lat: number;
  lng: number;
}

export type TravelMode = 'foot' | 'bike';
