import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { 
  Upload, Trash2, Play, RefreshCw, Layers, ShieldCheck, 
  HelpCircle, Info, ChevronRight, AlertTriangle, CheckCircle, 
  FileText, Activity, BookOpen, Video, Clock, Download,
  BarChart2, History, X, AlertCircle, Zap
} from 'lucide-react';
import LiveInspection from './LiveInspection';

// ─── Severity helpers ──────────────────────────────────────────────────────────
function getSeverityConfig(status) {
  switch (status) {
    case 'STRUCTURE VERIFIED':
      return {
        bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        bar: 'bg-emerald-500', barWidth: '5%'
      };
    case 'MINOR VISUAL VARIATION':
      return {
        bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400',
        icon: <Info className="w-3.5 h-3.5" />,
        bar: 'bg-amber-400', barWidth: '30%'
      };
    case 'STRUCTURAL DEVIATION':
      return {
        bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        bar: 'bg-orange-500', barWidth: '65%'
      };
    case 'HIGH ANOMALY':
      return {
        bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        bar: 'bg-red-500', barWidth: '95%'
      };
    // Legacy labels from older results
    case 'MODERATE ANOMALY':
      return {
        bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        bar: 'bg-orange-500', barWidth: '65%'
      };
    case 'SEVERE ANOMALY':
      return {
        bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        bar: 'bg-red-500', barWidth: '95%'
      };
    default:
      return {
        bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400',
        icon: <Info className="w-3.5 h-3.5" />,
        bar: 'bg-slate-500', barWidth: '50%'
      };
  }
}

// ─── localStorage history helpers ──────────────────────────────────────────────
const HISTORY_KEY = 'visioninspect_history';

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(entry) {
  const existing = loadHistory();
  const updated = [entry, ...existing].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  return [];
}

// ─── PDF Export ────────────────────────────────────────────────────────────────
async function exportPDF(results, inspectionType = 'Upload Inspection') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 14;
  let y = 0;

  // Background
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, W, 297, 'F');

  // Header bar
  doc.setFillColor(0, 180, 216);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('VisionInspect AI', margin, 11);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Reference-Based Anomaly Localization System — Academic Research Demo', margin, 17);
  doc.text(`Inspection Report · Generated: ${new Date().toLocaleString()}`, margin, 23);
  y = 35;

  // Inspection type badge
  doc.setFontSize(8);
  doc.setTextColor(150, 180, 220);
  doc.text('INSPECTION TYPE', margin, y);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(inspectionType, margin, y + 5);
  y += 15;

  // Severity status
  const sc = getSeverityConfig(results.status);
  const colors = {
    'STRUCTURE VERIFIED': [52, 211, 153],
    'MINOR VISUAL VARIATION': [251, 191, 36],
    'MODERATE ANOMALY': [249, 115, 22],
    'SEVERE ANOMALY': [239, 68, 68],
  };
  const [r, g, b] = colors[results.status] || [148, 163, 184];
  doc.setFillColor(r, g, b, 0.15);
  doc.roundedRect(margin, y - 4, W - margin * 2, 12, 2, 2, 'F');
  doc.setTextColor(r, g, b);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`● ${results.status}`, margin + 3, y + 4);
  y += 16;

  // Metrics table
  doc.setFontSize(8);
  doc.setTextColor(100, 140, 180);
  doc.text('SIMILARITY METRICS', margin, y);
  y += 6;
  const mRows = [
    ['Mean Patch Similarity', results.metrics.mean_similarity.toFixed(4)],
    ['Min Patch Similarity', results.metrics.min_similarity.toFixed(4)],
    ['Anomaly Score', results.anomaly_score.toFixed(4)],
    ['Anomaly Area Ratio', `${(results.metrics.anomaly_pixel_ratio * 100).toFixed(2)}%`],
    ['Detected Regions', String(results.detected_regions.length)],
  ];
  mRows.forEach(([label, value], i) => {
    const rowY = y + i * 7;
    doc.setFillColor(i % 2 === 0 ? 20 : 16, i % 2 === 0 ? 25 : 20, i % 2 === 0 ? 40 : 35);
    doc.rect(margin, rowY - 3, W - margin * 2, 7, 'F');
    doc.setTextColor(160, 180, 210);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 2, rowY + 1);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(value, W - margin - 2, rowY + 1, { align: 'right' });
  });
  y += mRows.length * 7 + 6;

  // Interpretation Layer
  doc.setFontSize(8);
  doc.setTextColor(100, 140, 180);
  doc.text('INTERPRETATION LAYER', margin, y);
  y += 5;
  doc.setFillColor(18, 22, 40);
  doc.roundedRect(margin, y, W - margin * 2, 24, 2, 2, 'F');
  doc.setTextColor(200, 215, 235);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const wrapped = doc.splitTextToSize(results.explanation, W - margin * 2 - 4);
  doc.text(wrapped.slice(0, 4), margin + 2, y + 6);
  y += 30;

  // Images
  const imgW = (W - margin * 2 - 9) / 4;
  const imgH = imgW;
  const imgLabels = ['Test Image', 'Heatmap', 'Overlay Map', 'Defect Detection'];
  const imgSrcs = [results.test_image, results.heatmap, results.overlay, results.defect_detection];

  doc.setFontSize(8);
  doc.setTextColor(100, 140, 180);
  doc.text('VISUAL OUTPUTS', margin, y);
  y += 5;

  imgSrcs.forEach((src, i) => {
    const x = margin + i * (imgW + 3);
    doc.setFillColor(15, 20, 38);
    doc.roundedRect(x, y, imgW, imgH, 2, 2, 'F');
    try {
      const fmt = src.includes('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(src, fmt, x, y, imgW, imgH);
    } catch (_) {}
    doc.setTextColor(120, 150, 190);
    doc.setFontSize(6.5);
    doc.text(imgLabels[i], x + imgW / 2, y + imgH + 4, { align: 'center' });
  });
  y += imgH + 10;

  // Footer
  doc.setFillColor(0, 120, 160);
  doc.rect(0, 287, W, 10, 'F');
  doc.setTextColor(200, 240, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('VisionInspect AI · Academic Research Demo · CLIP-Based Visual Anomaly Localization', W / 2, 293, { align: 'center' });

  doc.save(`VisionInspect_Report_${Date.now()}.pdf`);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Playground() {
  const [activeTab, setActiveTab] = useState('upload');

  // Upload states
  const [refFile, setRefFile] = useState(null);
  const [refPreview, setRefPreview] = useState(null);
  const [testFile, setTestFile] = useState(null);
  const [testPreview, setTestPreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisError, setAnalysisError] = useState(null);
  const [results, setResults] = useState(null);
  const [showExplanation, setShowExplanation] = useState(true);

  // History
  const [history, setHistory] = useState(loadHistory);

  // Evaluation data
  const [evalData, setEvalData] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState(null);

  const steps = [
    "Extracting image patches (64×64 grid)...",
    "Generating CLIP embeddings via PyTorch...",
    "Comparing patch visual similarities...",
    "Generating anomaly heatmap matrices...",
    "Localizing suspicious regions via OpenCV...",
  ];

  useEffect(() => {
    let interval;
    if (isAnalyzing) {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Load evaluation when tab opens
  useEffect(() => {
    if (activeTab === 'evaluation') fetchEvaluation();
  }, [activeTab]);

  async function fetchEvaluation() {
    setEvalLoading(true);
    setEvalError(null);
    try {
      const res = await fetch('/evaluation');
      if (!res.ok) throw new Error('Could not load evaluation data.');
      const data = await res.json();
      setEvalData(data);
    } catch (e) {
      setEvalError(e.message);
    } finally {
      setEvalLoading(false);
    }
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    processFile(file, type);
  };

  const processFile = (file, type) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'ref') { setRefFile(file); setRefPreview(e.target.result); }
      else { setTestFile(file); setTestPreview(e.target.result); }
    };
    reader.readAsDataURL(file);
    setResults(null);
    setAnalysisError(null);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0], type);
  };

  const handleReset = () => {
    setRefFile(null); setRefPreview(null);
    setTestFile(null); setTestPreview(null);
    setResults(null); setAnalysisError(null); setIsAnalyzing(false);
  };

  const handleAnalyze = async () => {
    if (!refFile || !testFile) return;
    setIsAnalyzing(true); setAnalysisError(null); setResults(null);
    const formData = new FormData();
    formData.append('reference', refFile);
    formData.append('test', testFile);
    try {
      const response = await fetch('/analyze', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Server returned status code: ${response.status}.`);
      const data = await response.json();
      setResults(data);
      // Save to history
      const entry = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        type: 'Upload Inspection',
        status: data.status,
        anomaly_score: data.anomaly_score,
        mean_similarity: data.metrics.mean_similarity,
        thumbnail: data.test_image,
      };
      setHistory(saveHistory(entry));
    } catch (err) {
      setAnalysisError(err.message || 'Failed to connect to backend.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sc = results ? getSeverityConfig(results.status) : null;

  // ── Sidebar nav items
  const navItems = [
    { id: 'upload', icon: <Upload className="w-4 h-4 shrink-0" />, label: 'Upload Inspection', sub: 'Image File Analysis' },
    { id: 'live', icon: <Video className="w-4 h-4 shrink-0" />, label: 'Dynamic Inspection', sub: 'Webcam Frame Comparison' },
    { id: 'evaluation', icon: <BarChart2 className="w-4 h-4 shrink-0" />, label: 'Evaluation', sub: 'MVTec Dataset Metrics' },
    { id: 'how-it-works', icon: <Layers className="w-4 h-4 shrink-0" />, label: 'How It Works', sub: null },
    { id: 'about', icon: <BookOpen className="w-4 h-4 shrink-0" />, label: 'About Project', sub: null },
  ];

  return (
    <div className="relative min-h-screen bg-dark-deep flex z-10 pt-16">

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-dark-deep/50 shrink-0 hidden md:flex flex-col p-6">
        <div className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase mb-8">
          Project Panel
        </div>
        <nav className="flex flex-col gap-1.5 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-mono tracking-tight transition-all cursor-pointer text-left ${activeTab === item.id ? 'bg-cyan-glow/5 border border-cyan-glow/20 text-cyan-glow font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              {item.icon}
              <div className="leading-tight">
                <div>{item.label}</div>
                {item.sub && <div className="text-[9px] opacity-60 font-normal">{item.sub}</div>}
              </div>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/5 pt-4 text-[10px] font-mono text-slate-600">
          <div>Status: API Ready</div>
          <div className="mt-1">Host: 127.0.0.1:8000</div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto overflow-y-auto w-full">

        {/* ══ TAB: UPLOAD INSPECTION ══ */}
        {activeTab === 'upload' && (
          <div className="space-y-8 animate-fadeIn">

            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Reference-Based Defect Inspection
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-3xl">
                Compare a test image against a defect-free reference image using CLIP patch-level cosine similarity analysis.
              </p>
            </div>

            {/* Error */}
            {analysisError && (
              <div className="border border-red-500/20 bg-red-950/20 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <strong className="font-bold">Backend Error:</strong>
                  <p className="mt-1 text-slate-300 text-xs">{analysisError}</p>
                </div>
              </div>
            )}

            {/* Upload Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { type: 'ref', label: 'Reference Image', hint: 'Defect-free baseline target', preview: refPreview },
                { type: 'test', label: 'Test Image', hint: 'Sample under inspection', preview: testPreview },
              ].map(({ type, label, hint, preview }) => (
                <div
                  key={type}
                  onDrop={(e) => handleDrop(e, type)}
                  onDragOver={(e) => e.preventDefault()}
                  className="border border-dashed border-white/10 rounded-xl p-5 flex flex-col gap-3 bg-white/2 hover:border-cyan-glow/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">{label}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>
                    </div>
                    {preview && (
                      <button onClick={() => { if (type === 'ref') { setRefFile(null); setRefPreview(null); } else { setTestFile(null); setTestPreview(null); } setResults(null); }} className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {preview ? (
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-dark-deep border border-white/5">
                      <img src={preview} alt={label} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <label className="aspect-square w-full rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/3 transition-all gap-3">
                      <Upload className="w-8 h-8 text-slate-600" />
                      <span className="text-xs text-slate-500 font-mono">Click or drag to upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, type)} />
                    </label>
                  )}
                </div>
              ))}
            </div>

            {/* Action Row */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!refFile || !testFile || isAnalyzing}
                className="flex items-center gap-2 px-6 py-2.5 bg-cyan-glow text-dark-deep font-bold text-sm rounded-lg font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 cursor-pointer"
              >
                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
              <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-sm font-mono transition-all cursor-pointer">
                <Trash2 className="w-4 h-4" />
                Reset
              </button>
            </div>

            {/* Processing Steps */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-cyan-glow/10 bg-cyan-glow/2 p-5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                    <RefreshCw className="w-4 h-4 text-cyan-glow animate-spin" />
                    <span className="text-xs font-mono font-bold tracking-widest text-white uppercase">Inspection Pipeline Processing</span>
                  </div>
                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <div key={idx} className={`flex items-center gap-3 text-xs font-mono transition-colors ${currentStep > idx ? 'text-cyan-glow font-bold' : currentStep === idx ? 'text-white' : 'text-slate-600'}`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${currentStep > idx ? 'border-cyan-glow bg-cyan-glow/10 text-cyan-glow' : currentStep === idx ? 'border-white bg-white/5' : 'border-slate-800 text-slate-700'}`}>
                          {currentStep > idx ? '✓' : idx + 1}
                        </div>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
              {results && sc && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 animate-fadeIn pt-4">
                  <div className="border-t border-white/5 pt-8">
                    <h3 className="text-xl font-bold text-white tracking-tight mb-1">Visual Inspection Outputs</h3>
                    <p className="text-xs text-slate-500">FastAPI backend outputs generated from OpenAI CLIP similarity comparisons.</p>
                  </div>

                  {/* 5-col image grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { src: results.reference_image, label: '1. Reference', cls: 'text-slate-400', border: 'border-white/5' },
                      { src: results.test_image, label: '2. Test Image', cls: 'text-slate-400', border: 'border-white/5' },
                      { src: results.heatmap, label: '3. Heatmap', cls: 'text-cyan-glow', border: 'border-white/5' },
                      { src: results.overlay, label: '4. Overlay Map', cls: 'text-purple-400', border: 'border-white/5' },
                      { src: results.defect_detection, label: '5. Defect Detection', cls: 'text-cyan-glow', border: 'border-cyan-glow/10' },
                    ].map(({ src, label, cls, border }) => (
                      <div key={label} className={`border ${border} bg-white/2 p-3 rounded-lg flex flex-col`}>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 block ${cls}`}>{label}</span>
                        <div className="aspect-square w-full rounded bg-dark-deep overflow-hidden border border-white/5 flex items-center justify-center">
                          <img src={src} alt={label} className="w-full h-full object-contain" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Report Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Report panel */}
                    <div className="lg:col-span-2 border border-white/5 bg-white/2 rounded-xl p-6 flex flex-col gap-5">
                      <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">Inspection Report Summary</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold uppercase ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {sc.icon}
                          {results.status}
                        </span>
                      </div>

                      {/* Severity bar */}
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1.5">
                          <span>Anomaly Severity Level</span>
                          <span className={sc.text}>{results.status}</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${sc.bar} rounded-full transition-all duration-700`} style={{ width: sc.barWidth }} />
                        </div>
                      </div>

                      {/* Interpretation Layer */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">Interpretation Layer</span>
                          <button onClick={() => setShowExplanation(!showExplanation)} className="text-[10px] font-mono text-slate-500 hover:text-cyan-glow cursor-pointer transition-colors">
                            {showExplanation ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        {showExplanation && (
                          <div className="p-4 rounded-lg bg-dark-deep/60 border border-white/5">
                            <p className="text-slate-300 text-xs leading-relaxed">{results.explanation}</p>
                          </div>
                        )}
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Avg. Patch Similarity', val: results.metrics.mean_similarity.toFixed(4) },
                          { label: 'Min Patch Similarity', val: results.metrics.min_similarity.toFixed(4) },
                          { label: 'Anomaly Area Ratio', val: `${(results.metrics.anomaly_pixel_ratio * 100).toFixed(2)}%` },
                        ].map(({ label, val }) => (
                          <div key={label} className="border border-white/5 bg-dark-deep/40 p-3 rounded-lg">
                            <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold block mb-1">{label}</span>
                            <span className="text-lg font-bold text-white font-mono">{val}</span>
                          </div>
                        ))}
                      </div>

                      {/* Export Button */}
                      <button
                        onClick={() => exportPDF(results, 'Upload Inspection')}
                        className="flex items-center gap-2 px-4 py-2.5 border border-cyan-glow/20 bg-cyan-glow/5 text-cyan-glow hover:bg-cyan-glow/10 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 self-start"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export Inspection Report (PDF)
                      </button>
                    </div>

                    {/* Regions panel */}
                    <div className="border border-white/5 bg-white/2 rounded-xl p-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="pb-3 border-b border-white/5">
                          <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">Localized Coordinates</span>
                        </div>
                        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                          {results.detected_regions.length === 0 ? (
                            <p className="text-xs text-slate-500 font-mono italic">No bounding contours detected.</p>
                          ) : (
                            results.detected_regions.map((reg) => (
                              <div key={reg.id} className="border border-white/5 bg-dark-deep/40 p-3 rounded text-[11px] font-mono text-slate-400 leading-normal flex items-center justify-between">
                                <div>
                                  <div className="text-white font-bold mb-1">Region #{reg.id + 1}</div>
                                  <div>X: {reg.x.toFixed(1)}% | Y: {reg.y.toFixed(1)}%</div>
                                  <div>W: {reg.width.toFixed(1)}% | H: {reg.height.toFixed(1)}%</div>
                                </div>
                                <span className="text-[10px] text-cyan-glow font-bold border border-cyan-glow/20 bg-cyan-glow/5 px-2 py-0.5 rounded">{reg.area_px} px²</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between text-xs font-mono text-slate-400">
                          <span>Anomaly Score:</span>
                          <span className="text-white font-bold">{results.anomaly_score.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono text-slate-400">
                          <span>Max Local Deviation:</span>
                          <span className={`${sc.text} font-bold`}>{(Math.max(0, (1 - results.metrics.min_similarity) * 100)).toFixed(1)}%</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-600 border-t border-white/5 pt-1.5">
                          *Derived from (1 − min cosine similarity) × 100
                        </div>
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            {/* History Panel */}
            {history.length > 0 && (
              <div className="border border-white/5 bg-white/2 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Recent Inspections</span>
                  </div>
                  <button onClick={() => setHistory(clearHistory())} className="text-[10px] font-mono text-slate-600 hover:text-red-400 cursor-pointer transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear History
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {history.slice(0, 5).map((entry) => {
                    const hsc = getSeverityConfig(entry.status);
                    return (
                      <div key={entry.id} className="border border-white/5 bg-dark-deep/40 rounded-lg p-2.5 flex flex-col gap-2">
                        <div className="aspect-square w-full rounded bg-dark-deep overflow-hidden border border-white/5">
                          {entry.thumbnail && <img src={entry.thumbnail} alt="preview" className="w-full h-full object-contain" />}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${hsc.bg} ${hsc.text} border ${hsc.border} w-full truncate`}>
                          {hsc.icon}
                          <span className="truncate">{entry.status}</span>
                        </span>
                        <div className="text-[9px] font-mono text-slate-500 space-y-0.5">
                          <div className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{entry.timestamp}</div>
                          <div className="text-slate-600">{entry.type}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══ TAB: DYNAMIC INSPECTION ══ */}
        {activeTab === 'live' && <LiveInspection onHistoryUpdate={(entry) => setHistory(saveHistory(entry))} />}

        {/* ══ TAB: EVALUATION DASHBOARD ══ */}
        {activeTab === 'evaluation' && (
          <div className="space-y-8 animate-fadeIn max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Quantitative Evaluation</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Automated benchmark on MVTec bottle dataset with threshold calibration sweep.
                  Run <code className="text-cyan-glow bg-cyan-glow/5 px-1 py-0.5 rounded text-xs">python backend/evaluation.py</code> to regenerate.
                </p>
              </div>
              <button onClick={fetchEvaluation} disabled={evalLoading} className="flex items-center gap-2 px-4 py-2 border border-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-mono transition-all cursor-pointer">
                <RefreshCw className={`w-3.5 h-3.5 ${evalLoading ? 'animate-spin' : ''}`} /> Reload
              </button>
            </div>

            {evalLoading && (
              <div className="flex items-center gap-3 text-slate-400 text-sm font-mono">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-glow" /> Loading evaluation results...
              </div>
            )}

            {evalError && (
              <div className="border border-amber-500/20 bg-amber-950/20 text-amber-400 p-5 rounded-xl text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-1">Evaluation data not found</strong>
                  <p className="text-xs text-slate-400 leading-relaxed">Run the evaluation pipeline from your terminal:</p>
                  <code className="block mt-2 bg-dark-deep text-cyan-glow text-xs p-3 rounded-lg border border-white/5">python backend/evaluation.py</code>
                  <p className="text-xs text-slate-500 mt-2">Saves results to <code className="text-cyan-glow">backend/evaluation_results.json</code> and auto-calibrates <code className="text-cyan-glow">backend/config.py</code>.</p>
                </div>
              </div>
            )}

            {evalData && (() => {
              const m   = evalData.metrics;
              const ti  = evalData.threshold_info || {};
              const pct = (v) => `${(v * 100).toFixed(1)}%`;

              // Sweep chart data — sample every other point for readability
              const sweepRaw   = evalData.sweep_data || [];
              const sweepChart = sweepRaw.filter((_, i) => i % 2 === 0);

              // Score distribution
              const distRaw = evalData.score_distribution || {};
              const distKeys = Object.keys(distRaw);

              const metricCards = [
                { label: 'Accuracy',  value: pct(m.accuracy),  sub: `${m.correct_predictions} / ${m.total_samples} correct`, bar: m.accuracy,  color: 'bg-emerald-500', text: 'text-emerald-400' },
                { label: 'Precision', value: pct(m.precision), sub: 'TP / (TP + FP)',                                          bar: m.precision, color: 'bg-cyan-500',    text: 'text-cyan-400'    },
                { label: 'Recall',    value: pct(m.recall),    sub: 'TP / (TP + FN)',                                          bar: m.recall,    color: 'bg-purple-500',  text: 'text-purple-400'  },
                { label: 'F1 Score',  value: pct(m.f1_score),  sub: 'Harmonic mean of P & R',                                 bar: m.f1_score,  color: 'bg-amber-500',   text: 'text-amber-400'   },
              ];

              return (
                <div className="space-y-6">

                  {/* Threshold Info Card */}
                  {ti.selected_threshold && (
                    <div className="border border-cyan-glow/15 bg-cyan-glow/3 rounded-xl p-5 flex flex-wrap items-center gap-6">
                      <div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Selected Detection Threshold</div>
                        <div className="text-3xl font-bold font-mono text-cyan-glow">{ti.selected_threshold?.toFixed(3)}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">via {ti.selection_method === 'best_f1' ? 'Best F1 sweep' : 'Default'}</div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Threshold → F1 Trade-off Note</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Lower thresholds increase recall but raise false positives. The selected threshold maximises F1 score across the MVTec bottle test split, balancing precision and recall for this zero-shot reference-based architecture.
                        </p>
                      </div>
                      {ti.balanced_threshold && (
                        <div className="text-right">
                          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Balanced P≈R Threshold</div>
                          <div className="text-xl font-bold font-mono text-purple-400">{ti.balanced_threshold?.toFixed(3)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {metricCards.map(({ label, value, sub, bar, color, text }) => (
                      <div key={label} className="border border-white/5 bg-white/2 p-5 rounded-xl space-y-3">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">{label}</span>
                          <span className={`text-3xl font-bold font-mono ${text}`}>{value}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${bar * 100}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-slate-600">{sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary + Confusion Matrix */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dataset Summary */}
                    <div className="border border-white/5 bg-white/2 p-6 rounded-xl space-y-4">
                      <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase block">Dataset Summary</span>
                      <div className="space-y-2.5 font-mono text-xs">
                        {[
                          ['Total Samples',          m.total_samples],
                          ['Correct Predictions',    m.correct_predictions],
                          ['True Positives (TP)',    m.true_positives],
                          ['True Negatives (TN)',    m.true_negatives],
                          ['False Positives (FP)',   m.false_positives],
                          ['False Negatives (FN)',   m.false_negatives],
                        ].map(([label, val]) => (
                          <div key={label} className="flex justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                            <span className="text-slate-400">{label}</span>
                            <span className={`font-bold ${label.includes('False') ? 'text-red-400' : label.includes('True') ? 'text-emerald-400' : 'text-white'}`}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Confusion Matrix */}
                    <div className="border border-white/5 bg-white/2 p-6 rounded-xl space-y-4">
                      <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase block">Confusion Matrix</span>
                      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                        <div className="text-center"><div className="text-[9px] font-mono text-slate-500 mb-1">Predicted Normal</div></div>
                        <div className="text-center"><div className="text-[9px] font-mono text-slate-500 mb-1">Predicted Anomaly</div></div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-emerald-400">{m.true_negatives}</div>
                          <div className="text-[9px] font-mono text-emerald-600 mt-1">TN</div>
                          <div className="text-[8px] font-mono text-slate-500">Normal → Normal</div>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-red-400">{m.false_positives}</div>
                          <div className="text-[9px] font-mono text-red-600 mt-1">FP</div>
                          <div className="text-[8px] font-mono text-slate-500">Normal → Anomaly</div>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-amber-400">{m.false_negatives}</div>
                          <div className="text-[9px] font-mono text-amber-600 mt-1">FN</div>
                          <div className="text-[8px] font-mono text-slate-500">Anomaly → Normal</div>
                        </div>
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold font-mono text-cyan-400">{m.true_positives}</div>
                          <div className="text-[9px] font-mono text-cyan-600 mt-1">TP</div>
                          <div className="text-[8px] font-mono text-slate-500">Anomaly → Anomaly</div>
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-slate-600 text-center">
                        MVTec Bottle · good + broken_large + broken_small + contamination
                      </div>
                    </div>
                  </div>

                  {/* Threshold Calibration Sweep Chart */}
                  {sweepChart.length > 0 && (
                    <div className="border border-white/5 bg-white/2 p-6 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">Threshold Calibration Sweep</span>
                        <span className="text-[10px] font-mono text-slate-600">{sweepRaw.length} thresholds tested (0.09 → 0.50)</span>
                      </div>
                      {/* Custom bar chart — no external charting library */}
                      <div className="space-y-2">
                        {/* Legend */}
                        <div className="flex gap-4 text-[9px] font-mono text-slate-500 mb-3">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />Precision</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Recall</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />F1</span>
                        </div>
                        <div className="flex items-end gap-1 h-32 w-full overflow-x-auto pb-1">
                          {sweepChart.map((row) => {
                            const isSelected = row.threshold === ti.selected_threshold;
                            return (
                              <div key={row.threshold} className={`flex flex-col items-center gap-0.5 min-w-[28px] relative group ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
                                <div className="flex items-end gap-0.5 h-24">
                                  <div className="w-2 bg-cyan-500 rounded-t transition-all" style={{ height: `${row.precision * 100}%` }} title={`P=${(row.precision*100).toFixed(1)}%`} />
                                  <div className="w-2 bg-purple-500 rounded-t transition-all" style={{ height: `${row.recall * 100}%` }} title={`R=${(row.recall*100).toFixed(1)}%`} />
                                  <div className="w-2 bg-amber-500 rounded-t transition-all" style={{ height: `${row.f1_score * 100}%` }} title={`F1=${(row.f1_score*100).toFixed(1)}%`} />
                                </div>
                                <span className={`text-[8px] font-mono rotate-0 ${isSelected ? 'text-cyan-glow font-bold' : 'text-slate-600'}`}>
                                  {row.threshold.toFixed(2)}
                                </span>
                                {isSelected && (
                                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-cyan-glow bg-dark-deep px-1 border border-cyan-glow/20 rounded whitespace-nowrap">best F1</span>
                                )}
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-dark-deep border border-white/10 rounded p-1.5 text-[8px] font-mono text-slate-300 whitespace-nowrap z-50 gap-0.5">
                                  <span>T={row.threshold.toFixed(3)}</span>
                                  <span className="text-cyan-400">P={( row.precision*100).toFixed(1)}%</span>
                                  <span className="text-purple-400">R={(row.recall*100).toFixed(1)}%</span>
                                  <span className="text-amber-400">F1={(row.f1_score*100).toFixed(1)}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Anomaly Score Distribution */}
                  {distKeys.length > 0 && (
                    <div className="border border-white/5 bg-white/2 p-6 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">Anomaly Score Distribution</span>
                        <div className="flex gap-3 text-[9px] font-mono text-slate-500">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Normal</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Anomaly</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-2 h-28 overflow-x-auto pb-1">
                        {distKeys.map((bucket) => {
                          const { normal, anomaly } = distRaw[bucket];
                          const maxVal = Math.max(...distKeys.map(k => distRaw[k].normal + distRaw[k].anomaly), 1);
                          const totalH = (normal + anomaly) / maxVal * 100;
                          const normH  = normal  / maxVal * 100;
                          const anomH  = anomaly / maxVal * 100;
                          const bucketMid = parseFloat(bucket.split('–')[0]) + 0.025;
                          const isPastThreshold = ti.selected_threshold && bucketMid >= ti.selected_threshold;
                          return (
                            <div key={bucket} className="flex flex-col items-center gap-1 min-w-[36px] group relative">
                              <div className="flex items-end gap-0.5 h-20">
                                <div className="w-3.5 bg-emerald-500/70 rounded-t" style={{ height: `${normH}%` }} />
                                <div className="w-3.5 bg-red-400/70 rounded-t"     style={{ height: `${anomH}%` }} />
                              </div>
                              <span className={`text-[8px] font-mono ${isPastThreshold ? 'text-cyan-glow' : 'text-slate-600'}`}>
                                {bucket.split('–')[0]}
                              </span>
                              {isPastThreshold && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-cyan-glow/30" />
                              )}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center bg-dark-deep border border-white/10 rounded p-1.5 text-[8px] font-mono text-slate-300 whitespace-nowrap z-50 gap-0.5">
                                <span>{bucket}</span>
                                <span className="text-emerald-400">Normal: {normal}</span>
                                <span className="text-red-400">Anomaly: {anomaly}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[9px] font-mono text-slate-600">
                        Cyan line = selected threshold ({ti.selected_threshold?.toFixed(3)}). Scores to the right are classified as anomalous.
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}
          </div>
        )}


        {/* ══ TAB: HOW IT WORKS ══ */}
        {activeTab === 'how-it-works' && (
          <div className="space-y-8 animate-fadeIn max-w-4xl">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">How VisionInspect AI Works</h2>
              <p className="text-slate-400 text-sm mt-2">VisionInspect compares a defect-free reference image with a test image to identify anomalous visual patterns.</p>
            </div>
            <div className="space-y-4">
              {[
                { num: '1', color: 'text-cyan-glow border-cyan-glow/20 bg-cyan-glow/10', title: 'Image Patch Extraction', body: 'Standard neural networks process images as single vectors, averaging out microscopic local changes like scratches. VisionInspect breaks each image into overlapping 64×64 patches and analyzes each region independently.' },
                { num: '2', color: 'text-purple-400 border-purple-400/20 bg-purple-400/10', title: 'Contrastive Semantic Embeddings', body: 'Each patch is passed through the pretrained OpenAI CLIP ViT-B/32 vision transformer, which generates a dense 512-dimensional semantic embedding. These embeddings are robust to minor lighting and orientation changes while capturing high-level structural features.' },
                { num: '3', color: 'text-cyan-glow border-cyan-glow/20 bg-cyan-glow/10', title: 'Cosine Similarity Mapping', body: 'Each test patch embedding is compared against its corresponding reference patch using cosine similarity. Subtracting from 1 yields a deviation score: higher values indicate greater structural divergence.' },
                { num: '4', color: 'text-purple-400 border-purple-400/20 bg-purple-400/10', title: 'Morphological Postprocessing & Severity Classification', body: 'Deviation scores are interpolated into a 2D heatmap, smoothed with a Gaussian filter, and thresholded. OpenCV morphological operations clean noise, and contours with area ≥ 600px² are classified. Anomaly score determines the 4-level severity label returned by the backend.' },
              ].map(({ num, color, title, body }) => (
                <div key={num} className="border border-white/5 bg-white/2 p-6 rounded-xl space-y-2">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <span className={`w-5 h-5 rounded border ${color} flex items-center justify-center text-xs font-mono`}>{num}</span>
                    {title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed pl-7">{body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB: ABOUT ══ */}
        {activeTab === 'about' && (
          <div className="space-y-8 animate-fadeIn max-w-4xl">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">About VisionInspect AI</h2>
              <p className="text-slate-400 text-sm mt-2">A student-built zero-shot visual anomaly detection system for academic research and demonstration.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-white/5 bg-white/2 p-6 rounded-xl space-y-3">
                <h3 className="text-white font-bold text-base">Algorithm Specifications</h3>
                <div className="space-y-2.5 font-mono text-xs text-slate-400">
                  {[['Backbone Model', 'CLIP ViT-B/32 (OpenAI)'], ['Image Resolution', '512 × 512 pixels'], ['Sub-Patch Size', '64 × 64 px'], ['Comparison Metric', 'Cosine Distance (1 − cos θ)'], ['Localization Engine', 'OpenCV Contour Bounding Box']].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-white/5 pb-2 last:border-0">
                      <span>{k}:</span><span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-white/5 bg-white/2 p-6 rounded-xl space-y-3">
                <h3 className="text-white font-bold text-base">Development Stack</h3>
                <div className="space-y-2.5 font-mono text-xs text-slate-400">
                  {[['Model & Processing', 'PyTorch, HuggingFace, OpenCV'], ['Backend Server', 'FastAPI (Python 3.10+)'], ['Frontend Client', 'React 19, Vite, Tailwind v4'], ['Animation Engine', 'Framer Motion'], ['PDF Export', 'jsPDF']].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-white/5 pb-2 last:border-0">
                      <span>{k}:</span><span className="text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border border-white/5 bg-white/2 p-6 rounded-xl">
              <h3 className="text-white font-bold text-base mb-3">Academic Scope Disclaimer</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                VisionInspect AI is built as a scientific demonstration. It is not certified for production environments, nor does it connect to edge PLCs or factory SCADA systems. All similarity evaluations represent localized calculations running within the host Python runtime. Metrics represent zero-shot performance without fine-tuning on target domain data.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
