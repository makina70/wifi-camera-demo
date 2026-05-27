# Wi-Fi Sensing Camera Demo

Wi-Fi CSI sensing results are used to control whether a camera feed is displayed. This repository contains the UI container for the exhibition demo. The UI runs on the exhibition Mac mini so the browser can access the camera connected directly to that machine.

## Goal

The demo shows a simple privacy-aware flow:

- `normal`: no motion/anomaly detected, camera display stays OFF.
- `abnormal`: motion/anomaly detected, camera display turns ON.

The current app can run with mock detection results. In the exhibition setup, a GMKtec computer sends preprocessed CSI data to the ML/API container running on the same Mac mini as this UI container.

## System Overview

```text
Router / antennas
      |
      v
GMKtec computer
  CSI capture and preprocessing
      |
      v
Exhibition Mac mini
  ML/API container: POST /csi, GET /latest
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
- nginx proxy from `/api/ml/latest` to the local ML/API container

The Wi-Fi sensing and anomaly detection API lives in `makina70/wifi-csi-anomaly-api`.

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

First, start the ML/API container from `wifi-csi-anomaly-api` on the same Mac mini. It should expose:

```text
http://localhost:8001/latest
```

Then build and run the UI container:

```sh
docker compose up --build
```

Open this on the same Mac mini:

```text
http://localhost:3000
```

The browser should use `/api/ml/latest`. The UI container proxies that request to:

```text
http://host.docker.internal:8001/latest
```

If the ML/API is moved to another machine later, override the proxy target:

```sh
ML_API_BASE_URL=http://<ml-api-host>:8001 docker compose up --build
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

The current ML/API may also return fields such as `reconstructionError`, `threshold`, `samplesBuffered`, and `windowSize`. The UI can ignore those unless it is extended to display model diagnostics.

See [docs/API.md](docs/API.md) for the recommended API contract.

## Deployment Plan

The intended exhibition setup is:

1. GMKtec captures/preprocesses CSI data and sends it to the exhibition Mac mini.
2. Exhibition Mac mini runs the ML/API container and exposes `8001:8001`.
3. Exhibition Mac mini runs this UI container and exposes `3000:80`.
4. Exhibition Mac mini opens `http://localhost:3000` in the browser.
5. In the UI, choose `ML API接続` and use `/api/ml/latest`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Current Limitations

- CSI heatmap is currently dummy UI data.
- ML API integration currently reads only the latest status and score.
- Timestamp from the ML API is not yet displayed; the UI uses local fetch time.
- `warming_up` from the ML/API is not yet shown as a dedicated UI state.
