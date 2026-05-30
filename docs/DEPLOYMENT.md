# Exhibition Deployment

The exhibition setup uses one GMKtec and one Mac mini.

## Machine Roles

| Machine | Role | Runs |
| --- | --- | --- |
| GMKtec | CSI capture and preprocessing | PicoScenes, GMKtec CSI agent |
| Mac mini | Detection and UI | ML API container, Web app container, browser, camera |

## Data Flow

```text
PicoScenes on GMKtec
  -> .csi file
  -> gmktec-csi-agent
  -> motionScore
  -> POST http://<mac-mini-ip>:8001/csi
  -> ML API on Mac mini
  -> GET /latest
  -> Web app on Mac mini
  -> browser display and camera ON/OFF
```

## Ports

| Service | Machine | Host Port | Purpose |
| --- | --- | --- | --- |
| ML API | Mac mini | 8001 | Receives CSI-derived motionScore and returns latest result |
| Web app | Mac mini | 3000 | Browser dashboard |

## 1. Start The ML API On The Mac Mini

```sh
git clone https://github.com/makina70/wifi-csi-anomaly-api.git
cd wifi-csi-anomaly-api
docker compose up -d --build
```

Confirm:

```sh
curl http://localhost:8001/health
curl http://localhost:8001/latest
```

The ML API uses the first 100 windows for empty-room calibration. Keep the room empty during this period.

## 2. Start The Web App On The Mac Mini

```sh
git clone https://github.com/makina70/wifi-camera-demo.git
cd wifi-camera-demo
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

UI settings:

```text
ML result source: ML API接続
API URL: /api/ml/latest
Camera input: ブラウザのカメラ
```

## 3. Start GMKtec CSI Sending

On the GMKtec:

```sh
git clone -b codex/gmktec-csi-agent https://github.com/makina70/PicoScenes-Python-Toolbox.git gmktec-csi-agent
cd gmktec-csi-agent
```

Start the agent container:

```sh
sudo env \
  RUN_PICOSCENES=false \
  FOLLOW_GROWING_FILES=true \
  STREAM_READ_MB=32 \
  MAX_CSI_DIR_GB=5 \
  API_URL=http://<mac-mini-ip>:8001/csi \
  docker compose -f docker-compose.gmktec.yml up -d --build
```

Start PicoScenes through the rotation wrapper:

```sh
MAX_ACTIVE_CSI_FILE_GB=1 scripts/run-picoscenes-rotating.sh
```

Do not run PicoScenes directly if you want active `.csi` rotation.

## Expected ML API Result

After calibration, `/latest` should return `normal` or `abnormal`:

```json
{
  "status": "normal",
  "anomalyScore": 0.08,
  "threshold": 0.4
}
```

```json
{
  "status": "abnormal",
  "anomalyScore": 0.62,
  "threshold": 0.4
}
```

The Web app turns the camera display on when `status` is `abnormal`.

## Checklist

- Mac mini ML API is running on `http://localhost:8001`.
- Mac mini Web app is running on `http://localhost:3000`.
- UI API URL is `/api/ml/latest`.
- Browser camera permission is granted.
- GMKtec sends to `http://<mac-mini-ip>:8001/csi`.
- GMKtec uses `scripts/run-picoscenes-rotating.sh` instead of direct PicoScenes startup.
- The room is empty during the ML API calibration period.

## Troubleshooting

If the UI shows an ML API error:

```sh
curl http://localhost:8001/latest
```

If GMKtec logs show no posted batches, check whether `.csi` files are growing too large or whether PicoScenes was started without the rotation wrapper.
