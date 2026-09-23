# Safe Path 🌿 — Breathe Easy, Move Smart

<img width="640" height="640" alt="safe_path_concept" src="https://github.com/user-attachments/assets/0cbf7b8a-bdab-4d26-be7a-3451e5255e21" />

Safe Path is a web application for pedestrians and cyclists that helps find the cleanest air route between two points. By analyzing real-time PM2.5 concentrations, it routes you through parks and residential areas, avoiding high-pollution highways and busy roads.
You can check it here - https://ambushhere.github.io/green-path/
## Key Features

- **Opens where you are**: the map centres on your city from an IP lookup on first paint, with no permission prompt. A locate control gives a precise position when you ask for it.
- **Intelligent Routing**: Uses a custom steering algorithm to nudge routes toward low-pollution zones.
- **Route Comparison**: Three named tradeoffs side by side, each with distance, travel time and measured PM2.5, with the cleanest option selected by default.
- **Travel Modes**: Specialized routing profiles for both walking and cycling.
- **Honest about data**: when no monitoring station reports a measurement, Safe Path says so and withholds the number rather than estimating one. Air-quality readings come from WAQI (aqicn.org), which needs a free token.

## Air-quality data

Safe Path reads WAQI. A token is required, and there are two ways to supply it:

- **Through the proxy, recommended.** Run `npm run proxy` with `WAQI_TOKEN` set, then point `VITE_API_PROXY_BASE_URL` at it. The token stays server-side.
- **Directly from the browser.** Set `VITE_WAQI_TOKEN`. Simpler for local work, but the token ships inside the bundle.

Get a free token at [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/).

Without a token the app still plans routes; it ranks them by distance and time and states plainly that no air-quality measurement was available.

> **Note on OpenAQ:** the v2 API this project originally used has been retired and now answers every request with HTTP 410. It is no longer called unless you point `VITE_AIR_QUALITY_API_BASE_URL` at a working deployment. OpenAQ v3 requires its own API key.

## How to Run

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Step 1: Clone the Repository
```bash
git clone https://github.com/ambushhere/green-path.git
cd green-path
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Step 4: Build for Production
```bash
npm run build
```
This creates an optimized production build in the `dist` folder.

### Step 5: Preview Production Build
```bash
npm run preview
```
This lets you test the production build locally before deployment.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Check code quality with ESLint
- `npm run test` - Run unit tests with Vitest
- `npm run proxy` - Run local API proxy server on port 8787

## Environment Variables

Copy `.env.example` to `.env` and set values as needed.

### Frontend variables

- `VITE_API_PROXY_BASE_URL` - Optional proxy base URL (example: `http://localhost:8787`)
- `VITE_ROUTING_API_BASE_URL` - Optional direct routing API override
- `VITE_GEOCODING_API_BASE_URL` - Optional direct geocoding API override
- `VITE_AIR_QUALITY_API_BASE_URL` - Optional direct air quality API override
- `VITE_WAQI_API_BASE_URL` - Optional WAQI base override
- `VITE_WAQI_TOKEN` - WAQI token for direct browser calls (ships in the bundle; prefer the proxy)
- `VITE_IP_GEOLOCATION_API_BASE_URL` - Optional IP geolocation provider (default `https://ipwho.is`)
- `VITE_GEOCODING_LANGUAGE` - Preferred geocoding language (default `en`)

IP geolocation deliberately bypasses the proxy. A proxied lookup would resolve the proxy's own address rather than the visitor's.

### Proxy variables

See `proxy/README.md` for proxy-side environment variables like `WAQI_TOKEN`.

## Local Proxy Quick Start

```bash
npm run proxy
```

Then set:

```bash
VITE_API_PROXY_BASE_URL=http://localhost:8787
```

Detailed proxy docs: `proxy/README.md`

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Maps**: Leaflet.js + React-Leaflet + OpenStreetMap
- **Routing**: OSRM (Open Source Routing Machine)
- **Geocoding**: Nominatim (OpenStreetMap)
- **Air Quality APIs**: WAQI API & OpenAQ API
- **Forms**: React Hook Form
- **HTTP Client**: Axios

---
*Created with care for people with allergies, asthma, and parents with strollers.*
