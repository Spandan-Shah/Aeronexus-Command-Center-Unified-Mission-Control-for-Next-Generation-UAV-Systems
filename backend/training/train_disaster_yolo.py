from pathlib import Path

from ultralytics import YOLO


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_YAML = PROJECT_ROOT / "datasets" / "aeronexus_disaster" / "data.yaml"

MODEL_NAME = "yolov8n.pt"


def main() -> None:
    if not DATA_YAML.exists():
        raise FileNotFoundError(f"Missing dataset config: {DATA_YAML}")

    model = YOLO(MODEL_NAME)

    results = model.train(
        data=str(DATA_YAML),
        epochs=30,
        imgsz=640,
        batch=2,
        workers=0,
        device="cpu",
        project=str(PROJECT_ROOT / "runs" / "aeronexus"),
        name="disaster_yolo_v1",
        exist_ok=True,
        plots=True,
        patience=20,
    )

    print("[DONE] Training finished.")
    print(results)


if __name__ == "__main__":
    main()