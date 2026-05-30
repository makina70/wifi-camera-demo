# ML API Contract

The Web app reads the latest detection result from the ML API container on the Mac mini.

## Endpoint Used By The Web App

The browser calls:

```text
GET /api/ml/latest
```

nginx inside this Web app container proxies it to:

```text
GET http://host.docker.internal:8001/latest
```

## Expected Active Response

```json
{
  "status": "normal",
  "anomalyScore": 0.08,
  "threshold": 0.4,
  "timestamp": "2026-05-30T06:00:00+00:00"
}
```

```json
{
  "status": "abnormal",
  "anomalyScore": 0.62,
  "threshold": 0.4,
  "timestamp": "2026-05-30T06:00:10+00:00"
}
```

## Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | yes | `normal` or `abnormal`. Japanese labels `正常` and `異常検知` are also accepted by the current UI. |
| `anomalyScore` | number | recommended | Motion evidence score from the ML API. It is not capped at `1.0`; values above `1.0` are possible. |
| `threshold` | number | optional | Current ML API status threshold. The current deployment uses `0.40`. |
| `timestamp` | string | optional | ISO 8601 timestamp from the ML API. The current UI displays local fetch time. |
| `reconstructionError` | number | optional | Compatibility field from the ML API. In the current ML API, this is not autoencoder reconstruction error. |
| `featureValues` | object | optional | ML API diagnostics such as `diff_mad`. Not required by the UI. |
| `featureRatios` | object | optional | ML API diagnostics. Not required by the UI. |

## Calibration State

During ML API startup calibration, `/latest` can return:

```json
{
  "status": "warming_up",
  "anomalyScore": 0.0,
  "threshold": 0.4,
  "calibrationWindows": 12,
  "calibrationRequiredWindows": 100
}
```

The current UI is designed for the active `normal` / `abnormal` state after calibration. For exhibition operation, start the ML API, keep the room empty until calibration finishes, then switch the UI to ML API mode.

## Error Handling

The UI shows an ML API error when:

- the request fails
- the response is non-2xx
- the response does not contain a supported `status`

## CORS

For the Mac mini deployment, use `/api/ml/latest` and let nginx proxy to the ML API. This avoids browser CORS issues.
