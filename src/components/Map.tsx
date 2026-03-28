import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng, Route, AirQualityData } from '@/types';
import { getAirQualityLevel } from '@/services/airQuality';

// Fix Leaflet default icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  center?: LatLng;
  zoom?: number;
  startPoint?: LatLng | null;
  endPoint?: LatLng | null;
  routes?: Route[];
  selectedRouteIndex?: number;
  onMapClick?: (latlng: LatLng) => void;
  showAirQuality?: boolean;
  airQualityData?: AirQualityData[];
}

export const Map = ({
  center = { lat: 55.7558, lng: 37.6173 },
  zoom = 13,
  startPoint,
  endPoint,
  routes = [],
  selectedRouteIndex = 0,
  onMapClick,
  showAirQuality = false,
  airQualityData = []
}: MapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routesRef = useRef<L.LayerGroup | null>(null);
  const airQualityRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([55.7558, 37.6173], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    routesRef.current = L.layerGroup().addTo(map);
    airQualityRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update click handler
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    
    // Remove existing click handlers
    map.off('click');
    
    // Add new click handler
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }
  }, [onMapClick]);

  // Update center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!markersRef.current) return;

    markersRef.current.clearLayers();

    // Start point marker (green)
    if (startPoint) {
      const startIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background: #22c55e;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">A</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      
      L.marker([startPoint.lat, startPoint.lng], { icon: startIcon })
        .addTo(markersRef.current)
        .bindPopup('Point A');
    }

    // End point marker (red)
    if (endPoint) {
      const endIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background: #ef4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">B</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      
      L.marker([endPoint.lat, endPoint.lng], { icon: endIcon })
        .addTo(markersRef.current)
        .bindPopup('Point B');
    }
  }, [startPoint, endPoint]);

  // Update routes
  useEffect(() => {
    if (!routesRef.current) return;

    routesRef.current.clearLayers();

    routes.forEach((route, index) => {
      const isSelected = index === selectedRouteIndex;
      const points = route.points.map(p => [p.lat, p.lng] as L.LatLngExpression);
      
      // High-contrast route colors based on safety
      let color = '#10b981'; // safe - emerald
      if (route.safety === 'moderate') color = '#f59e0b'; // amber
      if (route.safety === 'unsafe') color = '#ef4444'; // red
      
      // Dim non-selected routes
      const opacity = isSelected ? 0.98 : 0.45;
      const weight = isSelected ? 6 : 4;

      // Draw a dark casing first so the route stays visible on any tile background
      L.polyline(points, {
        color: '#111827',
        weight: weight + 4,
        opacity: isSelected ? 0.85 : 0.35,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isSelected ? undefined : '6, 10'
      }).addTo(routesRef.current!);

      const polyline = L.polyline(points, {
        color,
        weight,
        opacity,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isSelected ? undefined : '5, 10'
      }).addTo(routesRef.current!);

      if (isSelected) {
        polyline.bindPopup(`
          <div style="font-family: system-ui; padding: 8px;">
            <strong>Route ${index + 1}</strong><br/>
            Distance: ${(route.distance / 1000).toFixed(1)} km<br/>
            Time: ${Math.round(route.duration / 60)} min<br/>
            Avg PM2.5: ${route.avgPM25} µg/m³
          </div>
        `);
      }
    });
  }, [routes, selectedRouteIndex]);

  // Update air quality circles
  useEffect(() => {
    if (!airQualityRef.current || !showAirQuality) {
      if (airQualityRef.current) {
        airQualityRef.current.clearLayers();
      }
      return;
    }

    airQualityRef.current.clearLayers();

    airQualityData.forEach((aq) => {
      const { color } = getAirQualityLevel(aq.pm25);
      const radius = 200;

      L.circle([aq.location.lat, aq.location.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.3,
        color: color,
        weight: 1,
        opacity: 0.6
      }).addTo(airQualityRef.current!)
        .bindPopup(`
          <div style="font-family: system-ui; padding: 8px;">
            <strong>Air Quality</strong><br/>
            PM2.5: ${aq.pm25} µg/m³<br/>
            PM10: ${aq.pm10} µg/m³<br/>
            NO₂: ${aq.no2} µg/m³
          </div>
        `);
    });
  }, [airQualityData, showAirQuality]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
};

export default Map;
