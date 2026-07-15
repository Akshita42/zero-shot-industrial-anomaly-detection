import cv2
import numpy as np
import torch

from PIL import Image
from transformers import CLIPProcessor, CLIPModel

from utils.patch_utils import extract_overlapping_patches
from utils.embedding_utils import get_patch_embeddings
from utils.anomaly_utils import compute_anomaly_scores
from utils.visualization_utils import (
    generate_heatmap,
    create_overlay
)

# DEVICE
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Using device: {device}")

# LOAD MODEL
model = CLIPModel.from_pretrained(
    "openai/clip-vit-base-patch32"
).to(device)

processor = CLIPProcessor.from_pretrained(
    "openai/clip-vit-base-patch32"
)

print("CLIP loaded.")

# REFERENCE IMAGE
reference_path = "data/raw/mvtec_anomaly_detection/bottle/train/good/000.png"

reference_image = Image.open(
    reference_path
).convert("RGB")

reference_np = np.array(reference_image)

# EXTRACT REFERENCE PATCHES
ref_patches, _ = extract_overlapping_patches(
    reference_np,
    patch_size=64,
    stride=64
)

reference_embeddings = get_patch_embeddings(
    ref_patches,
    model,
    processor,
    device=device
)

mean_reference_embedding = torch.mean(
    reference_embeddings,
    dim=0,
    keepdim=True
)

print("Reference embeddings ready.")

# START WEBCAM
cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame_rgb = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    frame_rgb = cv2.resize(
        frame_rgb,
        (512, 512)
    )

    # PATCH EXTRACTION
    patches, positions = extract_overlapping_patches(
        frame_rgb,
        patch_size=64,
        stride=64
    )

    # PATCH EMBEDDINGS
    test_embeddings = get_patch_embeddings(
    patches,
    model,
    processor,
    device=device
    )

    # ANOMALY SCORES
    anomaly_scores = compute_anomaly_scores(
        test_embeddings,
        mean_reference_embedding
    )

    # HEATMAP
    heatmap = generate_heatmap(
        anomaly_scores,
        positions,
        frame_rgb.shape,
        patch_size=64
    )

    # OVERLAY
    overlay = create_overlay(
        frame_rgb,
        heatmap
    )

    overlay_bgr = cv2.cvtColor(
        overlay,
        cv2.COLOR_RGB2BGR
    )

    cv2.imshow(
        "Real-Time Industrial Anomaly Detection",
        overlay_bgr
    )

    key = cv2.waitKey(1)

    if key == ord("q"):
        break

cap.release()

cv2.destroyAllWindows()