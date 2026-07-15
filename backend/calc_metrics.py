import json, statistics, os

path = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
with open(path) as f:
    d = json.load(f)

m = d["metrics"]
samples = d["samples"]

print("=== CORE METRICS ===")
print("Total samples evaluated :", m["total_samples"])
print("Accuracy                 :", round(m["accuracy"]*100, 1), "%")
print("Precision                :", round(m["precision"]*100, 1), "%")
print("Recall                   :", round(m["recall"]*100, 1), "%")
print("F1 Score                 :", round(m["f1_score"]*100, 1), "%")
print("True Positives           :", m["true_positives"])
print("True Negatives           :", m["true_negatives"])
print("False Positives          :", m["false_positives"])
print("False Negatives          :", m["false_negatives"])

normal_scores  = [s["anomaly_score"] for s in samples if s["actual"] == "normal"]
anomaly_scores = [s["anomaly_score"] for s in samples if s["actual"] == "anomaly"]
all_scores     = [s["anomaly_score"] for s in samples]

sep = statistics.mean(anomaly_scores) - statistics.mean(normal_scores)

print("\n=== SCORE SEPARATION ===")
print("Normal mean anomaly score :", round(statistics.mean(normal_scores), 4))
print("Anomaly mean anomaly score:", round(statistics.mean(anomaly_scores), 4))
print("Class separation gap      :", round(sep, 4))
print("Normal score stdev        :", round(statistics.stdev(normal_scores), 4))
print("Anomaly score stdev       :", round(statistics.stdev(anomaly_scores), 4))

print("\n=== PER-CATEGORY BREAKDOWN ===")
cats = {}
for s in samples:
    c = s["category"]
    if c not in cats:
        cats[c] = {"total": 0, "correct": 0}
    cats[c]["total"] += 1
    if s["is_correct"]:
        cats[c]["correct"] += 1

for cat, v in cats.items():
    acc = round(v["correct"] / v["total"] * 100)
    print(f"  {cat:20s}: {v['correct']}/{v['total']} correct = {acc}%")

print("\n=== PATCH-LEVEL STATS ===")
mean_sims = [s["mean_similarity"] for s in samples]
print("Mean cosine similarity (all):", round(statistics.mean(mean_sims), 4))
normal_sims  = [s["mean_similarity"] for s in samples if s["actual"] == "normal"]
anomalysims = [s["mean_similarity"] for s in samples if s["actual"] == "anomaly"]
print("Mean cosine sim (normal) :", round(statistics.mean(normal_sims), 4))
print("Mean cosine sim (anomaly):", round(statistics.mean(anomalysims), 4))

print("\n=== DATASET COVERAGE ===")
print("Defect categories tested :", len([c for c in cats if c != "good"]))
print("Normal test images       :", cats.get("good", {}).get("total", 0))
print("Anomaly test images      :", sum(v["total"] for c,v in cats.items() if c != "good"))
