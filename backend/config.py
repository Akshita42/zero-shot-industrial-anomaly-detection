# backend/config.py
# VisionInspect AI — Centralized Anomaly Threshold Configuration
#
# This file stores calibrated thresholds derived from the MVTec bottle
# evaluation sweep. All backend logic reads from here to ensure consistency
# across the /analyze API endpoint and the evaluation pipeline.

# ─── Primary Detection Threshold ──────────────────────────────────────────────
# Any image with anomaly_score >= ANOMALY_THRESHOLD is classified as anomalous.
# This value is selected by threshold sweep (best F1 score on MVTec bottle).
# Update by re-running: python backend/evaluation.py
ANOMALY_THRESHOLD = 0.12

# ─── Severity Band Definitions ─────────────────────────────────────────────────
# These bands map anomaly_score ranges to human-readable severity labels.
# The frontend reads these from backend API responses — never computed client-side.
SEVERITY_BANDS = [
    (0.00, ANOMALY_THRESHOLD,   "STRUCTURE VERIFIED"),
    (ANOMALY_THRESHOLD, 0.25,   "MINOR VISUAL VARIATION"),
    (0.25, 0.45,                "STRUCTURAL DEVIATION"),
    (0.45, float("inf"),        "HIGH ANOMALY"),
]

# ─── Heatmap Noise Suppression ─────────────────────────────────────────────────
# Minimum heatmap peak intensity required before contour extraction is attempted.
# Heatmaps with max value below this are treated as noise.
HEATMAP_MIN_PEAK = 20

# ─── Contour Filtering ─────────────────────────────────────────────────────────
# Minimum contour area in pixels² required to register a detected region.
CONTOUR_MIN_AREA_PX = 800

# ─── Anomaly Pixel Ratio Gate ──────────────────────────────────────────────────
# Minimum fraction of image pixels that must be flagged anomalous for the
# classification to proceed. Suppresses isolated single-patch spikes.
MIN_ANOMALY_PIXEL_RATIO = 0.005   # 0.5% of image area

# ─── Similarity Tolerance ──────────────────────────────────────────────────────
# Images above these similarity thresholds are immediately classified as nominal,
# bypassing contour and score logic entirely.
NOMINAL_MEAN_SIM_THRESHOLD = 0.985
NOMINAL_MIN_SIM_THRESHOLD = 0.960

def get_severity(anomaly_score: float) -> str:
    """Return the severity label for a given anomaly score using SEVERITY_BANDS."""
    for lo, hi, label in SEVERITY_BANDS:
        if lo <= anomaly_score < hi:
            return label
    return "HIGH ANOMALY"
