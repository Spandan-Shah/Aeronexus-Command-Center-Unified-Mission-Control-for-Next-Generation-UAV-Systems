import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Flame,
  Loader2,
  PlayCircle,
  Waves,
} from "lucide-react";
import { Panel } from "../common/Panel";
import type { CameraVideoSource } from "./VideoSourceLibrary";

export type CameraOpenCvAnalysis = {
  source_id: string;
  title: string;
  category: string;
  analyzed_at: string;
  frames: {
    source_fps: number;
    total_video_frames: number;
    sampled_frames: number;
    sample_every: number;
  };
  metrics: {
    brightness: number;
    contrast: number;
    fire_score: number;
    smoke_score: number;
    edge_density: number;
    motion_score: number;
  };
  detections: {
    person: boolean;
    fire: boolean;
    smoke: boolean;
    confidence: number;
  };
  risk: "low" | "medium" | "high" | "critical";
  events: {
    type: string;
    severity: string;
    confidence: number;
    title: string;
    message: string;
    created_at: string;
  }[];
};

type AnalyzeResponse = {
  ok: boolean;
  analysis?: CameraOpenCvAnalysis;
  error?: string;
};

type OpenCvAnalysisPanelProps = {
  selectedVideo: CameraVideoSource;
  analysis: CameraOpenCvAnalysis | null;
  onAnalysisComplete: (analysis: CameraOpenCvAnalysis) => void;
};

const API_BASE_URL = "http://127.0.0.1:8000";

function getRiskClass(risk?: string) {
  if (risk === "critical") return "text-(--critical)";
  if (risk === "high") return "text-(--caution)";
  if (risk === "medium") return "text-(--info)";
  return "text-(--nominal)";
}

function getRiskBorderClass(risk?: string) {
  if (risk === "critical") {
    return "border-(--critical) bg-[rgba(255,77,77,0.08)]";
  }

  if (risk === "high") {
    return "border-(--caution) bg-[rgba(246,178,60,0.08)]";
  }

  if (risk === "medium") {
    return "border-(--info) bg-[rgba(41,211,255,0.08)]";
  }

  return "border-(--nominal) bg-[rgba(73,229,143,0.08)]";
}

function MetricBox({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded border border-(--border) bg-[#07111f] p-3">
      <div className="text-hud text-[10px] text-(--muted)">{label}</div>
      <div className="mt-1 text-hud text-sm text-(--foreground)">
        {value}
        {suffix}
      </div>
    </div>
  );
}

export function OpenCvAnalysisPanel({
  selectedVideo,
  analysis,
  onAnalysisComplete,
}: OpenCvAnalysisPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = Boolean(selectedVideo.src);

  async function analyzeSelectedVideo() {
    if (!canAnalyze) {
      setError("Select a real MP4 video source first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/camera-ai/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_id: selectedVideo.id,
          sample_every: 8,
          max_frames: 90,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenCV API failed with status ${response.status}`);
      }

      const data = (await response.json()) as AnalyzeResponse;

      if (!data.ok || !data.analysis) {
        throw new Error(data.error ?? "OpenCV analysis failed");
      }

      onAnalysisComplete(data.analysis);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze video"
      );
    } finally {
      setLoading(false);
    }
  }

  const confidence = Math.round((analysis?.detections.confidence ?? 0) * 100);

  return (
    <Panel
      title="OpenCV Video Analytics"
      right={
        <span className={`text-hud text-[10px] uppercase ${getRiskClass(analysis?.risk)}`}>
          {analysis?.risk ?? "idle"}
        </span>
      }
    >
      <div className="space-y-3 p-3">
        <div className="rounded border border-(--border) bg-[#07111f] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-hud text-[10px] text-(--muted)">
                Selected Video
              </div>
              <div className="mt-1 text-hud text-xs text-(--foreground)">
                {selectedVideo.title}
              </div>
              <div className="mt-1 text-[10px] text-(--muted)">
                {selectedVideo.src ?? "Simulated HUD feed"}
              </div>
            </div>

            <BrainCircuit size={20} className="text-(--primary)" />
          </div>

          <button
            onClick={() => void analyzeSelectedVideo()}
            disabled={loading || !canAnalyze}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-(--primary) bg-[rgba(41,211,255,0.08)] px-3 py-2 text-hud text-[10px] text-(--primary) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analyzing Video
              </>
            ) : (
              <>
                <PlayCircle size={14} />
                Analyze with OpenCV
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] p-2 text-xs text-(--critical)">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {!analysis && (
          <div className="rounded border border-(--border) bg-[#07111f] p-3 text-xs leading-relaxed text-(--muted)">
            Select a real video source and click Analyze. The backend will scan
            video frames using OpenCV and push fire/smoke/risk results into the
            Camera AI dashboard.
          </div>
        )}

        {analysis && (
          <>
            <div className={`rounded border p-3 ${getRiskBorderClass(analysis.risk)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-hud text-[10px] text-(--muted)">
                    Analysis Risk
                  </div>
                  <div className={`mt-1 text-hud text-lg uppercase ${getRiskClass(analysis.risk)}`}>
                    {analysis.risk}
                  </div>
                </div>

                {analysis.risk === "low" ? (
                  <CheckCircle2 size={24} className="text-(--nominal)" />
                ) : (
                  <AlertTriangle size={24} className={getRiskClass(analysis.risk)} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MetricBox label="Confidence" value={confidence} suffix="%" />
              <MetricBox
                label="Frames"
                value={analysis.frames.sampled_frames}
              />
              <MetricBox
                label="Fire Score"
                value={analysis.metrics.fire_score}
              />
              <MetricBox
                label="Smoke Score"
                value={analysis.metrics.smoke_score}
              />
              <MetricBox
                label="Motion"
                value={analysis.metrics.motion_score}
              />
              <MetricBox
                label="Brightness"
                value={analysis.metrics.brightness}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                className={`rounded border p-3 ${
                  analysis.detections.fire
                    ? "border-(--critical) bg-[rgba(255,77,77,0.08)]"
                    : "border-(--border) bg-[#07111f]"
                }`}
              >
                <Flame
                  size={18}
                  className={
                    analysis.detections.fire
                      ? "text-(--critical)"
                      : "text-(--muted)"
                  }
                />
                <div className="mt-2 text-hud text-[10px] text-(--foreground)">
                  Fire
                </div>
                <div className="mt-1 text-hud text-[9px] text-(--muted)">
                  {analysis.detections.fire ? "DETECTED" : "CLEAR"}
                </div>
              </div>

              <div
                className={`rounded border p-3 ${
                  analysis.detections.smoke
                    ? "border-(--caution) bg-[rgba(246,178,60,0.08)]"
                    : "border-(--border) bg-[#07111f]"
                }`}
              >
                <Waves
                  size={18}
                  className={
                    analysis.detections.smoke
                      ? "text-(--caution)"
                      : "text-(--muted)"
                  }
                />
                <div className="mt-2 text-hud text-[10px] text-(--foreground)">
                  Smoke
                </div>
                <div className="mt-1 text-hud text-[9px] text-(--muted)">
                  {analysis.detections.smoke ? "DETECTED" : "CLEAR"}
                </div>
              </div>
            </div>

            <div className="rounded border border-(--border) bg-[#07111f] p-3">
              <div className="flex items-center gap-2 text-hud text-[10px] text-(--primary)">
                <Activity size={14} />
                OpenCV Events
              </div>

              <div className="mt-2 space-y-2">
                {analysis.events.length === 0 && (
                  <div className="text-xs text-(--muted)">
                    No major fire/smoke/motion event found.
                  </div>
                )}

                {analysis.events.map((event) => (
                  <div
                    key={`${event.type}-${event.created_at}`}
                    className="rounded border border-(--border) bg-[#050d18] p-2"
                  >
                    <div className="text-hud text-[10px] text-(--foreground)">
                      {event.title}
                    </div>
                    <div className="mt-1 text-[10px] text-(--muted)">
                      {event.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}