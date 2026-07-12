from pathlib import Path

import cv2


PROJECT_ROOT = Path(__file__).resolve().parents[2]

VIDEO_DIR = PROJECT_ROOT / "public" / "videos"
OUTPUT_DIR = PROJECT_ROOT / "datasets" / "aeronexus_disaster" / "raw_frames"

VIDEOS = {
    "city_surveillance": VIDEO_DIR / "drone-city-surveillance.mp4",
    "disaster_response": VIDEO_DIR / "drone-disaster-response.mp4",
    "forest_patrol": VIDEO_DIR / "drone-forest-patrol.mp4",
}


def extract_frames(video_name: str, video_path: Path, every_n_frames: int = 30) -> None:
    if not video_path.exists():
        print(f"[SKIP] Missing video: {video_path}")
        return

    output_folder = OUTPUT_DIR / video_name
    output_folder.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        print(f"[ERROR] Could not open: {video_path}")
        return

    frame_index = 0
    saved_count = 0

    while True:
        success, frame = capture.read()

        if not success:
            break

        if frame_index % every_n_frames == 0:
            frame_path = output_folder / f"{video_name}_{saved_count:05d}.jpg"
            cv2.imwrite(str(frame_path), frame)
            saved_count += 1

        frame_index += 1

    capture.release()

    print(f"[DONE] {video_name}: saved {saved_count} frames")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for video_name, video_path in VIDEOS.items():
        extract_frames(video_name, video_path, every_n_frames=30)


if __name__ == "__main__":
    main()