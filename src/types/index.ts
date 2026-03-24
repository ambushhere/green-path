export interface LatLng {
  lat: number;
  lng: number;
}

export interface AirQualityData {
  location: LatLng;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  timestamp: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  airQuality?: AirQualityData;
}

export interface Route {
  points: RoutePoint[];
  distance: number;
  duration: number;
  avgPM25: number;
  safety: 'safe' | 'moderate' | 'unsafe';
}

export interface SearchLocation {
  name: string;
  lat: number;
  lng: number;
}

export type TravelMode = 'foot' | 'bike';
