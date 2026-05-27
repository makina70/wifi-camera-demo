# Wi-Fi Sensing Camera Demo

Wi-Fi CSI sensing results are used to control whether a camera feed is displayed. This repository contains the UI container for the exhibition demo. The UI is intended to run on the display Mac mini so the browser can access the camera connected directly to that machine.

## Goal

The demo shows a simple privacy-aware flow:

- `normal`: no motion/anomaly detected, camera display stays OFF.
- `abnormal`: motion/anomaly detected, camera display turns ON.

The current app can run with mock detection results, but the intended exhibition setup uses real processed CSI data from a GMKtec computer and an ML/API container running on a server Mac mini.

## System Overview

```text
Router / antennas
      |
      v
GMKtec computer
  CSI capture and processing
      |
      v
Server Mac mini
  ML/API container: GET /latest
      |
      v
Display Mac mini
  UI container: http://localhost:3000
  directly connected camera
      |
      v
Exhibition display
```

## Repository Role

This repository owns only the UI side:

- React/TypeScript dashboard
- ML result polling
- camera ON/OFF display logic
- browser camera or camera stream URL display
- nginx proxy from `/api/ml/latest` to the ML API

The Wi-Fi sensing and machine learning code should live in a separate repository/container.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- lucide-react
- Docker + nginx for production serving

## Local Development

```sh
npm install
npm run dev
```

The development server runs the Vite app. In the UI, use `mock` mode for dummy data or switch to `ML API` mode and set the API URL manually.

## Docker Run

Build and run the UI container on the display Mac mini:

```sh
ML_API_BASE_URL=http://<server-mac-mini-ip>:8001 docker compose up --build
```

Then open this on the display Mac mini:

```text
http://localhost:3000
```

The browser should use `/api/ml/latest`. The UI container proxies that request to:

```text
${ML_API_BASE_URL}/latest
```

For same-machine testing, the default is:

```text
http://host.docker.internal:8001/latest
```

## ML API Contract

The minimum response expected by the UI is:

```json
{
  "status": "normal",
  "anomalyScore": 0.12
}
```

or:

```json
{
  "status": "abnormal",
  "anomalyScore": 0.91
}
```

See [docs/API.md](docs/API.md) for the recommended API contract.

## Deployment Plan

The intended exhibition setup is:

1. GMKtec captures/processes CSI data and sends it to the server Mac mini.
2. Server Mac mini runs the ML/API container and exposes `8001:8001`.
3. Display Mac mini runs this UI container and exposes `3000:80` locally.
4. Display Mac mini opens `http://localhost:3000` in the browser.
5. In the UI, choose `ML API接続` and use `/api/ml/latest`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Current Limitations

- CSI heatmap is currently dummy UI data.
- ML API integration currently reads only the latest status and score.
- Timestamp from the ML API is not yet displayed; the UI uses local fetch time.
- The project does not yet include the ML container implementation.
