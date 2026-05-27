# ML API Contract

The UI reads the latest Wi-Fi sensing result from the ML container. Keep this API small and stable so the UI and ML implementation can evolve independently.

## Endpoint

```text
GET /latest
```

Recommended local URL during the Mac mini deployment:

```text
http://localhost:8001/latest
```

The UI container proxies this through nginx:

```text
GET /api/ml/latest
```

## Minimum Response

```json
{
  "status": "normal",
  "anomalyScore": 0.12
}
```

```json
{
  "status": "abnormal",
  "anomalyScore": 0.91
}
```

## Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | yes | `normal` or `abnormal`. Japanese labels `正常` and `異常検知` are also accepted by the current UI. |
| `anomalyScore` | number | recommended | Score from 0.0 to 1.0. The UI also accepts `anomaly_score` and `score`. |
| `timestamp` | string | optional | ISO 8601 timestamp from the ML container. Not yet displayed by the current UI. |
| `csi` | object | optional | CSI feature data for future heatmap replacement. |

## Recommended Full Response

```json
{
  "status": "abnormal",
  "anomalyScore": 0.91,
  "timestamp": "2026-05-27T10:30:00+09:00",
  "source": "wifi-sensing-ml",
  "csi": {
    "shape": [6, 24],
    "values": [0.12, 0.18, 0.31]
  }
}
```

## Error Handling

The ML container should return non-2xx responses only when the result cannot be produced.

Recommended errors:

```json
{
  "error": "CSI data is not available"
}
```

```json
{
  "error": "Model is not ready"
}
```

The UI currently shows a generic ML API error when fetch, CORS, HTTP status, or response validation fails.

## CORS

If the browser calls the ML API directly, the ML container must allow CORS from the UI origin. If the UI calls `/api/ml/latest`, nginx proxies the request and CORS is usually unnecessary.

Recommended approach for the Mac mini setup: use `/api/ml/latest` from the UI and let nginx proxy to the ML API.
