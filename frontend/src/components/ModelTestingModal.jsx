import React, { useState, useEffect, useCallback } from 'react';
import { Network, BoxSelect, Cpu, BrainCircuit, Activity, Heart, ShieldAlert, ChevronRight, AlertTriangle, Info, PlayCircle } from 'lucide-react';


/**
 * MODEL TESTING & COMPARISON — Demonstration Interface
 *
 * Purpose: Runs all four independently trained models on the same patient input
 *          and shows individual predictions, risk probabilities and evaluation metrics.
 *
 * Architecture:
 *   Same Patient Input → RF | SVM | XGBoost | MLP  → Individual predictions → Comparison
 *
 * IMPORTANT:
 * - This is NOT an ensemble. Each model is tested independently.
 * - This is NOT part of the production clinical workflow.
 * - The main dashboard continues to use only XGBoost (best_model.joblib).
 * - Predictions come from the actual trained model objects via /api/model-testing/compare.
 * - Metrics come from the actual metadata.json (real evaluation results).
 */

const API = 'http://localhost:8000';

// ── Model metadata: descriptions, colors ────────────────────────────────────
const MODEL_META = {
  'Random Forest': {
    color: '#10B981',
    colorBg: '#ECFDF5',
    colorBorder: '#A7F3D0',
    icon: <Network size={22} />,
    shortName: 'RF',
    description:
      'Ensemble of decision trees that is robust for structured/tabular data and captures nonlinear relationships.',
  },
  'SVM': {
    color: '#6366F1',
    colorBg: '#EEF2FF',
    colorBorder: '#C7D2FE',
    icon: <BoxSelect size={22} />,
    shortName: 'SVM',
    description:
      'Margin-based classifier that identifies an effective decision boundary between classes.',
  },
  'XGBoost': {
    color: '#F59E0B',
    colorBg: '#FFFBEB',
    colorBorder: '#FDE68A',
    icon: <Cpu size={22} />,
    shortName: 'XGB',
    description:
      'Gradient boosting model that builds trees sequentially to improve predictive performance on structured data.',
  },
  'MLP Neural Network': {
    color: '#3B82F6',
    colorBg: '#EFF6FF',
    colorBorder: '#BFDBFE',
    icon: <BrainCircuit size={22} />,
    shortName: 'MLP',
    description:
      'Feed-forward neural network that learns nonlinear relationships through multiple layers of neurons.',
  },
};

const MODEL_ORDER = ['Random Forest', 'SVM', 'XGBoost', 'MLP Neural Network'];

function RiskBadge({ category }) {
  const map = {
    High: { cls: 'mt-risk-badge high', label: 'HIGH RISK' },
    Moderate: { cls: 'mt-risk-badge moderate', label: 'MODERATE RISK' },
    Low: { cls: 'mt-risk-badge low', label: 'LOW RISK' },
  };
  const entry = map[category] || { cls: 'mt-risk-badge', label: category || '—' };
  return <span className={entry.cls}>{entry.label}</span>;
}

function MetricBar({ value, max = 1, color }) {
  const pct = Math.min(100, ((value || 0) / max) * 100);
  return (
    <div className="mt-metric-bar-track">
      <div
        className="mt-metric-bar-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function ModelTestingModal({ open, onClose, patient }) {
  const [inputData, setInputData] = useState(null);
  const [selectedModel, setSelectedModel] = useState('XGBoost');
  const [result, setResult] = useState(null);
  const [modelMetrics, setModelMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animReady, setAnimReady] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [activeMetric, setActiveMetric] = useState('roc_auc');


  useEffect(() => {
    if (open && modelMetrics.length === 0) {
      fetch(`${API}/api/models`)
        .then(res => res.json())
        .then(data => {
          if (data.metrics) setModelMetrics(data.metrics);
        })
        .catch(err => console.error("Failed to load model metrics", err));
    }
  }, [open, modelMetrics.length]);

  // Sync local input from patient prop whenever modal opens
  useEffect(() => {
    if (open && patient) {
      setInputData({ ...patient });
    }
  }, [open, patient]);

  // Animate cards in once results appear
  useEffect(() => {
    if (result) {
      setAnimReady(false);
      const t = setTimeout(() => setAnimReady(true), 60);
      return () => clearTimeout(t);
    }
  }, [result]);

  // Keyboard close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  
  const handleModelSelect = (name) => {
    setSelectedModel(name);
    setResult(null);
    setError(null);
    setHasRun(false);
  };

  const handleRunModel = useCallback(async () => {
    if (!inputData) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setHasRun(true);
    try {
      const res = await fetch(`${API}/api/model-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, patient: inputData }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unable to test this model. Please verify that the trained model is available.');
    } finally {
      setLoading(false);
    }
  }, [inputData, selectedModel]);


  const handleFieldChange = (field, val) => {
    setInputData(prev => ({ ...prev, [field]: Number(val) }));
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setHasRun(false);
    onClose();
  };

  if (!open) return null;

  // Build sorted result list in canonical model order
  
  const sortedMetrics = modelMetrics.length > 0
    ? MODEL_ORDER.map(name => modelMetrics.find(m => m.model === name) || { model: name, is_deployed: name === 'XGBoost' })
    : MODEL_ORDER.map(name => ({ model: name, is_deployed: name === 'XGBoost' }));


  const metricTabs = [
    { key: 'roc_auc', label: 'ROC-AUC' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'f1', label: 'F1-Score' },
    { key: 'precision', label: 'Precision' },
    { key: 'recall', label: 'Recall' },
  ];

  const bmi = inputData
    ? (inputData.weight / Math.pow(inputData.height / 100, 2)).toFixed(1)
    : '—';

  return (
    <div className="clinical-modal-overlay mt-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Model Testing and Comparison">
      <div className="mt-modal-shell animate-modal-entry" onClick={e => e.stopPropagation()}>

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div className="mt-modal-header">
          <div className="mt-header-title-group">
            <div className="mt-demo-ribbon">
              <span className="mt-demo-dot" />
              DEMONSTRATION INTERFACE — NOT CLINICAL
            </div>
            <h1 className="mt-modal-title" style={{ fontSize: '34px', fontWeight: 800 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-title-icon">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Model Testing &amp; Comparison
            </h1>
            <p className="mt-modal-subtitle">
              Demonstration interface for independent evaluation of trained models
            </p>
          </div>
          <button className="whatif-close-btn" onClick={handleClose} aria-label="Close modal">×</button>
        </div>

        {/* ══ DISCLAIMER STRIP ════════════════════════════════════════════ */}
        <div className="mt-disclaimer-strip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            <strong>Testing Interface Only</strong> — Each model is evaluated independently on the same patient input.
            The main clinical dashboard uses only <strong>XGBoost</strong> for patient risk assessment.
            No ensemble. No averaging. No clinical decisions made here.
          </span>
        </div>

        <div className="mt-modal-body">

          {/* ══ LEFT PANEL: Patient Input ══════════════════════════════════ */}
          <div className="mt-left-panel">
            <div className="mt-panel-section-title">Patient Input Parameters</div>
            <div className="mt-input-summary-card">

              
              {/* Model Selection */}
              <div className="mt-model-selection" style={{ marginBottom: '24px' }}>
                <div className="mt-panel-section-title">SELECT MODEL TO TEST</div>
                <div className="mt-model-select-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {MODEL_ORDER.map(name => {
                    const meta = MODEL_META[name];
                    const isSelected = selectedModel === name;
                    return (
                      <div 
                        key={name}
                        onClick={() => handleModelSelect(name)}
                        style={{
                          border: isSelected ? `2px solid ${meta.color}` : '1px solid var(--border-light)',
                          background: isSelected ? meta.colorBg : 'var(--bg-card)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ marginTop: '2px', color: isSelected ? meta.color : 'var(--text-muted)' }}>
                           {isSelected ? '●' : '○'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16.5px', color: 'var(--text-main)' }}>
                            <span style={{ marginRight: '6px' }}>{meta.icon}</span> {name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {meta.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Numeric inputs */}
              <div className="mt-input-grid">
                <div className="mt-input-row">
                  <label className="mt-input-label">Age (years)</label>
                  <input
                    type="number"
                    className="mt-input-field"
                    value={inputData?.age_years ?? ''}
                    min={18} max={100}
                    onChange={e => handleFieldChange('age_years', e.target.value)}
                  />
                </div>
                <div className="mt-input-row">
                  <label className="mt-input-label">Gender</label>
                  <select
                    className="mt-input-field"
                    value={inputData?.gender ?? 2}
                    onChange={e => handleFieldChange('gender', e.target.value)}
                  >
                    <option value={1}>Female</option>
                    <option value={2}>Male</option>
                  </select>
                </div>
                <div className="mt-input-row">
                  <label className="mt-input-label">Height (cm)</label>
                  <input
                    type="number"
                    className="mt-input-field"
                    value={inputData?.height ?? ''}
                    min={120} max={220}
                    onChange={e => handleFieldChange('height', e.target.value)}
                  />
                </div>
                <div className="mt-input-row">
                  <label className="mt-input-label">Weight (kg)</label>
                  <input
                    type="number"
                    className="mt-input-field"
                    value={inputData?.weight ?? ''}
                    min={35} max={220}
                    onChange={e => handleFieldChange('weight', e.target.value)}
                  />
                </div>
                <div className="mt-input-row">
                  <label className="mt-input-label">Systolic BP</label>
                  <input
                    type="number"
                    className="mt-input-field"
                    value={inputData?.ap_hi ?? ''}
                    min={80} max={250}
                    onChange={e => handleFieldChange('ap_hi', e.target.value)}
                  />
                </div>
                <div className="mt-input-row">
                  <label className="mt-input-label">Diastolic BP</label>
                  <input
                    type="number"
                    className="mt-input-field"
                    value={inputData?.ap_lo ?? ''}
                    min={40} max={150}
                    onChange={e => handleFieldChange('ap_lo', e.target.value)}
                  />
                </div>
                <div className="mt-input-row">
                  <label className="mt-input-label">Cholesterol</label>
                  <select
                    className="mt-input-field"
                    value={inputData?.cholesterol ?? 1}
                    onChange={e => handleFieldChange('cholesterol', e.target.value)}
                  >
                    <option value={1}>1 — Normal</option>
                    <option value={2}>2 — Above Normal</option>
                    <option value={3}>3 — High</option>
                  </select>
                </div>
                <div className="mt-input-row">
                  <label className="mt-input-label">Glucose</label>
                  <select
                    className="mt-input-field"
                    value={inputData?.gluc ?? 1}
                    onChange={e => handleFieldChange('gluc', e.target.value)}
                  >
                    <option value={1}>1 — Normal</option>
                    <option value={2}>2 — Above Normal</option>
                    <option value={3}>3 — High</option>
                  </select>
                </div>
              </div>

              {/* Lifestyle toggles */}
              <div className="mt-lifestyle-section">
                <div className="mt-lifestyle-label">LIFESTYLE FACTORS</div>
                <div className="mt-lifestyle-pills">
                  <button
                    type="button"
                    className={`mt-lifestyle-pill ${inputData?.smoke ? 'active-red' : ''}`}
                    onClick={() => handleFieldChange('smoke', inputData?.smoke ? 0 : 1)}
                  >
                    <span>🚬</span>
                    <span>{inputData?.smoke ? 'Smoker' : 'Non-Smoker'}</span>
                  </button>
                  <button
                    type="button"
                    className={`mt-lifestyle-pill ${inputData?.alco ? 'active-amber' : ''}`}
                    onClick={() => handleFieldChange('alco', inputData?.alco ? 0 : 1)}
                  >
                    <span>🍷</span>
                    <span>{inputData?.alco ? 'Drinks Alcohol' : 'No Alcohol'}</span>
                  </button>
                  <button
                    type="button"
                    className={`mt-lifestyle-pill ${inputData?.active ? 'active-green' : ''}`}
                    onClick={() => handleFieldChange('active', inputData?.active ? 0 : 1)}
                  >
                    <span>🏃</span>
                    <span>{inputData?.active ? 'Active' : 'Sedentary'}</span>
                  </button>
                </div>
              </div>

              {/* Derived BMI */}
              <div className="mt-bmi-derived">
                <span className="mt-bmi-label">Derived BMI</span>
                <span className="mt-bmi-value">{bmi}</span>
                <span className="mt-bmi-note">Calculated automatically from height &amp; weight</span>
              </div>

              
              {/* Action: Run Selected */}
              <button
                className="mt-run-btn"
                onClick={handleRunModel}
                disabled={loading}
                id="btn-model-testing-run"
                style={{ background: MODEL_META[selectedModel]?.color || 'var(--color-primary)' }}
              >
                {loading ? (
                  <>
                    <span className="mt-spinner" />
                    <span style={{ fontSize: '22px', fontWeight: 700, fontWeight: 700 }}>Testing {selectedModel}...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> <span style={{ fontSize: '22px', fontWeight: 700, fontWeight: 700 }}>Run Selected Model</span>
                  </>
                )}
              </button>


            </div>
          </div>
          
          {/* ══ RIGHT PANEL: Results ════════════════════════════════════════ */}
          <div className="mt-right-panel">

            {/* — Pre-run placeholder — */}
            {!result && !loading && !error && (
              <div className="mt-empty-state">
                <div style={{ fontSize: '50px', marginBottom: '16px' }}>{MODEL_META[selectedModel]?.icon}</div>
                <p style={{ fontSize: '34px', fontWeight: 800, fontWeight: 700, marginTop: '12px' }}>{selectedModel}</p>
                <p style={{ fontSize: '15.5px', color: 'var(--text-blue)', fontWeight: 700, margin: '8px 0' }}>READY TO TEST</p>
                <p style={{ fontSize: '14.5px', opacity: 0.7 }}>Configure patient parameters on the left<br />then click <strong>Run Selected Model</strong>.</p>
              </div>
            )}

            {/* — Loading — */}
            {loading && (
              <div className="mt-loading-state">
                <div className="mt-loading-spinner-lg" />
                <p style={{ fontWeight: 700, letterSpacing: '0.05em', fontSize: '13.5px', color: 'var(--text-muted)' }}>TESTING MODEL</p>
                <p className="mt-loading-sub" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', margin: '8px 0' }}>{selectedModel}</p>
                <p style={{ fontSize: '14.5px', opacity: 0.7 }}>Loading prediction...</p>
              </div>
            )}

            {/* — Error — */}
            {error && (
              <div className="mt-error-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <strong>Error</strong>
                  <p style={{ marginTop: 4, fontSize: 14.5, opacity: 0.8 }}>{error}</p>
                </div>
              </div>
            )}

            {/* — Model Card — */}
            {result && !loading && (
              <>
                <div className="mt-results-section-title" style={{ marginBottom: '16px' }}>
                  Current Patient Test Result
                </div>

                <div className="mt-model-cards-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '400px', margin: '0 auto 32px' }}>
                  {(() => {
                    const item = result;
                    const meta = MODEL_META[item.model] || {};
                    const pred = item.prediction;
                    const perf = item.performance_metrics || {};

                    return (
                      <div
                        className={`mt-model-card ${item.is_deployed ? 'deployed' : ''} ${animReady ? 'anim-in' : ''}`}
                        style={{
                          '--model-color': meta.color,
                          '--model-color-bg': meta.colorBg,
                          '--model-color-border': meta.colorBorder,
                          transitionDelay: `0ms`,
                        }}
                      >
                        {/* Card header */}
                        <div className="mt-card-header">
                          <div className="mt-card-header-left">
                            <span className="mt-card-icon" style={{ color: meta.color }}>{meta.icon}</span>
                            <div>
                              <div className="mt-card-model-name" style={{ fontSize: '22px', fontWeight: 700 }}>{item.model_display || item.model}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>MODEL UNDER TEST</div>
                            </div>
                          </div>
                          {pred && (
                            <div className="mt-card-risk-number" style={{ color: meta.color, fontSize: '34px', fontWeight: 800 }}>
                              {pred.risk_score.toFixed(1)}%
                            </div>
                          )}
                        </div>

                        {/* Risk category */}
                        <div className="mt-card-risk-row">
                          <RiskBadge category={pred?.risk_category} />
                          <span className="mt-card-prob-label">
                            Probability: {pred?.risk_probability?.toFixed(4)}
                          </span>
                        </div>

                        {/* Risk bar */}
                        <div className="mt-card-risk-bar-wrap">
                          <div className="mt-card-risk-bar-track">
                            <div
                              className="mt-card-risk-bar-fill"
                              style={{
                                width: animReady ? `${Math.min(100, pred?.risk_score || 0)}%` : '0%',
                                background: meta.color,
                                transitionDelay: `200ms`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Performance metrics inside card */}
                        <div className="mt-card-metrics" style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                          <div className="mt-card-metric-row">
                            <span className="mt-card-metric-label">Accuracy</span>
                            <MetricBar value={perf.accuracy} color={meta.color} />
                            <span className="mt-card-metric-val">{perf.accuracy != null ? `${(perf.accuracy * 100).toFixed(1)}%` : '—'}</span>
                          </div>
                          <div className="mt-card-metric-row">
                            <span className="mt-card-metric-label">ROC-AUC</span>
                            <MetricBar value={perf.roc_auc} color={meta.color} />
                            <span className="mt-card-metric-val">{perf.roc_auc != null ? `${(perf.roc_auc * 100).toFixed(2)}%` : '—'}</span>
                          </div>
                          <div className="mt-card-metric-row">
                            <span className="mt-card-metric-label">F1</span>
                            <MetricBar value={perf.f1} color={meta.color} />
                            <span className="mt-card-metric-val">{perf.f1 != null ? `${(perf.f1 * 100).toFixed(1)}%` : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ── Full Metrics Comparison Table ── */}
                <div className="mt-comparison-section">
                  <div className="mt-comparison-title">
                    Model Performance Evaluation (Test Partition)
                  </div>

                  {/* Metric selector */}
                  <div className="mt-metric-tabs">
                    {metricTabs.map(tab => (
                      <button
                        key={tab.key}
                        className={`mt-metric-tab ${activeMetric === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveMetric(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div className="mt-bar-chart">
                    {sortedMetrics.map((item, idx) => {
                      const meta = MODEL_META[item.model] || {};
                      const val = (item[activeMetric] || 0) * 100;
                      const maxVal = 85;
                      const barW = animReady ? Math.min(98, (val / maxVal) * 94) : 0;
                      return (
                        <div key={item.model} className={`mt-bar-row ${item.is_deployed ? 'deployed' : ''}`}>
                          <div className="mt-bar-label">
                            <span style={{ color: meta.color }}>{meta.icon}</span>
                            <span className="mt-bar-model-name">{item.model}</span>
                            {item.is_deployed && <span className="mt-bar-deployed-dot" style={{ background: meta.color }} />}
                          </div>
                          <div className="mt-bar-track">
                            <div
                              className="mt-bar-fill"
                              style={{
                                width: `${barW}%`,
                                background: item.is_deployed
                                  ? `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}CC 100%)`
                                  : `linear-gradient(90deg, ${meta.color}88 0%, ${meta.color}55 100%)`,
                                transition: `width 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 100}ms`,
                              }}
                            >
                              <span className="mt-bar-inner-label">{val.toFixed(1)}%</span>
                            </div>
                          </div>
                          <span className="mt-bar-val" style={{ color: item.is_deployed ? meta.color : undefined }}>
                            {val.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Full table */}
                  <table className="mt-detail-table">
                    <thead>
                      <tr>
                        <th style={{ fontSize: '15.5px' }}>Model</th>
                        <th style={{ fontSize: '15.5px' }}>Accuracy</th>
                        <th style={{ fontSize: '15.5px' }}>Precision</th>
                        <th style={{ fontSize: '15.5px' }}>Recall</th>
                        <th style={{ fontSize: '15.5px' }}>F1</th>
                        <th style={{ fontSize: '15.5px' }}>ROC-AUC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMetrics.map(item => {
                        const meta = MODEL_META[item.model] || {};
                        return (
                          <tr key={item.model} className={item.is_deployed ? 'mt-table-selected' : ''}>
                            <td className="mt-table-model-cell">
                              <span className="mt-table-dot" style={{ background: meta.color }} />
                              {item.model}
                            </td>
                            <td>{item.accuracy != null ? `${(item.accuracy * 100).toFixed(1)}%` : '—'}</td>
                            <td>{item.precision != null ? `${(item.precision * 100).toFixed(1)}%` : '—'}</td>
                            <td>{item.recall != null ? `${(item.recall * 100).toFixed(1)}%` : '—'}</td>
                            <td>{item.f1 != null ? `${(item.f1 * 100).toFixed(1)}%` : '—'}</td>
                            <td className={item.is_deployed ? 'mt-table-best-auc' : ''}>
                              {item.roc_auc != null ? `${(item.roc_auc * 100).toFixed(2)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Best ROC-AUC callout */}
                  <div className="mt-best-auc-callout">
                    <span className="mt-best-auc-icon">🏆</span>
                    <strong>Best ROC-AUC: XGBoost — 80.37%</strong>
                    <span className="mt-best-auc-note">Selected as the deployed classifier based on highest test ROC-AUC.</span>
                  </div>
                </div>

                {/* ── Why XGBoost? ── */}
                <div className="mt-why-section">
                  <div className="mt-why-title">
                    <span>⚡</span> Why XGBoost?
                  </div>
                  <p className="mt-why-body">
                    All four models were trained and evaluated using the same dataset and evaluation procedure.
                    XGBoost achieved the highest ROC-AUC (<strong>80.37%</strong>) and was therefore selected as the
                    deployed classifier for the main clinical risk assessment. ROC-AUC was used as the primary
                    selection criterion because it measures discriminative capacity across all classification
                    thresholds, making it more robust than accuracy for imbalanced clinical outcomes.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>


        {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
        <div className="mt-modal-footer">
          <div className="mt-footer-left">
            <span className="mt-footer-badge model-testing">MODEL TESTING WINDOW</span>
            <span className="mt-footer-sep">Used only for demonstration and comparative analysis.</span>
          </div>
          <div className="mt-footer-right">
            <span className="mt-footer-badge clinical">MAIN CLINICAL DASHBOARD</span>
            <span className="mt-footer-sep">Uses the selected XGBoost model for actual patient risk assessment.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
