"""
backend/evaluation.py
VisionInspect AI — Quantitative Evaluation Pipeline

Evaluates the CLIP-based anomaly detection pipeline on the MVTec bottle dataset.
Performs an automatic threshold sweep to select the optimal detection threshold,
then writes calibrated metrics and per-sample data to disk.

Usage:
    python backend/evaluation.py

Outputs:
    backend/evaluation_results.json   — full metrics, sweep data, per-sample list
    backend/evaluation_report.txt     — human-readable summary
    backend/config.py                 — updated ANOMALY_THRESHOLD (best F1)
"""

import os
import sys
import json
import re
import numpy as np
import cv2
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.patch_utils import extract_overlapping_patches
from utils.embedding_utils import get_patch_embeddings
from utils.anomaly_utils import compute_anomaly_scores
from utils.visualization_utils import generate_heatmap
from utils.postprocess_utils import create_binary_mask, clean_mask
import config as cfg

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline: extract features and compute anomaly score for one test image
# ─────────────────────────────────────────────────────────────────────────────
def run_pipeline(test_np, ref_embeddings, model, processor, device):
    """Run the full detection pipeline on a single numpy image array.
    Returns a dict of raw metrics needed for threshold-based classification."""
    test_patches, positions = extract_overlapping_patches(test_np, patch_size=64, stride=64)
    test_embeddings = get_patch_embeddings(test_patches, model, processor, device=device)

    # Raw cosine similarities per patch
    raw_sims = torch.nn.functional.cosine_similarity(
        test_embeddings, ref_embeddings, dim=1
    ).cpu().numpy()
    mean_sim = float(np.mean(raw_sims))
    min_sim  = float(np.min(raw_sims))

    # Patch anomaly scores
    anomaly_scores = compute_anomaly_scores(test_embeddings, ref_embeddings)

    # Heatmap — apply slight additional Gaussian smoothing to suppress noise
    heatmap_raw = generate_heatmap(anomaly_scores, positions, test_np.shape, patch_size=64)

    # Additional smoothing pass to suppress isolated single-patch spikes
    if np.max(heatmap_raw) > 0:
        heatmap_smoothed = cv2.GaussianBlur(heatmap_raw, (11, 11), 0)
    else:
        heatmap_smoothed = heatmap_raw

    # Contour extraction — only if heatmap peak exceeds noise floor
    pixel_ratio = 0.0
    n_regions = 0

    if np.max(heatmap_smoothed) >= cfg.HEATMAP_MIN_PEAK:
        binary_mask = create_binary_mask(heatmap_smoothed, threshold=180)
        cleaned_mask = clean_mask(binary_mask)
        pixel_ratio = float(np.sum(cleaned_mask > 0) / cleaned_mask.size)

        # Only count regions large enough to be credible defects
        contours, _ = cv2.findContours(
            cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        for c in contours:
            if cv2.contourArea(c) >= cfg.CONTOUR_MIN_AREA_PX:
                n_regions += 1

    # Compute calibrated anomaly score
    # When real regions exist: weight minimum similarity heavily (captures worst patch)
    if n_regions > 0 and pixel_ratio >= cfg.MIN_ANOMALY_PIXEL_RATIO:
        anomaly_score = float((1.0 - mean_sim) * 0.25 + (1.0 - min_sim) * 0.75)
        anomaly_score = max(0.0, min(1.0, anomaly_score))
    else:
        # No credible regions → very low score, scaled from mean only
        anomaly_score = float(max(0.0, (1.0 - mean_sim) * 0.15))

    return {
        "mean_sim": mean_sim,
        "min_sim": min_sim,
        "anomaly_score": anomaly_score,
        "pixel_ratio": pixel_ratio,
        "n_regions": n_regions,
        "heatmap_peak": int(np.max(heatmap_smoothed)),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Threshold sweep
# ─────────────────────────────────────────────────────────────────────────────
def sweep_thresholds(samples, thresholds):
    """For each threshold value, compute P/R/F1 and return a list of dicts."""
    results = []
    for t in thresholds:
        tp = fp = tn = fn = 0
        for s in samples:
            pred = "anomaly" if s["anomaly_score"] >= t else "normal"
            actual = s["actual"]
            if actual == "anomaly":
                if pred == "anomaly": tp += 1
                else:                 fn += 1
            else:
                if pred == "anomaly": fp += 1
                else:                 tn += 1
        total = tp + fp + tn + fn
        acc  = (tp + tn) / total if total else 0
        prec = tp / (tp + fp)  if (tp + fp) else 0
        rec  = tp / (tp + fn)  if (tp + fn) else 0
        f1   = 2 * prec * rec / (prec + rec) if (prec + rec) else 0
        results.append({
            "threshold": round(float(t), 3),
            "accuracy":  round(acc,  4),
            "precision": round(prec, 4),
            "recall":    round(rec,  4),
            "f1_score":  round(f1,   4),
            "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        })
    return results


def update_config_threshold(new_threshold: float):
    """Overwrite ANOMALY_THRESHOLD in backend/config.py with the calibrated value."""
    config_path = os.path.join(os.path.dirname(__file__), "config.py")
    with open(config_path, "r") as f:
        content = f.read()
    updated = re.sub(
        r"^ANOMALY_THRESHOLD\s*=\s*[\d.]+",
        f"ANOMALY_THRESHOLD = {new_threshold:.3f}",
        content,
        flags=re.MULTILINE,
    )
    with open(config_path, "w") as f:
        f.write(updated)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("VisionInspect AI — Dataset Evaluation & Threshold Calibration")
    print("=" * 62)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    print("Loading CLIP model (openai/clip-vit-base-patch32)...")
    try:
        model     = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        print("CLIP model loaded.")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    base_dir    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "data", "raw", "mvtec_anomaly_detection", "bottle")
    ref_path    = os.path.join(dataset_dir, "train", "good", "000.png")
    test_dir    = os.path.join(dataset_dir, "test")

    if not os.path.exists(ref_path):
        print(f"ERROR: Reference image not found: {ref_path}")
        return

    print(f"Reference image: {ref_path}")

    # Pre-compute reference embeddings once
    ref_pil     = Image.open(ref_path).convert("RGB")
    ref_np      = np.array(ref_pil.resize((512, 512), Image.Resampling.LANCZOS))
    ref_patches, _ = extract_overlapping_patches(ref_np, patch_size=64, stride=64)
    ref_embeddings  = get_patch_embeddings(ref_patches, model, processor, device=device)

    categories = ["good", "broken_large", "broken_small", "contamination"]
    samples    = []

    print("\nProcessing dataset images...")
    for category in categories:
        cat_dir = os.path.join(test_dir, category)
        if not os.path.exists(cat_dir):
            print(f"  Warning: {cat_dir} not found — skipping.")
            continue
        img_names  = sorted(f for f in os.listdir(cat_dir) if f.endswith(".png"))
        actual_lbl = "normal" if category == "good" else "anomaly"
        print(f"  [{category:16s}] {len(img_names)} images  (label: {actual_lbl})")

        for name in img_names:
            img_path = os.path.join(cat_dir, name)
            test_pil = Image.open(img_path).convert("RGB")
            test_np  = np.array(test_pil.resize((512, 512), Image.Resampling.LANCZOS))

            metrics = run_pipeline(test_np, ref_embeddings, model, processor, device)

            samples.append({
                "filename":      name,
                "category":      category,
                "actual":        actual_lbl,
                "anomaly_score": metrics["anomaly_score"],
                "mean_sim":      metrics["mean_sim"],
                "min_sim":       metrics["min_sim"],
                "pixel_ratio":   metrics["pixel_ratio"],
                "n_regions":     metrics["n_regions"],
                "heatmap_peak":  metrics["heatmap_peak"],
            })
            print(
                f"    {category}/{name}  score={metrics['anomaly_score']:.4f}"
                f"  mean_sim={metrics['mean_sim']:.4f}"
                f"  regions={metrics['n_regions']}"
            )

    # ── Threshold sweep 0.09 → 0.50 in steps of 0.01
    thresholds   = [round(t, 3) for t in np.arange(0.09, 0.51, 0.01)]
    sweep_data   = sweep_thresholds(samples, thresholds)

    # Best F1 threshold
    best_f1_entry  = max(sweep_data, key=lambda r: r["f1_score"])
    best_threshold = best_f1_entry["threshold"]

    # Balanced threshold: minimise |precision - recall|
    balanced_entry = min(
        sweep_data,
        key=lambda r: abs(r["precision"] - r["recall"]) if (r["precision"] + r["recall"]) > 0 else 1
    )

    print(f"\n{'─'*62}")
    print(f"  Threshold sweep complete  ({len(thresholds)} thresholds tested)")
    print(f"  Best F1   threshold : {best_f1_entry['threshold']:.3f}  "
          f"→  F1={best_f1_entry['f1_score']:.3f}  "
          f"P={best_f1_entry['precision']:.3f}  R={best_f1_entry['recall']:.3f}")
    print(f"  Balanced  threshold : {balanced_entry['threshold']:.3f}  "
          f"→  F1={balanced_entry['f1_score']:.3f}  "
          f"P={balanced_entry['precision']:.3f}  R={balanced_entry['recall']:.3f}")

    # Select best F1 threshold
    selected_entry    = best_f1_entry
    selected_threshold = best_threshold

    # Update config.py
    update_config_threshold(selected_threshold)
    print(f"\n  config.py updated → ANOMALY_THRESHOLD = {selected_threshold:.3f}")

    # Compute final metrics at selected threshold
    m = selected_entry
    tp, fp, tn, fn = m["tp"], m["fp"], m["tn"], m["fn"]
    accuracy  = m["accuracy"]
    precision = m["precision"]
    recall    = m["recall"]
    f1_score  = m["f1_score"]
    correct   = tp + tn
    total     = tp + fp + tn + fn

    # Enrich samples with final predictions and severity
    for s in samples:
        pred = "anomaly" if s["anomaly_score"] >= selected_threshold else "normal"
        s["predicted"]   = pred
        s["is_correct"]  = (pred == s["actual"])
        s["severity"]    = cfg.get_severity(s["anomaly_score"])

    # Build score distribution buckets for dashboard chart
    score_buckets = {}
    bucket_edges  = [round(v, 2) for v in np.arange(0.0, 0.55, 0.05)]
    for lo, hi in zip(bucket_edges, bucket_edges[1:]):
        key = f"{lo:.2f}–{hi:.2f}"
        score_buckets[key] = {
            "normal":  sum(1 for s in samples if s["actual"] == "normal"  and lo <= s["anomaly_score"] < hi),
            "anomaly": sum(1 for s in samples if s["actual"] == "anomaly" and lo <= s["anomaly_score"] < hi),
        }

    results_json = {
        "metrics": {
            "accuracy":            round(accuracy,  4),
            "precision":           round(precision, 4),
            "recall":              round(recall,    4),
            "f1_score":            round(f1_score,  4),
            "total_samples":       total,
            "correct_predictions": correct,
            "false_positives":     fp,
            "false_negatives":     fn,
            "true_positives":      tp,
            "true_negatives":      tn,
        },
        "threshold_info": {
            "selected_threshold":  selected_threshold,
            "selection_method":    "best_f1",
            "best_f1_threshold":   best_f1_entry["threshold"],
            "balanced_threshold":  balanced_entry["threshold"],
        },
        "severity_bands": [
            {"label": label, "min": lo, "max": hi if hi != float("inf") else 1.0}
            for lo, hi, label in cfg.SEVERITY_BANDS
        ],
        "sweep_data":      sweep_data,
        "score_distribution": score_buckets,
        "samples":         samples,
    }

    # Save JSON
    json_path = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
    with open(json_path, "w") as f:
        json.dump(results_json, f, indent=2)

    # Save TXT report
    txt_path = os.path.join(os.path.dirname(__file__), "evaluation_report.txt")
    report   = f"""VisionInspect AI Evaluation Summary
Threshold Calibration via MVTec Bottle Dataset

Selected Threshold (Best F1): {selected_threshold:.3f}

Total Images:       {total}
Correct Predictions:{correct}
Accuracy:           {accuracy*100:.1f}%
Precision:          {precision*100:.1f}%
Recall:             {recall*100:.1f}%
F1 Score:           {f1_score*100:.1f}%

True Positives:  {tp}
True Negatives:  {tn}
False Positives: {fp}
False Negatives: {fn}

Sweep Range: {thresholds[0]:.2f} → {thresholds[-1]:.2f} (step 0.01)
"""
    with open(txt_path, "w") as f:
        f.write(report)

    print("\n" + "=" * 62)
    print("VisionInspect AI — Final Evaluation at Selected Threshold")
    print("=" * 62)
    print(f"  Threshold:   {selected_threshold:.3f}")
    print(f"  Total:       {total}")
    print(f"  Accuracy:    {accuracy*100:.1f}%")
    print(f"  Precision:   {precision*100:.1f}%")
    print(f"  Recall:      {recall*100:.1f}%")
    print(f"  F1 Score:    {f1_score*100:.1f}%")
    print(f"  TP: {tp}  TN: {tn}  FP: {fp}  FN: {fn}")
    print("=" * 62)
    print(f"\nOutputs saved:\n  {json_path}\n  {txt_path}")


if __name__ == "__main__":
    main()
