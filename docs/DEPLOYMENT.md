# Mac Mini Deployment

This project is designed to run on one Mac mini with two containers:

1. UI container from this repository.
2. ML container from the Wi-Fi sensing machine learning project.

## Target Ports

| Service | Container Port | Host Port | Purpose |
| --- | --- | --- | --- |
| UI | 80 | 3000 | Browser dashboard |
| ML API | 8001 | 8001 | Latest detection result |

## Recommended Runtime Layout

```text
Mac mini
  docker network
    ui container
      nginx
      React static files
      /api/ml/latest proxy
    ml-api container
      CSI ingestion
      ML inference
      GET /latest
```

The current `nginx.conf` proxies the UI API path to:

```text
http://host.docker.internal:8001/latest
```

That means the ML container should publish its API to the Mac mini host on port `8001`.

## Start the UI Container

From this repository:

```sh
docker compose up --build
```

Open:

```text
http://localhost:3000
```

From another machine on the same network, use:

```text
http://<mac-mini-ip>:3000
```

## Start the ML Container

The ML repository should expose a compatible API on port `8001`.

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

## UI Configuration

In the UI, choose:

- ML result source: `ML API接続`
- API URL: `/api/ml/latest`

For camera input, choose one of:

- `ブラウザのカメラ`: a camera directly accessible from the browser.
- `カメラURL`: an IP camera, MJPEG stream, image URL, or video URL.

## Why Proxy Through nginx

Using `/api/ml/latest` keeps the browser URL stable. The browser talks only to the UI origin, and nginx forwards the request to the ML service. This avoids most CORS problems and makes the UI independent from the ML container's internal location.

## Next Integration Tasks

- Replace the dummy CSI heatmap with values from the ML API.
- Display the ML container timestamp instead of local fetch time.
- Add a health endpoint such as `GET /health` to the ML API.
- Decide whether the two containers should be managed by one parent Compose file or separate Compose files.
- Add basic uptime/restart logging for the Mac mini demo environment.
