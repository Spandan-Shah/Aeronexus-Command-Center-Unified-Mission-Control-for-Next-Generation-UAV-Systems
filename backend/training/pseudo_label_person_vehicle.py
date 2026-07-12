from pathlib import Path

import cv2
from ultralytics import YOLO


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_ROOT = PROJECT_ROOT / "datasets" / "aeronexus_disaster"

SPLITS = ["train", "val"]

MODEL_NAME = "yolov8n.pt"
CONFIDENCE_THRESHOLD = 0.35

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# Our custom class IDs:
# 0 = person
# 1 = vehicle
YOLO_TO_CUSTOM_CLASS = {
    "person": 0,
    "car": 1,
    "truck": 1,
    "bus": 1,
    "motorcycle": 1,
    "bicycle": 1,
    "boat": 1,
    "train": 1,
}


def normalize_box(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    image_width: int,
    image_height: int,
) -> tuple[float, float, float, float]:
    box_width = x2 - x1
    box_height = y2 - y1

    x_center = x1 + box_width / 2
    y_center = y1 + box_height / 2

    return (
        x_center / image_width,
        y_center / image_height,
        box_width / image_width,
        box_height / image_height,
    )


def image_paths_for_split(split: str) -> list[Path]:
    image_dir = DATASET_ROOT / split / "images"

    if not image_dir.exists():
        raise FileNotFoundError(f"Missing image folder: {image_dir}")

    return [
        path
        for path in image_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def write_labels_for_image(
    model: YOLO,
    image_path: Path,
    label_path: Path,
) -> int:
    image = cv2.imread(str(image_path))

    if image is None:
        print(f"[SKIP] Could not read image: {image_path}")
        return 0

    image_height, image_width = image.shape[:2]

    results = model.predict(
        source=image,
        conf=CONFIDENCE_THRESHOLD,
        verbose=False,
    )

    if not results:
        label_path.write_text("", encoding="utf-8")
        return 0

    result = results[0]
    names = result.names
    lines: list[str] = []

    if result.boxes is None:
        label_path.write_text("", encoding="utf-8")
        return 0

    for box in result.boxes:
        class_id = int(box.cls[0].cpu().item())
        confidence = float(box.conf[0].cpu().item())

        raw_label = str(names.get(class_id, class_id)).lower().strip()

        if raw_label not in YOLO_TO_CUSTOM_CLASS:
            continue

        custom_class_id = YOLO_TO_CUSTOM_CLASS[raw_label]

        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()

        x_center, y_center, width, height = normalize_box(
            x1=x1,
            y1=y1,
            x2=x2,
            y2=y2,
            image_width=image_width,
            image_height=image_height,
        )

        # Clamp values safely between 0 and 1.
        x_center = max(0.0, min(1.0, x_center))
        y_center = max(0.0, min(1.0, y_center))
        width = max(0.0, min(1.0, width))
        height = max(0.0, min(1.0, height))

        lines.append(
            f"{custom_class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"
        )

    label_path.parent.mkdir(parents=True, exist_ok=True)
    label_path.write_text("\n".join(lines), encoding="utf-8")

    return len(lines)


def main() -> None:
    model = YOLO(MODEL_NAME)

    total_images = 0
    total_labels = 0

    for split in SPLITS:
        images = image_paths_for_split(split)
        label_dir = DATASET_ROOT / split / "labels"
        label_dir.mkdir(parents=True, exist_ok=True)

        print(f"[INFO] Split: {split}, images: {len(images)}")

        for image_path in images:
            label_path = label_dir / f"{image_path.stem}.txt"
            count = write_labels_for_image(model, image_path, label_path)

            total_images += 1
            total_labels += count

    print(f"[DONE] Processed images: {total_images}")
    print(f"[DONE] Auto-created labels: {total_labels}")
    print("[IMPORTANT] Review/correct labels manually before serious training.")


if __name__ == "__main__":
    main()