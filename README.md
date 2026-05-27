# Wi-Fi Sensing Camera Demo

Wi-Fi CSI sensing results are used to control whether a camera feed is displayed. This repository contains the UI container for the demo. A separate ML container is expected to collect/process CSI data and expose the latest detection result through an HTTP API.

## Goal

The demo shows a simple privacy-aware flow:

- `normal`: no motion/anomaly detected, camera display stays OFF.
- `abnormal`: motion/anomaly detected, camera display turns ON.

The current app can run with mock detection results, but the intended production-like setup is a two-container deployment on one Mac mini.

## System Overview

```text
Wi-Fi CSI source
      |
      v
ML container -> HTTP API (/latest) -> UI container -> browser dashboard
                                           |
                                           v
                                  camera ON/OFF display
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

Build and run the UI container:

```sh
docker compose up --build
```

Then open:

```text
http://localhost:3000
```

The default nginx config proxies:

```text
/api/ml/latest -> http://host.docker.internal:8001/latest
```

So the ML API should expose port `8001` on the Mac mini host.

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

The intended Mac mini setup is:

1. Run the ML container and expose `8001:8001`.
2. Run this UI container and expose `3000:80`.
3. Open `http://<mac-mini-ip>:3000` from a browser.
4. Switch the UI to `ML API` mode and use `/api/ml/latest`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details and options.

## Current Limitations

- CSI heatmap is currently dummy UI data.
- ML API integration currently reads only the latest status and score.
- Timestamp from the ML API is not yet displayed; the UI uses local fetch time.
- The project does not yet include the ML container implementation.
