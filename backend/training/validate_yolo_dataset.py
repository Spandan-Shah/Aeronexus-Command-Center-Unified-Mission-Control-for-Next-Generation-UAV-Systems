from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_ROOT = PROJECT_ROOT / "datasets" / "aeronexus_disaster"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
VALID_CLASS_IDS = {0, 1, 2, 3, 4, 5}


def get_images(split: str) -> list[Path]:
    image_dir = DATASET_ROOT / split / "images"

    if not image_dir.exists():
        raise FileNotFoundError(f"Missing folder: {image_dir}")

    return [
        path
        for path in image_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def get_label_path(split: str, image_path: Path) -> Path:
    return DATASET_ROOT / split / "labels" / f"{image_path.stem}.txt"


def validate_label_file(label_path: Path) -> list[str]:
    errors: list[str] = []

    if not label_path.exists():
        errors.append("Missing label file")
        return errors

    content = label_path.read_text(encoding="utf-8").strip()

    if not content:
        return errors

    for line_number, line in enumerate(content.splitlines(), start=1):
        parts = line.split()

        if len(parts) != 5:
            errors.append(f"Line {line_number}: Expected 5 values, got {len(parts)}")
            continue

        try:
            class_id = int(parts[0])
            x_center = float(parts[1])
            y_center = float(parts[2])
            width = float(parts[3])
            height = float(parts[4])
        except ValueError:
            errors.append(f"Line {line_number}: Non-numeric label value")
            continue

        if class_id not in VALID_CLASS_IDS:
            errors.append(f"Line {line_number}: Invalid class id {class_id}")

        for value_name, value in [
            ("x_center", x_center),
            ("y_center", y_center),
            ("width", width),
            ("height", height),
        ]:
            if value < 0 or value > 1:
                errors.append(
                    f"Line {line_number}: {value_name} must be between 0 and 1"
                )

        if width <= 0 or height <= 0:
            errors.append(f"Line {line_number}: width/height must be positive")

    return errors


def validate_split(split: str) -> tuple[int, int, int]:
    images = get_images(split)

    total_images = len(images)
    total_label_files = 0
    total_errors = 0

    print(f"\n[CHECK] {split}")
    print(f"[INFO] Images: {total_images}")

    for image_path in images:
        label_path = get_label_path(split, image_path)

        if label_path.exists():
            total_label_files += 1

        errors = validate_label_file(label_path)

        if errors:
            total_errors += len(errors)
            print(f"[ERROR] {image_path.name}")
            for error in errors:
                print(f"  - {error}")

    print(f"[INFO] Label files: {total_label_files}")
    print(f"[INFO] Errors: {total_errors}")

    return total_images, total_label_files, total_errors


def main() -> None:
    data_yaml = DATASET_ROOT / "data.yaml"

    if not data_yaml.exists():
        raise FileNotFoundError(f"Missing data.yaml: {data_yaml}")

    total_errors = 0

    for split in ["train", "val"]:
        _, _, split_errors = validate_split(split)
        total_errors += split_errors

    if total_errors > 0:
        raise RuntimeError(f"Dataset validation failed with {total_errors} errors")

    print("\n[DONE] Dataset is valid for YOLO training.")


if __name__ == "__main__":
    main()