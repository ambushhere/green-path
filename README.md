# Safe Path 🌿 — Breathe Easy, Move Smart

![Safe Path Concept](./safe_path_concept.png)

Safe Path is a web application for pedestrians and cyclists that helps find the cleanest air route between two points. By analyzing real-time PM2.5 concentrations, it routes you through parks and residential areas, avoiding high-pollution highways and busy roads.

## Key Features

- **Dual API Integration**: Combines data from WAQI (aqicn.org) and OpenAQ.org for the most comprehensive air quality coverage.
- **Intelligent Routing**: Uses a custom steering algorithm to nudge routes toward low-pollution zones.
- **Route Comparison**: Visual side-by-side comparison of standard vs. clean routes, including an "AQI Exposure Score" and calculated savings.
- **Travel Modes**: Specialized routing profiles for both walking and cycling.
- **Premium UI**: Modern dark theme with a glassmorphism design for a professional and sleek look.

## Tech Stack

- **Mapping**: Leaflet.js + OpenStreetMap.
- **Routing**: OSRM (Open Source Routing Machine).
- **Geocoding**: Nominatim (OpenStreetMap).
- **Air Quality**: WAQI API & OpenAQ API.

## How to Run

Due to browser security policies (CORS), the application must be served through a local web server (cannot be opened directly as a `file://`):

1. **Using Python**: Run `python -m http.server 8000` in the project directory.
2. **Using VS Code**: Use the "Live Server" extension.

Once running, access the app at `http://localhost:8000`.

---
*Created with care for people with allergies, asthma, and parents with strollers.*
