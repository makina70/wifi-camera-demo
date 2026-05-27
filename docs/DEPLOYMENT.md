# Exhibition Deployment

The exhibition setup uses one Mac mini plus a GMKtec computer.

## Machine Roles

| Machine | Role | Runs |
| --- | --- | --- |
| Exhibition Mac mini | Browser, directly connected camera, UI server, ML/API server | UI container and ML/API container |
| GMKtec | Wi-Fi CSI capture and preprocessing | CSI capture/preprocessing program |

The exhibition Mac mini runs the UI locally so the browser can open `http://localhost:3000` and access the camera connected directly to that Mac mini.

## Data Flow

```text
Router / antennas
  -> GMKtec
  -> Exhibition Mac mini ML/API container
  -> Exhibition Mac mini UI container proxy
  -> Exhibition Mac mini browser
  -> Exhibition display
```

## Target Ports

| Service | Machine | Container Port | Host Port | Purpose |
| --- | --- | --- | --- | --- |
| UI | Exhibition Mac mini | 80 | 3000 | Browser dashboard |
| ML API | Exhibition Mac mini | 8001 | 8001 | CSI input and latest detection result |

## Start the ML/API Container

On the exhibition Mac mini, clone and run the ML/API repository:

```sh
git clone https://github.com/makina70/wifi-csi-anomaly-api.git
cd wifi-csi-anomaly-api
docker compose up --build
```

The ML/API must implement:

```text
POST /csi
GET /latest
GET /health
```

Confirm it is running:

```sh
curl http://localhost:8001/health
curl http://localhost:8001/latest
```

Before CSI samples arrive, `/latest` returns `warming_up`. After 500 samples are buffered, it returns `normal` or `abnormal`.

## Start the UI Container

In another terminal on the same Mac mini, clone and run this repository:

```sh
git clone https://github.com/makina70/wifi-camera-demo.git
cd wifi-camera-demo
docker compose up --build
```

Open this on the same Mac mini:

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

nginx inside the UI container forwards that request to the ML/API container through the Mac host:

```text
http://host.docker.internal:8001/latest
```

This keeps camera access local to the exhibition Mac mini while allowing the UI container to read the ML result from the ML/API container.

## GMKtec Input

GMKtec should send preprocessed CSI values to:

```text
POST http://<exhibition-mac-mini-ip>:8001/csi
```

Expected JSON shape:

```json
{
  "samplingRateHz": 100,
  "timestamp": "2026-05-27T16:30:00+09:00",
  "pc1PhaseVariation": [-140.72, 140.5, 1.03]
}
```

Recommended chunk size is 100 samples per request, about 1 second at 100 Hz.

## Simulated CSI Test

If GMKtec sending is not ready, use the simulator in `wifi-csi-anomaly-api`:

```sh
PYTHONPATH=src python3 -m csi_lstm_ae.simulate_stream \
  --data data/ex1_dataset.json \
  --url http://localhost:8001/csi \
  --chunk-size 100 \
  --sleep 1
```

Then the UI should move from `warming_up` to `normal` and later `abnormal` as the sample dataset reaches its abnormal half.

## Exhibition Checklist

- Exhibition Mac mini opens `http://localhost:3000`.
- Browser camera permission is granted on the exhibition Mac mini.
- `curl http://localhost:8001/health` works on the exhibition Mac mini.
- `curl http://localhost:8001/latest` works on the exhibition Mac mini.
- UI API URL is `/api/ml/latest`.
- The UI is switched from mock mode to `ML API接続`.
- GMKtec is sending processed CSI data to `http://<exhibition-mac-mini-ip>:8001/csi`.
- The ML/API container returns `normal` and `abnormal` values in the expected format.

## Next Integration Tasks

- Show `warming_up` as a dedicated UI state.
- Replace the dummy CSI heatmap with values from the ML API if needed.
- Display model diagnostics such as reconstruction error and threshold if useful for the exhibition.
- Add basic uptime/restart logging for the exhibition environment.
