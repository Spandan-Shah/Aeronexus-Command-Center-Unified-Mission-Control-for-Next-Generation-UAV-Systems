import { Camera, CheckCircle2, Film, Globe2, PlayCircle } from "lucide-react";
import { Panel } from "../common/Panel";

export type CameraVideoSource = {
  id: string;
  title: string;
  description: string;
  sourceName: string;
  license: string;
  category: "surveillance" | "disaster" | "patrol" | "simulation";
  src?: string;
};

type VideoSourceLibraryProps = {
  selectedVideoId: string;
  videos: CameraVideoSource[];
  onSelectVideo: (video: CameraVideoSource) => void;
};

const categoryClass: Record<CameraVideoSource["category"], string> = {
  surveillance: "text-(--primary)",
  disaster: "text-(--critical)",
  patrol: "text-(--nominal)",
  simulation: "text-(--caution)",
};

export function VideoSourceLibrary({
  selectedVideoId,
  videos,
  onSelectVideo,
}: VideoSourceLibraryProps) {
  return (
    <Panel
      title="Video Source Library"
      right={
        <span className="text-hud text-[10px] text-(--primary)">
          SELECT FEED
        </span>
      }
    >
      <div className="space-y-2 p-3">
        {videos.map((video) => {
          const selected = selectedVideoId === video.id;

          return (
            <button
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className={`w-full rounded border p-3 text-left transition ${
                selected
                  ? "border-(--primary) bg-[rgba(41,211,255,0.08)]"
                  : "border-(--border) bg-[#07111f] hover:border-(--primary)"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {video.src ? (
                    <Film
                      size={16}
                      className={categoryClass[video.category]}
                    />
                  ) : (
                    <Camera
                      size={16}
                      className={categoryClass[video.category]}
                    />
                  )}

                  <div className="min-w-0">
                    <div className="truncate text-hud text-[10px] text-(--foreground)">
                      {video.title}
                    </div>

                    <div className="mt-1 text-[10px] leading-relaxed text-(--muted)">
                      {video.description}
                    </div>
                  </div>
                </div>

                {selected ? (
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-(--nominal)"
                  />
                ) : (
                  <PlayCircle
                    size={15}
                    className="shrink-0 text-(--muted)"
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded border border-(--border) px-2 py-1 text-hud text-[9px] text-(--muted)">
                  {video.sourceName}
                </span>

                <span className="rounded border border-(--border) px-2 py-1 text-hud text-[9px] text-(--muted)">
                  {video.license}
                </span>

                <span
                  className={`rounded border border-(--border) px-2 py-1 text-hud text-[9px] uppercase ${
                    categoryClass[video.category]
                  }`}
                >
                  {video.category}
                </span>

                {video.src && (
                  <span className="flex items-center gap-1 rounded border border-(--border) px-2 py-1 text-hud text-[9px] text-(--muted)">
                    <Globe2 size={10} />
                    Local MP4
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}