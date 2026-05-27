import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  PlugZap,
  Radio,
  Wifi,
} from "lucide-react";

type DetectionStatus = "normal" | "abnormal";
type AppMode = "mock" | "api";
type CameraMode = "browser" | "streamUrl";

type MlResult = {
  status: DetectionStatus;
  anomalyScore: number;
  timestamp: string;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

function Button({ variant = "default", className = "", ...props }: ButtonProps) {
  const base =
    "rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-50";

  const style =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
      : "bg-slate-900 text-white hover:bg-slate-700";

  return <button className={`${base} ${style} ${className}`} {...props} />;
}

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`border border-slate-200 bg-white ${className}`}>{children}</div>;
}

function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

const statusLabel: Record<DetectionStatus, string> = {
  normal: "正常",
  abnormal: "異常検知",
};

const statusDescription: Record<DetectionStatus, string> = {
  normal: "人の動きは検知されていません。カメラはOFFです。",
  abnormal: "人の動きが検知されました。カメラをONにします。",
};

function nowText() {
  return new Date().toLocaleTimeString("ja-JP", { hour12: false });
}

function generateMockResult(previous: DetectionStatus): MlResult {
  const shouldContinueAbnormal = previous === "abnormal" && Math.random() > 0.45;

  const nextStatus: DetectionStatus = shouldContinueAbnormal
    ? "abnormal"
    : Math.random() > 0.68
      ? "abnormal"
      : "normal";

  const anomalyScore =
    nextStatus === "abnormal"
      ? 0.75 + Math.random() * 0.22
      : 0.04 + Math.random() * 0.24;

  return {
    status: nextStatus,
    anomalyScore: Number(anomalyScore.toFixed(2)),
    timestamp: nowText(),
  };
}

function normalizeMlResponse(data: unknown): MlResult | null {
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;

  const rawStatus = record.status ?? record.state ?? record.label;

  const status: DetectionStatus | null =
    rawStatus === "abnormal" || rawStatus === "異常検知"
      ? "abnormal"
      : rawStatus === "normal" || rawStatus === "正常"
        ? "normal"
        : null;

  if (!status) return null;

  const scoreRaw = record.anomaly_score ?? record.anomalyScore ?? record.score ?? 0;
  const score = Number(scoreRaw);

  return {
    status,
    anomalyScore: Number(Number.isFinite(score) ? score.toFixed(2) : 0),
    timestamp: nowText(),
  };
}

function StatusPanel({ result }: { result: MlResult }) {
  const isAbnormal = result.status === "abnormal";

  return (
    <motion.div
      key={result.status}
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`rounded-3xl border p-6 shadow-sm ${
        isAbnormal ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {isAbnormal ? (
            <AlertTriangle className="h-14 w-14 text-red-600" />
          ) : (
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          )}

          <div>
            <div
              className={`text-5xl font-black tracking-tight ${
                isAbnormal ? "text-red-700" : "text-emerald-700"
              }`}
            >
              {statusLabel[result.status]}
            </div>
            <div className="mt-2 text-slate-600">{statusDescription[result.status]}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:w-72">
          <div className="rounded-2xl bg-white/70 p-4">
            <div className="text-xs font-semibold text-slate-500">異常スコア</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {result.anomalyScore}
            </div>
          </div>

          <div className="rounded-2xl bg-white/70 p-4">
            <div className="text-xs font-semibold text-slate-500">更新時刻</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {result.timestamp}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BrowserCamera({ enabled }: { enabled: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  async function loadCameraDevices() {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((device) => device.kind === "videoinput");

      setDevices(videoDevices);

      if (!selectedDeviceId && videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch {
      setError("カメラ一覧を取得できません。ブラウザのカメラ権限を確認してください。");
    }
  }

  useEffect(() => {
    loadCameraDevices();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;

    async function startCamera() {
      if (!enabled) return;

      setError("");

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
          audio: false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        await loadCameraDevices();
      } catch {
        setError(
          "Macに接続したカメラを起動できません。接続、ブラウザ権限、macOSのカメラ権限を確認してください。"
        );
      }
    }

    startCamera();

    return () => {
      mounted = false;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [enabled, selectedDeviceId]);

  if (!enabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <CameraOff className="mb-4 h-16 w-16" />
        <div className="text-2xl font-bold">Camera OFF</div>
        <div className="mt-2 text-sm">正常状態のためカメラは停止中です</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <AlertTriangle className="mb-4 h-16 w-16 text-red-300" />
        <div className="text-xl font-bold">カメラ起動エラー</div>
        <div className="mt-2 text-sm text-slate-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

      <div className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold tracking-wide text-white">
        LIVE
      </div>

      <div className="absolute right-4 top-4 max-w-xs rounded-2xl bg-black/60 p-3 text-white backdrop-blur">
        <div className="mb-2 text-xs font-bold">Macに接続されたカメラ</div>

        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900"
        >
          {devices.length === 0 ? (
            <option value="">カメラを検出中</option>
          ) : (
            devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `カメラ ${index + 1}`}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}

function StreamUrlCamera({
  enabled,
  streamUrl,
}: {
  enabled: boolean;
  streamUrl: string;
}) {
  if (!enabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <CameraOff className="mb-4 h-16 w-16" />
        <div className="text-2xl font-bold">Camera OFF</div>
        <div className="mt-2 text-sm">正常状態のため映像を非表示にしています</div>
      </div>
    );
  }

  if (!streamUrl.trim()) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <Camera className="mb-4 h-16 w-16" />
        <div className="text-xl font-bold">カメラURL未設定</div>
        <div className="mt-2 text-sm text-slate-300">
          下の設定欄にカメラ映像URLを入力してください。
        </div>
      </div>
    );
  }

  const lower = streamUrl.toLowerCase();

  const isVideoFile =
    lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg");

  const isImageStream =
    lower.includes("mjpg") ||
    lower.includes("mjpeg") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png");

  return (
    <div className="relative h-full w-full bg-black">
      {isVideoFile ? (
        <video
          src={streamUrl}
          autoPlay
          playsInline
          muted
          controls
          className="h-full w-full object-cover"
        />
      ) : isImageStream ? (
        <img src={streamUrl} alt="camera stream" className="h-full w-full object-cover" />
      ) : (
        <iframe title="camera stream" src={streamUrl} className="h-full w-full border-0" />
      )}

      <div className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold tracking-wide text-white">
        LIVE
      </div>
    </div>
  );
}

function CameraPanel({
  enabled,
  cameraMode,
  streamUrl,
}: {
  enabled: boolean;
  cameraMode: CameraMode;
  streamUrl: string;
}) {
  return (
    <Card className="overflow-hidden rounded-3xl shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            {enabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            カメラ
          </div>

          <div
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              enabled ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {enabled ? "ON" : "OFF"}
          </div>
        </div>

        <div className="h-[420px] bg-slate-950">
          {cameraMode === "browser" ? (
            <BrowserCamera enabled={enabled} />
          ) : (
            <StreamUrlCamera enabled={enabled} streamUrl={streamUrl} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CsiMockPanel({ status }: { status: DetectionStatus }) {
  const cells = useMemo(() => {
    return Array.from({ length: 144 }, (_, i) => {
      const base = status === "abnormal" ? 70 : 22;
      const value = Math.min(100, Math.max(5, base + Math.random() * 38 - 12));

      return { id: i, value };
    });
  }, [status]);

  return (
    <Card className="rounded-3xl shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Wifi className="h-5 w-5" />
          CSI表示エリア
        </div>

        <div
          className="grid gap-1 rounded-2xl bg-slate-100 p-3"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {cells.map((cell) => (
            <div
              key={cell.id}
              className="h-4 rounded-sm"
              style={{
                backgroundColor:
                  status === "abnormal"
                    ? `rgba(239, 68, 68, ${cell.value / 100})`
                    : `rgba(16, 185, 129, ${cell.value / 100})`,
              }}
            />
          ))}
        </div>

        <div className="mt-3 text-sm text-slate-500">
          今はダミー表示です。あとで機械学習コンテナから受け取ったCSI特徴量や異常スコアに差し替えます。
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPanel({
  appMode,
  setAppMode,
  apiUrl,
  setApiUrl,
  cameraMode,
  setCameraMode,
  streamUrl,
  setStreamUrl,
  apiError,
}: {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  streamUrl: string;
  setStreamUrl: (url: string) => void;
  apiError: string;
}) {
  return (
    <Card className="rounded-3xl shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <PlugZap className="h-5 w-5" />
          接続設定
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-600">
            機械学習結果の取得
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={appMode === "mock" ? "default" : "outline"}
              onClick={() => setAppMode("mock")}
            >
              ダミー結果
            </Button>

            <Button
              variant={appMode === "api" ? "default" : "outline"}
              onClick={() => setAppMode("api")}
            >
              ML API接続
            </Button>
          </div>

          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="例: /api/ml/latest または http://研究室MacminiのIP:8001/latest"
            className="mt-3 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />

          <div className="mt-2 text-xs text-slate-500">
            ML APIは {"{ \"status\": \"normal\" }"} または{" "}
            {"{ \"status\": \"abnormal\" }"} を返す想定です。
          </div>

          {apiError && (
            <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiError}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-600">カメラ入力</div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={cameraMode === "browser" ? "default" : "outline"}
              onClick={() => setCameraMode("browser")}
            >
              ブラウザのカメラ
            </Button>

            <Button
              variant={cameraMode === "streamUrl" ? "default" : "outline"}
              onClick={() => setCameraMode("streamUrl")}
            >
              カメラURL
            </Button>
          </div>

          <input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="例: http://192.168.1.30:8080/video"
            className="mt-3 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />

          <div className="mt-2 text-xs text-slate-500">
            USBカメラなら「ブラウザのカメラ」、IPカメラやMJPEG配信なら「カメラURL」を使います。
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>("mock");
  const [cameraMode, setCameraMode] = useState<CameraMode>("browser");

  const [apiUrl, setApiUrl] = useState("/api/ml/latest");
  const [streamUrl, setStreamUrl] = useState("http://localhost:8080/video");

  const [apiError, setApiError] = useState("");

  const [mlResult, setMlResult] = useState<MlResult>({
    status: "normal",
    anomalyScore: 0.12,
    timestamp: nowText(),
  });

  const cameraEnabled = mlResult.status === "abnormal";

  useEffect(() => {
    if (appMode !== "mock") return;

    setApiError("");

    const timer = window.setInterval(() => {
      setMlResult((prev) => generateMockResult(prev.status));
    }, 3000);

    return () => window.clearInterval(timer);
  }, [appMode]);

  useEffect(() => {
    if (appMode !== "api") return;

    let cancelled = false;

    async function fetchMlResult() {
      try {
        const response = await fetch(apiUrl, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const normalized = normalizeMlResponse(data);

        if (!normalized) {
          throw new Error("Invalid ML response");
        }

        if (!cancelled) {
          setMlResult(normalized);
          setApiError("");
        }
      } catch {
        if (!cancelled) {
          setApiError(
            "ML APIから結果を取得できません。URL、CORS、レスポンス形式を確認してください。"
          );
        }
      }
    }

    fetchMlResult();

    const timer = window.setInterval(fetchMlResult, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [appMode, apiUrl]);

  const forceNormal = () => {
    setAppMode("mock");
    setMlResult({
      status: "normal",
      anomalyScore: 0.12,
      timestamp: nowText(),
    });
  };

  const forceAbnormal = () => {
    setAppMode("mock");
    setMlResult({
      status: "abnormal",
      anomalyScore: 0.91,
      timestamp: nowText(),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Radio className="h-4 w-4" />
              Wi-Fi Sensing Camera Demo
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              CSI異常検知によるカメラON/OFF制御
            </h1>

            <p className="mt-2 text-slate-600">
              機械学習コンテナの判定が「異常検知」ならカメラON、「正常」ならカメラOFFにします。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={forceNormal}>
              正常にする
            </Button>

            <Button onClick={forceAbnormal}>異常検知にする</Button>
          </div>
        </header>

        <StatusPanel result={mlResult} />

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <CameraPanel
            enabled={cameraEnabled}
            cameraMode={cameraMode}
            streamUrl={streamUrl}
          />

          <div className="space-y-6">
            <Card className="rounded-3xl shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
                  <Activity className="h-5 w-5" />
                  現在の制御状態
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-500">ML判定</div>
                    <div className="mt-1 text-2xl font-bold">
                      {statusLabel[mlResult.status]}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-500">カメラ</div>
                    <div className="mt-1 text-2xl font-bold">
                      {cameraEnabled ? "ON" : "OFF"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-500">異常スコア</div>
                    <div className="mt-1 text-2xl font-bold">
                      {mlResult.anomalyScore}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4">
                    <div className="text-sm text-slate-500">モード</div>
                    <div className="mt-1 text-2xl font-bold">
                      {appMode === "mock" ? "Mock" : "API"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SettingsPanel
              appMode={appMode}
              setAppMode={setAppMode}
              apiUrl={apiUrl}
              setApiUrl={setApiUrl}
              cameraMode={cameraMode}
              setCameraMode={setCameraMode}
              streamUrl={streamUrl}
              setStreamUrl={setStreamUrl}
              apiError={apiError}
            />
          </div>
        </div>

        <CsiMockPanel status={mlResult.status} />
      </div>
    </div>
  );
}
