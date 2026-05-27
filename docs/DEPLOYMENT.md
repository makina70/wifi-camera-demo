# Exhibition Deployment

The exhibition setup uses two Mac minis plus a GMKtec computer.

## Machine Roles

| Machine | Role | Runs |
| --- | --- | --- |
| Display Mac mini | Browser and directly connected camera | UI container from this repository |
| Server Mac mini | Data/API server | ML/API container |
| GMKtec | Wi-Fi CSI capture and processing | CSI capture/processing program |

The display Mac mini runs the UI locally so the browser can open `http://localhost:3000` and access the camera connected directly to the display Mac mini.

## Data Flow

```text
Router / antennas
  -> GMKtec
  -> Server Mac mini ML/API container
  -> Display Mac mini UI container proxy
  -> Display Mac mini browser
  -> Exhibition display
```

## Target Ports

| Service | Machine | Container Port | Host Port | Purpose |
| --- | --- | --- | --- | --- |
| UI | Display Mac mini | 80 | 3000 | Browser dashboard |
| ML API | Server Mac mini | 8001 | 8001 | Latest detection result |

## Start the ML/API Container

On the server Mac mini, the ML repository should expose a compatible API on port `8001`.

Example shape:

```yaml
services:
  ml-api:
    build: .
    ports:
      - "8001:8001"
    restart: unless-stopped
```

The ML API must implement:

```text
GET /latest
```

See `docs/API.md` for the response contract.

Before starting the display UI, confirm the display Mac mini can reach the server Mac mini:

```sh
curl http://<server-mac-mini-ip>:8001/latest
```

## Start the UI Container

On the display Mac mini, run this repository and point the proxy at the server Mac mini:

```sh
ML_API_BASE_URL=http://<server-mac-mini-ip>:8001 docker compose up --build
```

Open this on the display Mac mini:

```text
http://localhost:3000
```

In the UI, choose:

- ML result source: `ML API接続`
- API URL: `/api/ml/latest`
- Camera input: `ブラウザのカメラ`

## How the Proxy Works

The browser calls only the local UI origin:

```text
http://localhost:3000/api/ml/latest
```

nginx inside the UI container forwards that request to:

```text
${ML_API_BASE_URL}/latest
```

For the exhibition setup, `ML_API_BASE_URL` should point to the server Mac mini:

```text
http://<server-mac-mini-ip>:8001
```

This keeps camera access local to the display Mac mini while still allowing the UI to read the ML result from the server Mac mini.

## Same-Machine Test Mode

If the UI and ML API are running on the same Mac for development, omit `ML_API_BASE_URL` and use the default:

```text
http://host.docker.internal:8001
```

Then start the UI with:

```sh
docker compose up --build
```

## Exhibition Checklist

- Display Mac mini opens `http://localhost:3000`.
- Browser camera permission is granted on the display Mac mini.
- `curl http://<server-mac-mini-ip>:8001/latest` works from the display Mac mini.
- UI API URL is `/api/ml/latest`.
- The UI is switched from mock mode to `ML API接続`.
- GMKtec is sending processed CSI data to the server Mac mini.
- The ML/API container returns `normal` and `abnormal` values in the expected format.

## Next Integration Tasks

- Replace the dummy CSI heatmap with values from the ML API.
- Display the ML container timestamp instead of local fetch time.
- Add a health endpoint such as `GET /health` to the ML API.
- Decide how GMKtec sends processed data to the ML/API container, for example `POST /csi`.
- Add basic uptime/restart logging for the exhibition environment.
