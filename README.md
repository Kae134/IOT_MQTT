# IoT Weather Monitor

Real-time weather monitoring dashboard for ESP32 devices.

## What it does

Displays live temperature, humidity, and battery data from ESP32 sensors in a terminal-style web interface.

```
ESP32 → MQTT → Bridge → WebSocket → Browser
```

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d --build
```

Open http://localhost:5173

### Local Development

```bash
# Terminal 1: Bridge
cd bridge
npm install
node server.js

# Terminal 2: Front
cd front
npm install
npm run dev
```

Open http://localhost:5173

## Stop

```bash
docker-compose down
```

## Configuration

Edit `.env` file:

```env
MQTT_BROKER_URL=mqtt://your-broker-url:1883
MQTT_TOPIC_PATTERN=classroom/+/telemetry

WS_PORT=8080
FRONT_PORT=3000
```

Edit device locations in `front/src/routes/+page.svelte`:

```typescript
const LOCATIONS: Record<string, { name: string; country: string }> = {
  'esp32-01': { name: 'Paris', country: 'France' },
  'esp32-02': { name: 'Tokyo', country: 'Japan' },
  // ... add your devices
};
```

## Project Structure

```
iot-live-dashboard/
├── bridge/          # MQTT → WebSocket bridge
├── front/           # Svelte web interface
├── contracts/       # Message format docs
└── docker-compose.yml
```

## Features

- Real-time monitoring of 7 stations
- Status indicators (online/stale/offline)
- Statistics panel with averages
- Filter by location
- Terminal-style interface (black/green)

## Troubleshooting

### Bridge not connecting

```bash
docker-compose logs bridge
```

Should see: `[MQTT] Connected to broker`

### Front not receiving data

- Open browser console (F12)
- Should see: `[WS] Connected`
- Check bridge is running: `docker-compose ps`

## Tech Stack

- Bridge: Node.js + MQTT.js + ws
- Front: SvelteKit + TypeScript
- Infra: Docker

## Status Detection

- **Green** (online): Data < 5s ago
- **Orange** (stale): Data < 30s ago  
- **Red** (offline): No data > 30s

Made with love by Kae