import {
  AlertTriangle,
  Camera,
  Car,
  CheckCircle2,
  Flame,
  Map,
  ShieldAlert,
  UserRound,
  Waves,
  Workflow,
} from "lucide-react";
import { Panel } from "../common/Panel";
import type { CameraOpenCvAnalysis } from "./OpenCvAnalysisPanel";

type FeatureStatus =
  | "detected"
  | "warning"
  | "clear"
  | "needs-model"
  | "needs-gis";

type DisasterFeature = {
  id: string;
  category: string;
  title: string;
  description: string;
  source: "YOLO" | "OpenCV" | "Custom Model" | "GIS";
  status: FeatureStatus;
  score: number;
  evidence: string;
  action: string;
  icon: typeof Camera;
};

function getStatusClass(status: FeatureStatus) {
  if (status === "detected") {
    return "border-(--critical) bg-[rgba(255,77,77,0.08)] text-(--critical)";
  }

  if (status === "warning") {
    return "border-(--caution) bg-[rgba(246,178,60,0.08)] text-(--caution)";
  }

  if (status === "clear") {
    return "border-(--nominal) bg-[rgba(73,229,143,0.08)] text-(--nominal)";
  }

  if (status === "needs-gis") {
    return "border-(--info) bg-[rgba(41,211,255,0.08)] text-(--info)";
  }

  return "border-(--border) bg-[#07111f] text-(--muted)";
}

function getStatusLabel(status: FeatureStatus) {
  if (status === "detected") return "DETECTED";
  if (status === "warning") return "WARNING";
  if (status === "clear") return "CLEAR";
  if (status === "needs-gis") return "NEEDS GIS";
  return "NEEDS MODEL";
}

function getVisibilityStatus(analysis: CameraOpenCvAnalysis): FeatureStatus {
  const brightness = analysis.metrics.brightness;
  const contrast = analysis.metrics.contrast;

  if (brightness < 35 || brightness > 220) return "warning";
  if (contrast < 18) return "warning";

  return "clear";
}

function getVisibilityEvidence(analysis: CameraOpenCvAnalysis) {
  return `Brightness ${analysis.metrics.brightness}, contrast ${analysis.metrics.contrast}, edge density ${analysis.metrics.edge_density}.`;
}

function buildDisasterFeatures(
  analysis: CameraOpenCvAnalysis | null
): DisasterFeature[] {
  if (!analysis) {
    return [
      {
        id: "not-started",
        category: "System",
        title: "No analysis loaded",
        description:
          "Select a video and run YOLO/OpenCV analysis to generate the disaster feature matrix.",
        source: "OpenCV",
        status: "warning",
        score: 0,
        evidence: "No video analysis result is available yet.",
        action: "Run camera analysis first.",
        icon: Workflow,
      },
    ];
  }

  const personBoxes = analysis.detections.boxes.filter(
    (box) => box.category === "person"
  );
  const vehicleBoxes = analysis.detections.boxes.filter(
    (box) => box.category === "vehicle"
  );

  const personCount = personBoxes.length;
  const vehicleCount = vehicleBoxes.length;

  const visibilityStatus = getVisibilityStatus(analysis);

  return [
    {
      id: "fire-detection",
      category: "Fire",
      title: "Fire / Flame Detection",
      description:
        "Detects visible fire or flame-like disaster threat from video frames.",
      source: "Custom Model",
      status: analysis.detections.fire ? "detected" : "needs-model",
      score: analysis.detections.fire ? analysis.detections.confidence : 0,
      evidence: analysis.detections.fire
        ? "Fire label detected by model output."
        : "Default YOLO model usually cannot detect fire. A custom fire model is required.",
      action: analysis.detections.fire
        ? "Create high-priority fire incident."
        : "Connect custom fire_smoke_model.pt.",
      icon: Flame,
    },
    {
      id: "smoke-detection",
      category: "Smoke",
      title: "Smoke Plume Detection",
      description:
        "Detects smoke plume, smoke spread, and early fire warning indicators.",
      source: "Custom Model",
      status: analysis.detections.smoke ? "detected" : "needs-model",
      score: analysis.detections.smoke ? analysis.detections.confidence : 0,
      evidence: analysis.detections.smoke
        ? "Smoke label detected by model output."
        : "Default YOLO model usually cannot detect smoke. A custom smoke model is required.",
      action: analysis.detections.smoke
        ? "Mark smoke zone and increase risk."
        : "Connect custom smoke dataset/model.",
      icon: Waves,
    },
    {
      id: "flood-detection",
      category: "Flood",
      title: "Flood / Waterlogging Detection",
      description:
        "Detects flooded roads, water spread, and waterlogging around buildings.",
      source: "Custom Model",
      status: analysis.detections.flood ? "detected" : "needs-model",
      score: analysis.detections.flood ? analysis.detections.confidence : 0,
      evidence: analysis.detections.flood
        ? "Flood label detected by model output."
        : "Flood detection needs segmentation or a custom flood/waterlogging model.",
      action: analysis.detections.flood
        ? "Trigger flood response workflow."
        : "Add flood segmentation model later.",
      icon: Waves,
    },
    {
      id: "human-rescue",
      category: "Rescue",
      title: "Human Presence Detection",
      description:
        "Detects people in disaster area for rescue priority estimation.",
      source: "YOLO",
      status: personCount > 0 ? "detected" : "clear",
      score: personCount > 0 ? analysis.detections.confidence : 0,
      evidence:
        personCount > 0
          ? `${personCount} person box detected in selected best frame.`
          : "No person box detected above threshold.",
      action:
        personCount > 0
          ? "Mark rescue candidate zone."
          : "No rescue target from current frame.",
      icon: UserRound,
    },
    {
      id: "vehicle-detection",
      category: "Traffic",
      title: "Vehicle / Road Activity",
      description:
        "Detects vehicles for evacuation route, blockage, and traffic analysis.",
      source: "YOLO",
      status: vehicleCount > 0 ? "detected" : "clear",
      score: vehicleCount > 0 ? analysis.detections.confidence : 0,
      evidence:
        vehicleCount > 0
          ? `${vehicleCount} vehicle box detected in selected best frame.`
          : "No vehicle box detected above threshold.",
      action:
        vehicleCount > 0
          ? "Use with map route layer for road risk."
          : "No visible vehicle activity.",
      icon: Car,
    },
    {
      id: "visibility-quality",
      category: "Vision",
      title: "Camera Visibility Quality",
      description:
        "Checks whether the video is bright, clear, and usable for disaster analysis.",
      source: "OpenCV",
      status: visibilityStatus,
      score: visibilityStatus === "clear" ? 0.9 : 0.45,
      evidence: getVisibilityEvidence(analysis),
      action:
        visibilityStatus === "clear"
          ? "Video quality is usable for model analysis."
          : "Improve lighting, altitude, focus, or camera angle.",
      icon: Camera,
    },
    {
      id: "blocked-road",
      category: "Route",
      title: "Blocked Road / Unsafe Route",
      description:
        "Checks whether disaster conditions block roads or evacuation routes.",
      source: "GIS",
      status: "needs-gis",
      score: 0,
      evidence:
        "Needs map road layer + flood/fire detection overlay to calculate route blockage.",
      action: "Connect map route layer with detection polygons.",
      icon: Map,
    },
    {
      id: "infrastructure-risk",
      category: "Infrastructure",
      title: "Critical Infrastructure Exposure",
      description:
        "Checks whether hospital, police station, bridge, school, or power area is near the detected disaster.",
      source: "GIS",
      status: "needs-gis",
      score: 0,
      evidence:
        "Needs infrastructure map layer connected with detected disaster zone.",
      action: "Connect GIS infrastructure layer with Camera AI results.",
      icon: ShieldAlert,
    },
  ];
}

export function DisasterFeatureMatrixPanel({
  analysis,
}: {
  analysis: CameraOpenCvAnalysis | null;
}) {
  const features = buildDisasterFeatures(analysis);

  const detectedCount = features.filter(
    (feature) => feature.status === "detected"
  ).length;

  const warningCount = features.filter(
    (feature) => feature.status === "warning"
  ).length;

  const needsModelCount = features.filter(
    (feature) =>
      feature.status === "needs-model" || feature.status === "needs-gis"
  ).length;

  return (
    <Panel
      title="Disaster Feature Matrix"
      right={
        <span className="text-hud text-[10px] text-(--primary)">
          DISASTER AI
        </span>
      }
    >
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Detected
            </div>
            <div className="mt-1 text-hud text-lg text-(--critical)">
              {detectedCount}
            </div>
          </div>

          <div className="rounded border border-(--caution) bg-[rgba(246,178,60,0.08)] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Warnings
            </div>
            <div className="mt-1 text-hud text-lg text-(--caution)">
              {warningCount}
            </div>
          </div>

          <div className="rounded border border-(--info) bg-[rgba(41,211,255,0.08)] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Pending
            </div>
            <div className="mt-1 text-hud text-lg text-(--info)">
              {needsModelCount}
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.id}
                className={`rounded border p-3 ${getStatusClass(
                  feature.status
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <Icon size={17} className="mt-0.5 shrink-0" />

                    <div className="min-w-0">
                      <div className="text-hud text-[10px] uppercase">
                        {feature.category} · {feature.source}
                      </div>

                      <div className="mt-1 text-hud text-xs text-(--foreground)">
                        {feature.title}
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded bg-[#050d18]/70 px-2 py-1 text-hud text-[8px]">
                    {getStatusLabel(feature.status)}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-(--muted)">
                  {feature.description}
                </p>

                <div className="mt-3 rounded border border-(--border) bg-[#050d18]/70 p-2">
                  <div className="flex items-center gap-1 text-hud text-[9px] text-(--muted)">
                    <CheckCircle2 size={11} />
                    Evidence
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed text-(--muted)">
                    {feature.evidence}
                  </div>
                </div>

                <div className="mt-2 rounded border border-(--border) bg-[#050d18]/70 p-2">
                  <div className="flex items-center gap-1 text-hud text-[9px] text-(--muted)">
                    <AlertTriangle size={11} />
                    Action
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed text-(--muted)">
                    {feature.action}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}