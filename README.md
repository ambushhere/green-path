# Safe Path 🌿 — Breathe Easy, Move Smart

<img width="640" height="640" alt="safe_path_concept" src="https://github.com/user-attachments/assets/0cbf7b8a-bdab-4d26-be7a-3451e5255e21" />

Safe Path is a web application for pedestrians and cyclists that helps find the cleanest air route between two points. By analyzing real-time PM2.5 concentrations, it routes you through parks and residential areas, avoiding high-pollution highways and busy roads.

## Key Features

- **Dual API Integration**: Combines data from WAQI (aqicn.org) and OpenAQ.org for the most comprehensive air quality coverage.
- **Intelligent Routing**: Uses a custom steering algorithm to nudge routes toward low-pollution zones.
- **Route Comparison**: Visual side-by-side comparison of standard vs. clean routes, including an "AQI Exposure Score" and calculated savings.
- **Travel Modes**: Specialized routing profiles for both walking and cycling.
- **Premium UI**: Modern dark theme with a glassmorphism design for a professional and sleek look.

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
