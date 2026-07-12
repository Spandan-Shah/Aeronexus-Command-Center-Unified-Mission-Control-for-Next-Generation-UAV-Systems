import random
import shutil
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_ROOT = PROJECT_ROOT / "datasets" / "aeronexus_disaster"

RAW_FRAMES_DIR = DATASET_ROOT / "raw_frames"

TRAIN_IMAGES_DIR = DATASET_ROOT / "train" / "images"
TRAIN_LABELS_DIR = DATASET_ROOT / "train" / "labels"
VAL_IMAGES_DIR = DATASET_ROOT / "val" / "images"
VAL_LABELS_DIR = DATASET_ROOT / "val" / "labels"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

TRAIN_SPLIT = 0.8
RANDOM_SEED = 42


def reset_output_folders() -> None:
    for folder in [
        TRAIN_IMAGES_DIR,
        TRAIN_LABELS_DIR,
        VAL_IMAGES_DIR,
        VAL_LABELS_DIR,
    ]:
        if folder.exists():
            shutil.rmtree(folder)

        folder.mkdir(parents=True, exist_ok=True)


def collect_raw_images() -> list[Path]:
    if not RAW_FRAMES_DIR.exists():
        raise FileNotFoundError(f"Raw frames folder not found: {RAW_FRAMES_DIR}")

    images = [
        path
        for path in RAW_FRAMES_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]

    if not images:
        raise RuntimeError(f"No images found inside: {RAW_FRAMES_DIR}")

    return images


def make_safe_name(image_path: Path) -> str:
    parent_name = image_path.parent.name
    return f"{parent_name}_{image_path.stem}{image_path.suffix.lower()}"


def create_empty_label_file(label_path: Path) -> None:
    label_path.parent.mkdir(parents=True, exist_ok=True)

    if not label_path.exists():
        label_path.write_text("", encoding="utf-8")


def copy_images_to_split(images: list[Path]) -> None:
    random.seed(RANDOM_SEED)
    random.shuffle(images)

    train_count = int(len(images) * TRAIN_SPLIT)

    train_images = images[:train_count]
    val_images = images[train_count:]

    for image_path in train_images:
        output_name = make_safe_name(image_path)
        output_image_path = TRAIN_IMAGES_DIR / output_name
        output_label_path = TRAIN_LABELS_DIR / f"{Path(output_name).stem}.txt"

        shutil.copy2(image_path, output_image_path)
        create_empty_label_file(output_label_path)

    for image_path in val_images:
        output_name = make_safe_name(image_path)
        output_image_path = VAL_IMAGES_DIR / output_name
        output_label_path = VAL_LABELS_DIR / f"{Path(output_name).stem}.txt"

        shutil.copy2(image_path, output_image_path)
        create_empty_label_file(output_label_path)

    print(f"[DONE] Train images: {len(train_images)}")
    print(f"[DONE] Val images: {len(val_images)}")
    print(f"[INFO] Empty label files were created.")
    print(f"[INFO] Next step: pseudo-label person/vehicle or manually label frames.")


def main() -> None:
    images = collect_raw_images()

    print(f"[INFO] Found raw images: {len(images)}")

    reset_output_folders()
    copy_images_to_split(images)


if __name__ == "__main__":
    main()