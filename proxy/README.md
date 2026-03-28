# Safe Path API Proxy

This proxy provides a thin server-side layer for routing, geocoding, and air quality endpoints.

## Why use it

- Avoid direct browser-to-third-party API coupling
- Centralize token handling for WAQI
- Reduce CORS/rate-limit friction
- Enable future caching/throttling logic in one place

## Start proxy

```bash
npm run proxy
```

The server runs at `http://localhost:8787` by default.

## Configure frontend

In `.env` for the React app:

```bash
VITE_API_PROXY_BASE_URL=http://localhost:8787
VITE_GEOCODING_LANGUAGE=en
```

Optional server env vars:

```bash
PORT=8787
WAQI_TOKEN=your_token_here
ROUTING_API_BASE_URL=https://router.project-osrm.org
GEOCODING_API_BASE_URL=https://nominatim.openstreetmap.org
AIR_QUALITY_API_BASE_URL=https://api.openaq.org/v2
WAQI_API_BASE_URL=https://api.waqi.info
```

## Endpoints

- `/health`
- `/routing/*`
- `/geocoding/*`
- `/air-quality/*`
- `/waqi/*`

Example:

```bash
curl "http://localhost:8787/geocoding/search?q=Berlin&format=json&limit=3"
```
