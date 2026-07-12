from pathlib import Path

from ultralytics import YOLO


PROJECT_ROOT = Path(__file__).resolve().parents[2]

LAST_MODEL = (
    PROJECT_ROOT
    / "runs"
    / "aeronexus"
    / "disaster_yolo_v1"
    / "weights"
    / "last.pt"
)


def main() -> None:
    if not LAST_MODEL.exists():
        raise FileNotFoundError(f"Missing checkpoint: {LAST_MODEL}")

    model = YOLO(str(LAST_MODEL))

    results = model.train(
        resume=True,
    )

    print("[DONE] Resume training finished.")
    print(results)


if __name__ == "__main__":
    main()