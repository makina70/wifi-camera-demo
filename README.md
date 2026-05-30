# Wi-Fi Sensing Camera Demo

This repository contains the Web app container for the Wi-Fi CSI exhibition system.

The Web app runs on the Mac mini. It polls the local ML API, shows the latest normal/abnormal result, and turns the camera display on only when motion is detected.

## Role

```text
GMKtec
  PicoScenes -> .csi -> motionScore -> POST /csi

Mac mini
  ML API container -> GET /latest result
  Web app container -> dashboard and camera display
```

This repository owns only the Web app part:

- React/TypeScript dashboard
- ML result polling
- normal/abnormal display
- camera ON/OFF display logic
- nginx proxy from `/api/ml/latest` to the local ML API container

The ML API repository is:

```text
https://github.com/makina70/wifi-csi-anomaly-api
```

The GMKtec CSI agent is managed in:

```text
https://github.com/makina70/PicoScenes-Python-Toolbox
branch: codex/gmktec-csi-agent
```

## Current Behavior

The UI reads:

```text
GET /api/ml/latest
```

The nginx container proxies that request to:

```text
http://host.docker.internal:8001/latest
```

The ML API currently returns:

```json
{
  "status": "normal",
  "anomalyScore": 0.08,
  "threshold": 0.4
}
```

or:

```json
{
  "status": "abnormal",
  "anomalyScore": 0.62,
  "threshold": 0.4
}
```

When `status` is `abnormal`, the Web app turns the camera display on.

When `status` is `normal`, the camera display stays off.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- lucide-react
- Docker
- nginx

## Local Development

```sh
npm install
npm run dev
```

For local UI-only work, use mock mode in the app.

For real ML API integration, run `wifi-csi-anomaly-api` on the same Mac mini and use:

```text
/api/ml/latest
```

## Docker Run On The Mac Mini

Start the ML API first:

```sh
cd ../wifi-csi-anomaly-api
docker compose up -d --build
```

Then start this Web app:

```sh
cd ../wifi-camera-demo
docker compose up -d --build
```

Open on the Mac mini:

```text
http://localhost:3000
```

In the Web app, use:

```text
ML API接続
API URL: /api/ml/latest
Camera input: ブラウザのカメラ
```

## Docker Settings

`docker-compose.yml` exposes the Web app on port `3000`.

```yaml
ports:
  - "3000:80"
```

The default ML API target is:

```yaml
ML_API_BASE_URL: http://host.docker.internal:8001
```

If the ML API is moved to another machine, override it:

```sh
ML_API_BASE_URL=http://<ml-api-host>:8001 docker compose up -d --build
```

## Exhibition Flow

1. GMKtec captures CSI with PicoScenes.
2. GMKtec CSI agent converts CSI into `motionScore`.
3. GMKtec posts `motionScore` to the ML API on the Mac mini.
4. ML API computes `anomalyScore` and `status`.
5. Web app polls `/api/ml/latest`.
6. Web app displays normal/abnormal and controls the camera display.

## Update From GitHub

On the Mac mini:

```sh
git pull
docker compose down
docker compose up -d --build
```

## Notes

- The Web app does not perform CSI processing.
- The Web app does not perform anomaly detection.
- The Web app only displays the latest result returned by the ML API.
- The CSI heatmap panel is still a visual placeholder.
- During ML API calibration, `/latest` may return `warming_up`; the current UI is intended for the active `normal` / `abnormal` state after calibration.
