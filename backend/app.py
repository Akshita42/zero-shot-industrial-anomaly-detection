import io
import base64
import os
import sys
import numpy as np
import cv2
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

# Add parent directory to sys.path so we can import utils and config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.patch_utils import extract_overlapping_patches
from utils.embedding_utils import get_patch_embeddings
from utils.anomaly_utils import compute_anomaly_scores
from utils.visualization_utils import generate_heatmap, create_overlay
from utils.postprocess_utils import create_binary_mask, clean_mask, detect_defects
import config as cfg

# Initialize FastAPI App
app = FastAPI(
    title="VisionInspect AI",
    description="CLIP-Based Reference Anomaly Detection Backend API"
)

# Enable CORS for frontend API calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
device = "cuda" if torch.cuda.is_available() else "cpu"
model = None
processor = None

@app.on_event("startup")
def load_clip_model():
    global model, processor
    print(f"Loading CLIP model on device: {device}...")
    try:
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        print("CLIP model and processor loaded successfully.")
    except Exception as e:
        print(f"Error loading CLIP model: {e}")
        raise e

def encode_img_to_base64(img_np):
    _, buffer = cv2.imencode('.png', img_np)
    img_b64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{img_b64}"

@app.post("/analyze")
async def analyze_images(
    reference: UploadFile = File(...),
    test: UploadFile = File(...)
):
    global model, processor
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model is still loading or failed to initialize.")

    try:
        # Read file bytes
        ref_bytes = await reference.read()
        test_bytes = await test.read()

        # Load as PIL Images
        ref_pil = Image.open(io.BytesIO(ref_bytes)).convert("RGB")
        test_pil = Image.open(io.BytesIO(test_bytes)).convert("RGB")

        # Resize to standard size (512x512) for patch-to-patch mapping
        ref_resized = ref_pil.resize((512, 512), Image.Resampling.LANCZOS)
        test_resized = test_pil.resize((512, 512), Image.Resampling.LANCZOS)

        # Convert to numpy arrays
        ref_np = np.array(ref_resized)
        test_np = np.array(test_resized)

        # Extract patches (using stride 64 as in main.py)
        ref_patches, _ = extract_overlapping_patches(ref_np, patch_size=64, stride=64)
        test_patches, positions = extract_overlapping_patches(test_np, patch_size=64, stride=64)

        if not ref_patches or not test_patches:
            raise HTTPException(status_code=400, detail="Images are too small to extract patches.")

        # Generate embeddings
        ref_embeddings = get_patch_embeddings(ref_patches, model, processor, device=device)
        test_embeddings = get_patch_embeddings(test_patches, model, processor, device=device)

        # Compute anomaly scores (patch similarity subtraction)
        # test_embeddings: (N, 512), ref_embeddings: (N, 512)
        anomaly_scores = compute_anomaly_scores(test_embeddings, ref_embeddings)

        # Compute raw similarity metrics for reporting
        raw_similarities = torch.nn.functional.cosine_similarity(test_embeddings, ref_embeddings, dim=1).cpu().numpy()
        mean_sim = float(np.mean(raw_similarities))
        min_sim = float(np.min(raw_similarities))
        max_sim = float(np.max(raw_similarities))

        # Generate anomaly visual outputs
        heatmap = generate_heatmap(anomaly_scores, positions, test_np.shape, patch_size=64)

        # Additional smoothing pass to suppress isolated single-patch spikes (FP reduction)
        if np.max(heatmap) > 0:
            heatmap_smooth = cv2.GaussianBlur(heatmap, (11, 11), 0)
        else:
            heatmap_smooth = heatmap

        # 1. Similarity tolerance — immediately classify as nominal if near-identical
        is_nominal = (
            (mean_sim >= cfg.NOMINAL_MEAN_SIM_THRESHOLD and min_sim >= cfg.NOMINAL_MIN_SIM_THRESHOLD)
            or (np.max(heatmap_smooth) == 0)
        )

        if is_nominal:
            cleaned_mask = np.zeros(heatmap.shape, dtype=np.uint8)
            heatmap = np.zeros_like(heatmap)
            detected_regions = []
        else:
            # 2. Suppress weak heatmap activations (noise floor gate)
            if np.max(heatmap_smooth) < cfg.HEATMAP_MIN_PEAK:
                cleaned_mask = np.zeros(heatmap.shape, dtype=np.uint8)
                heatmap = np.zeros_like(heatmap)
                detected_regions = []
            else:
                binary_mask  = create_binary_mask(heatmap_smooth, threshold=180)
                cleaned_mask = clean_mask(binary_mask)

                # 3. Contour filtering — require minimum credible area
                contours, _ = cv2.findContours(
                    cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                )
                detected_regions = []
                for contour in contours:
                    area = cv2.contourArea(contour)
                    if area < cfg.CONTOUR_MIN_AREA_PX:
                        continue
                    x, y, w, h = cv2.boundingRect(contour)
                    detected_regions.append({
                        "id": len(detected_regions),
                        "x":  float(x) / 512.0 * 100,
                        "y":  float(y) / 512.0 * 100,
                        "width":   float(w) / 512.0 * 100,
                        "height":  float(h) / 512.0 * 100,
                        "area_px": int(area)
                    })

        # Defect visualization overlays
        defect_detection = detect_defects(test_np, cleaned_mask)
        overlay          = create_overlay(test_np, heatmap)

        # 4. Compute anomaly score
        anomaly_pixel_ratio = float(np.sum(cleaned_mask > 0) / cleaned_mask.size)

        if len(detected_regions) > 0 and anomaly_pixel_ratio >= cfg.MIN_ANOMALY_PIXEL_RATIO:
            # Credible regions exist — weight minimum similarity heavily
            anomaly_score = float((1.0 - mean_sim) * 0.25 + (1.0 - min_sim) * 0.75)
            anomaly_score = max(0.0, min(1.0, anomaly_score))
        else:
            # No credible regions — conservative low score
            anomaly_score = float(max(0.0, (1.0 - mean_sim) * 0.15))

        # 5. Final binary classification gate using calibrated threshold from config
        has_anomalies = anomaly_score >= cfg.ANOMALY_THRESHOLD

        if not has_anomalies:
            # Clean up all visualisations for nominal result
            detected_regions   = []
            anomaly_score      = float(max(0.0, (1.0 - mean_sim) * 0.15))
            heatmap            = np.zeros_like(heatmap)
            overlay            = test_np.copy()
            defect_detection   = test_np.copy()
            anomaly_pixel_ratio = 0.0

        # 6. Map anomaly_score → severity label via config bands
        status = cfg.get_severity(anomaly_score)

        # Generate natural-language interpretation
        if anomaly_score < cfg.ANOMALY_THRESHOLD:
            explanation = (
                f"No significant visual anomalies were detected. All patches conform to the reference image "
                f"within acceptable statistical thresholds (calibrated threshold: {cfg.ANOMALY_THRESHOLD:.3f}). "
                f"Average patch similarity: {mean_sim:.4f}, minimum patch similarity: {min_sim:.4f}."
            )
        elif anomaly_score < 0.25:
            explanation = (
                f"Minor visual variations were observed (anomaly score: {anomaly_score:.4f}). "
                f"Average patch similarity: {mean_sim:.4f}, minimum local similarity: {min_sim:.4f}. "
                f"These deviations may represent minor surface reflections, slight orientation differences, "
                f"or ambient illumination fluctuations near the detection threshold ({cfg.ANOMALY_THRESHOLD:.3f})."
            )
        elif anomaly_score < 0.45:
            explanation = (
                f"Structural deviations detected in {len(detected_regions)} localised region(s). "
                f"Anomaly score: {anomaly_score:.4f} (threshold: {cfg.ANOMALY_THRESHOLD:.3f}). "
                f"Cosine similarity dropped to {min_sim:.4f} in the most anomalous patch. "
                f"This indicates visible surface irregularities, scratches, or contamination patterns."
            )
        else:
            explanation = (
                f"High anomaly detected across {len(detected_regions)} localised region(s). "
                f"Anomaly score: {anomaly_score:.4f} — significantly above threshold ({cfg.ANOMALY_THRESHOLD:.3f}). "
                f"Minimum patch similarity: {min_sim:.4f}. "
                f"This indicates major structural defects, surface ruptures, or heavy contamination."
            )

        # Convert images to base64 Data URLs
        ref_b64 = encode_img_to_base64(cv2.cvtColor(ref_np, cv2.COLOR_RGB2BGR))
        test_b64 = encode_img_to_base64(cv2.cvtColor(test_np, cv2.COLOR_RGB2BGR))
        heatmap_b64 = encode_img_to_base64(cv2.cvtColor(heatmap, cv2.COLOR_GRAY2BGR))
        overlay_b64 = encode_img_to_base64(cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        defect_b64 = encode_img_to_base64(cv2.cvtColor(defect_detection, cv2.COLOR_RGB2BGR))

        return {
            "status": status,
            "anomaly_score": anomaly_score,
            "threshold_used": cfg.ANOMALY_THRESHOLD,
            "detected_regions": detected_regions,
            "explanation": explanation,
            "reference_image": ref_b64,
            "test_image": test_b64,
            "heatmap": heatmap_b64,
            "overlay": overlay_b64,
            "defect_detection": defect_b64,
            "metrics": {
                "mean_similarity": mean_sim,
                "min_similarity": min_sim,
                "max_similarity": max_sim,
                "anomaly_pixel_ratio": anomaly_pixel_ratio
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

@app.get("/evaluation")
async def get_evaluation():
    eval_path = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
    if os.path.exists(eval_path):
        import json
        with open(eval_path, "r") as f:
            return json.load(f)
    else:
        return {
            "metrics": {
                "accuracy": 0.0,
                "precision": 0.0,
                "recall": 0.0,
                "f1_score": 0.0,
                "total_samples": 0,
                "correct_predictions": 0,
                "false_positives": 0,
                "false_negatives": 0,
                "true_positives": 0,
                "true_negatives": 0
            },
            "threshold_info": {
                "selected_threshold": cfg.ANOMALY_THRESHOLD,
                "selection_method": "default",
            },
            "sweep_data": [],
            "score_distribution": {},
            "samples": []
        }


# Serve static assets
frontend_dist_path = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
)
assets_path = os.path.join(frontend_dist_path, "assets")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
else:
    print(f"Warning: Static assets path not found at {assets_path}. Run 'npm run build' first.")

# Catch-all route to serve the React frontend index.html for all other paths
@app.get("/{catchall:path}")
async def serve_frontend(catchall: str):
    index_file = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    raise HTTPException(
        status_code=404, 
        detail=f"Frontend build index.html not found at {index_file}. Run 'npm run build' first."
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
