import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Car,
  Cpu,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Panel } from "../common/Panel";
import type { CameraVideoSource } from "./VideoSourceLibrary";

const BACKEND_URL = "http://127.0.0.1:8000";

type ValueSummary = {
  average: number;
  minimum: number;
  maximum: number;
};

type ClassStats = {
  count: number;
  confidence: ValueSummary;
  box_area: ValueSummary;
};

type DetectionStats = {
  ok: boolean;
  source_id: string;
  loaded_model: string;
  cuda_available: boolean;
  gpu: string | null;
  confidence_threshold: number;
  frames_analyzed: number;
  total_detections: number;
  detection_frames: number;
  no_detection_frames: number;
  detection_rate: number;
  detections_per_frame: number;
  confidence: ValueSummary;
  inference_ms: ValueSummary;
  quality: {
    score: number;
    level: "high" | "medium" | "low" | "no-detection";
  };
  classes: {
    person: ClassStats;
    vehicle: ClassStats;
  };
};

type DetectionAccuracyMonitorProps = {
  selectedVideo: CameraVideoSource;
  confidenceThreshold?: number;
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function fixed(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.0";
}

function qualityClass(level?: string) {
  if (level === "high") return "text-(--nominal)";
  if (level === "medium") return "text-(--info)";
  if (level === "low") return "text-(--caution)";
  return "text-(--critical)";
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded border border-(--border) bg-[#07111f] px-2 py-1">
      <div className="text-hud text-[9px] uppercase text-(--muted)">
        {label}
      </div>
      <div className="mt-1 text-hud text-xs text-(--foreground)">
        {value}
      </div>
    </div>
  );
}

function ClassCard({
  label,
  icon: Icon,
  stats,
}: {
  label: string;
  icon: typeof UserRound;
  stats?: ClassStats;
}) {
  const count = stats?.count ?? 0;
  const averageConfidence = stats?.confidence.average ?? 0;
  const maxConfidence = stats?.confidence.maximum ?? 0;

  return (
    <div className="rounded border border-(--border) bg-[#07111f] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-hud text-xs text-(--foreground)">
          <Icon size={14} />
          {label}
        </div>

        <span
          className={`text-hud text-[10px] ${
            count > 0 ? "text-(--nominal)" : "text-(--muted)"
          }`}
        >
          {count > 0 ? "DETECTED" : "CLEAR"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatPill label="Count" value={count} />
        <StatPill label="Avg Conf" value={percent(averageConfidence)} />
        <StatPill label="Max Conf" value={percent(maxConfidence)} />
      </div>
    </div>
  );
}

export function DetectionAccuracyMonitor({
  selectedVideo,
  confidenceThreshold = 0.3,
}: DetectionAccuracyMonitorProps) {
  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = Boolean(selectedVideo.src);

  async function loadStats() {
    if (!canAnalyze) {
      setError("Select city, disaster, or forest video first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/camera-ai/detection-stats/${selectedVideo.id}?confidence_threshold=${confidenceThreshold}&frames=120&frame_skip=5`
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Detection stats request failed.");
      }

      const result: DetectionStats = await response.json();
      setStats(result);
    } catch (statsError) {
      setError(
        statsError instanceof Error
          ? statsError.message
          : "Detection stats request failed."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setStats(null);
    setError(null);
  }, [selectedVideo.id]);

  return (
    <Panel
      title="Person / Vehicle Accuracy Monitor"
      right={
        <button
          type="button"
          onClick={loadStats}
          disabled={isLoading || !canAnalyze}
          className="flex items-center gap-1 rounded border border-(--primary) px-2 py-1 text-hud text-[9px] text-(--primary) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCcw size={12} />
          )}
          Analyze
        </button>
      }
    >
      <div className="space-y-3 p-3">
        <div className="rounded border border-(--border) bg-[#07111f] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-hud text-xs text-(--foreground)">
                Confidence-based detection quality
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-(--muted)">
                This measures live model confidence and detection consistency.
                True accuracy needs manually labeled validation data.
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-hud text-xl ${qualityClass(
                  stats?.quality.level
                )}`}
              >
                {stats ? fixed(stats.quality.score, 1) : "--"}
              </div>
              <div className="text-hud text-[9px] uppercase text-(--muted)">
                Quality Score
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] px-3 py-2 text-xs text-(--critical)">
            {error}
          </div>
        )}

        {!stats && !error && (
          <div className="rounded border border-(--border) bg-[#07111f] px-3 py-4 text-center text-xs text-(--muted)">
            Click Analyze to calculate person and vehicle detection stats for{" "}
            {selectedVideo.title}.
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatPill
                label="Frames"
                value={stats.frames_analyzed}
              />
              <StatPill
                label="Detections"
                value={stats.total_detections}
              />
              <StatPill
                label="Detect Rate"
                value={percent(stats.detection_rate)}
              />
              <StatPill
                label="Avg Conf"
                value={percent(stats.confidence.average)}
              />
              <StatPill
                label="Det / Frame"
                value={fixed(stats.detections_per_frame, 2)}
              />
              <StatPill
                label="Inference"
                value={`${fixed(stats.inference_ms.average, 1)} ms`}
              />
            </div>

            <ClassCard
              label="Person"
              icon={UserRound}
              stats={stats.classes.person}
            />

            <ClassCard
              label="Vehicle"
              icon={Car}
              stats={stats.classes.vehicle}
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-(--border) bg-[#07111f] p-2">
                <div className="flex items-center gap-2 text-hud text-[10px] text-(--muted)">
                  <Cpu size={12} />
                  GPU
                </div>
                <div className="mt-1 text-[11px] text-(--foreground)">
                  {stats.gpu ?? "CPU"}
                </div>
              </div>

              <div className="rounded border border-(--border) bg-[#07111f] p-2">
                <div className="flex items-center gap-2 text-hud text-[10px] text-(--muted)">
                  <BarChart3 size={12} />
                  Threshold
                </div>
                <div className="mt-1 text-[11px] text-(--foreground)">
                  {percent(stats.confidence_threshold)}
                </div>
              </div>

              <div className="rounded border border-(--border) bg-[#07111f] p-2">
                <div className="flex items-center gap-2 text-hud text-[10px] text-(--muted)">
                  <ShieldCheck size={12} />
                  Level
                </div>
                <div
                  className={`mt-1 text-hud text-[11px] uppercase ${qualityClass(
                    stats.quality.level
                  )}`}
                >
                  {stats.quality.level}
                </div>
              </div>

              <div className="rounded border border-(--border) bg-[#07111f] p-2">
                <div className="flex items-center gap-2 text-hud text-[10px] text-(--muted)">
                  <Activity size={12} />
                  Model
                </div>
                <div className="mt-1 truncate text-[11px] text-(--foreground)">
                  {stats.loaded_model}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}