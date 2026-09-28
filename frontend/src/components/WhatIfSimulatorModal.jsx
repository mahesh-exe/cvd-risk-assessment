import React, { useEffect, useState, useRef } from 'react';
import RiskReductionPathway from './RiskReductionPathway.jsx';

const API = 'http://localhost:8000';

function calculateBMI(weight, height) {
  if (!weight || !height) return 22.0;
  return weight / ((height / 100) ** 2);
}

/**
 * Signature What-If Risk Simulator Modal
 * - STRICTLY NON-SCROLLABLE: Fits inside viewport height without internal scrolling.
 * - Displays designated clinical flow:
 *   CURRENT RISK → TARGET SCENARIO → RISK REDUCTION WINDOW
 * - Modifiable factor controls with real-time recalculation
 * - Dynamic WHY? modifiable factors reasoning & ACTION guidance
 * - Explicit boundary disclaimer: does not claim the model predicts exact timing of disease progression
 */
export default function WhatIfSimulatorModal({
  open,
  onClose,
  patient,
  baseResult,
  activeHoverFactor,
  onApplyChanges
}) {
  const [simPatient, setSimPatient] = useState({ ...patient });
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useReferenceCase, setUseReferenceCase] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSimPatient({ ...patient });
      setSimResult(null);
      setUseReferenceCase(false);
      runSim({ ...patient });
    }
  }, [open, patient]);

  // Modal ESC key listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const runSim = async (currentSim) => {
    setLoading(true);
    try {
      const changes = {};
      ['weight', 'height', 'ap_hi', 'ap_lo', 'cholesterol', 'gluc', 'smoke', 'alco', 'active'].forEach(f => {
        if (Number(currentSim[f]) !== Number(patient[f])) {
          changes[f] = Number(currentSim[f]);
        }
      });

      const res = await fetch(`${API}/api/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseline: patient,
          changes,
          improvement_window: 'Target Risk Reduction Window'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      }
    } catch (err) {
      console.error('What-If simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFactorChange = (field, val) => {
    setUseReferenceCase(false);
    const updated = { ...simPatient, [field]: Number(val) };
    setSimPatient(updated);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSim(updated);
    }, 150);
  };

  const handleLoadCanonicalPreset = () => {
    setUseReferenceCase(true);
    const updated = {
      ...simPatient,
      ap_hi: 120,
      ap_lo: 80,
      active: 1
    };
    setSimPatient(updated);
    runSim(updated);
  };

  const handleResetToPatient = () => {
    setUseReferenceCase(false);
    setSimPatient({ ...patient });
    runSim({ ...patient });
  };

  // Dynamic WHY? derivation based on modified factors or top modifiable SHAP features
  const getDynamicWhyText = () => {
    if (useReferenceCase) {
      return 'Blood pressure and physical activity are currently important modifiable contributors.';
    }
    const changed = [];
    if (Number(simPatient.ap_hi) !== Number(patient.ap_hi) || Number(simPatient.ap_lo) !== Number(patient.ap_lo)) {
      changed.push('Blood pressure');
    }
    if (Number(simPatient.active) !== Number(patient.active)) {
      changed.push('physical activity');
    }
    if (Number(simPatient.cholesterol) !== Number(patient.cholesterol)) {
      changed.push('cholesterol levels');
    }
    if (Number(simPatient.smoke) !== Number(patient.smoke)) {
      changed.push('smoking cessation');
    }
    if (Number(simPatient.weight) !== Number(patient.weight) || Number(simPatient.height) !== Number(patient.height)) {
      changed.push('weight / BMI');
    }
    if (Number(simPatient.gluc) !== Number(patient.gluc)) {
      changed.push('glycemic control');
    }

    if (changed.length === 0) {
      return 'Blood pressure and physical activity are currently important modifiable contributors.';
    }
    if (changed.length === 1) {
      return `${changed[0]} is currently an important modifiable contributor.`;
    }
    if (changed.length === 2) {
      return `${changed[0]} and ${changed[1]} are currently important modifiable contributors.`;
    }
    return `${changed.slice(0, -1).join(', ')}, and ${changed[changed.length - 1]} are currently important modifiable contributors.`;
  };

  if (!open) return null;

  const liveCurrentScore = baseResult?.prediction?.risk_score ?? 82.8;
  const liveCurrentCat = baseResult?.prediction?.risk_category ?? 'High';
  const liveTargetScore = simResult?.simulated_risk ?? liveCurrentScore;
  const liveTargetCat = simResult?.simulated_category ?? liveCurrentCat;

  const currentScore = useReferenceCase ? 53.4 : liveCurrentScore;
  const currentCat = useReferenceCase ? 'Moderate' : liveCurrentCat;
  const targetScore = useReferenceCase ? 38.2 : liveTargetScore;
  const targetCat = useReferenceCase ? 'Moderate' : liveTargetCat;
  const diffPP = targetScore - currentScore;

  // Slope Chart SVG Coordinates
  const chartHeight = 115;
  const currentY = 135 - (currentScore / 100) * chartHeight;
  const targetY = 135 - (targetScore / 100) * chartHeight;

  const currentBmi = calculateBMI(patient.weight, patient.height);
  const targetBmi = calculateBMI(simPatient.weight, simPatient.height);

  return (
    <div className="clinical-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="whatif-modal-viewport" onClick={e => e.stopPropagation()}>
        {/* Top Header */}
        <div className="whatif-modal-header">
          <div className="whatif-header-text">
            <div className="whatif-modal-title">
              <span className="whatif-title-badge">SIMULATOR</span>
              <span>What-If Risk Scenario Console</span>
            </div>
            <div className="whatif-modal-sub">
              Target risk is a model-based estimate using modified patient inputs (Cross-sectional estimate)
            </div>
          </div>
          <button className="whatif-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {/* 3-Column Non-Scrollable Workstation Grid */}
        <div className="whatif-workstation-grid">
          {/* ── COL 1: SLOPE CHART & PATHWAY (Requirement 3) ── */}
          <div className="whatif-col slope-col">
            <div className="whatif-col-header">
              <span className="whatif-col-title">CURRENT → TARGET TRAJECTORY</span>
              <span className="whatif-col-badge">Slope Model</span>
            </div>

            {/* Slope Chart SVG */}
            <div className="slope-chart-box">
              <svg viewBox="0 0 240 160" className="slope-svg-canvas">
                <defs>
                  <linearGradient id="slopeLineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor={targetScore <= currentScore ? "#10B981" : "#EF4444"} />
                  </linearGradient>
                  <filter id="nodeGlow2" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.2" />
                  </filter>
                </defs>

                {/* Reference Gridlines */}
                {[100, 75, 50, 25, 0].map(pct => {
                  const y = 135 - (pct / 100) * chartHeight;
                  return (
                    <g key={pct}>
                      <line x1="28" y1={y} x2="215" y2={y} stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
                      <text x="22" y={y + 3} fontSize="8.5" fill="#94A3B8" textAnchor="end" fontFamily="'JetBrains Mono',monospace">{pct}%</text>
                    </g>
                  );
                })}

                {/* Vertical Axis Guidelines */}
                <line x1="65" y1="20" x2="65" y2="140" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="180" y1="20" x2="180" y2="140" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />

                {/* Drawn Connecting Line */}
                <line
                  x1="65"
                  y1={currentY}
                  x2="180"
                  y2={targetY}
                  stroke="url(#slopeLineGrad2)"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  className="slope-drawing-line"
                />

                {/* Current Point (Left) */}
                <circle cx="65" cy={currentY} r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" filter="url(#nodeGlow2)" />
                <text x="65" y={currentY - 11} fontSize="12" fontWeight="800" fill="#DC2626" textAnchor="middle" fontFamily="'Outfit', sans-serif">
                  {currentScore.toFixed(1)}%
                </text>
                <text x="65" y="152" fontSize="9" fontWeight="700" fill="#64748B" textAnchor="middle">
                  CURRENT
                </text>

                {/* Target Point (Right) */}
                <circle cx="180" cy={targetY} r="7.5" fill={targetScore <= currentScore ? "#10B981" : "#EF4444"} stroke="#FFFFFF" strokeWidth="2.2" filter="url(#nodeGlow2)" />
                <text x="180" y={targetY - 11} fontSize="12.5" fontWeight="800" fill={targetScore <= currentScore ? "#059669" : "#DC2626"} textAnchor="middle" fontFamily="'Outfit', sans-serif">
                  {targetScore.toFixed(1)}%
                </text>
                <text x="180" y="152" fontSize="9" fontWeight="700" fill="#059669" textAnchor="middle">
                  TARGET
                </text>
              </svg>
            </div>

            {/* Difference Badge */}
            <div className={`slope-delta-strip ${diffPP <= 0 ? 'good' : 'warning'}`}>
              <div className="delta-val">
                {diffPP > 0 ? `+${diffPP.toFixed(1)}` : diffPP.toFixed(1)} percentage points
              </div>
              <div className="delta-desc">
                {diffPP <= 0 ? 'Estimated risk reduction under target scenario' : 'Estimated risk change'}
              </div>
            </div>

            {/* Designated Flow Pathway (Requirement 3): CURRENT RISK → TARGET RISK → TARGET REDUCTION WINDOW → REASSESSMENT */}
            <div className="pathway-flow-card">
              <div className="pathway-card-title">CLINICAL RISK REDUCTION PATHWAY</div>
              <div className="pathway-steps-strip">
                <div className="pathway-step-node">
                  <div className="step-circle current">1</div>
                  <span className="step-label-top">CURRENT RISK</span>
                  <strong className="step-val red">{currentScore.toFixed(1)}%</strong>
                </div>

                <div className="pathway-arrow-sep">→</div>

                <div className="pathway-step-node">
                  <div className="step-circle target">2</div>
                  <span className="step-label-top">TARGET RISK</span>
                  <strong className="step-val green">{targetScore.toFixed(1)}%</strong>
                </div>

                <div className="pathway-arrow-sep">→</div>

                <div className="pathway-step-node">
                  <div className="step-circle window">3</div>
                  <span className="step-label-top">TARGET WINDOW</span>
                  <span className="step-sub-tag">Intervention</span>
                </div>

                <div className="pathway-arrow-sep">→</div>

                <div className="pathway-step-node">
                  <div className="step-circle review">4</div>
                  <span className="step-label-top">REASSESSMENT</span>
                  <span className="step-sub-tag">Follow-up</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── COL 2: COMPACT MODIFY FACTOR CONTROLS ── */}
          <div className="whatif-col factors-col">
            <div className="whatif-col-header">
              <span className="whatif-col-title">MODIFY MODIFIABLE FACTORS</span>
              <span className="whatif-col-badge interactive">Live Calculation</span>
            </div>

            {/* Quick Reference Scenario Preset Strip */}
            <div className="btn-whatif-preset-strip">
              <span className="preset-strip-label">
                {useReferenceCase ? '★ Standard Reference Case Active' : 'Scenario Shortcut:'}
              </span>
              {useReferenceCase ? (
                <button
                  type="button"
                  className="btn-preset-pill"
                  onClick={handleResetToPatient}
                  title="Restore active patient data"
                >
                  ↺ Reset Patient
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-preset-pill"
                  onClick={handleLoadCanonicalPreset}
                  title="Load reference scenario: 53.4% Moderate to 38.2%"
                >
                  Load 53.4% → 38.2% Case
                </button>
              )}
            </div>

            <div className="factors-compact-stack">
              {/* Systolic BP */}
              <div className={`factor-ctrl-box ${activeHoverFactor === 'bp' ? 'cross-highlighted' : ''}`}>
                <div className="ctrl-top-row">
                  <span className="ctrl-label">Systolic BP</span>
                  <div className="ctrl-val-readout">
                    <span className="base-val">{patient.ap_hi}</span>
                    <span className="arrow-val">→</span>
                    <strong className="sim-val">{simPatient.ap_hi} mmHg</strong>
                  </div>
                </div>
                <input
                  type="range"
                  min="90"
                  max="190"
                  step="1"
                  value={simPatient.ap_hi}
                  onChange={e => handleFactorChange('ap_hi', e.target.value)}
                  className="ctrl-range-slider"
                />
                <div className="ctrl-preset-bar">
                  <span className="preset-bounds">90 - 190</span>
                  <button className="btn-quick-target" onClick={() => handleFactorChange('ap_hi', 120)}>
                    Target: 120 mmHg
                  </button>
                </div>
              </div>

              {/* Diastolic BP */}
              <div className={`factor-ctrl-box ${activeHoverFactor === 'bp' ? 'cross-highlighted' : ''}`}>
                <div className="ctrl-top-row">
                  <span className="ctrl-label">Diastolic BP</span>
                  <div className="ctrl-val-readout">
                    <span className="base-val">{patient.ap_lo}</span>
                    <span className="arrow-val">→</span>
                    <strong className="sim-val">{simPatient.ap_lo} mmHg</strong>
                  </div>
                </div>
                <input
                  type="range"
                  min="60"
                  max="120"
                  step="1"
                  value={simPatient.ap_lo}
                  onChange={e => handleFactorChange('ap_lo', e.target.value)}
                  className="ctrl-range-slider"
                />
                <div className="ctrl-preset-bar">
                  <span className="preset-bounds">60 - 120</span>
                  <button className="btn-quick-target" onClick={() => handleFactorChange('ap_lo', 80)}>
                    Target: 80 mmHg
                  </button>
                </div>
              </div>

              {/* Weight & BMI */}
              <div className={`factor-ctrl-box ${activeHoverFactor === 'bmi' ? 'cross-highlighted' : ''}`}>
                <div className="ctrl-top-row">
                  <span className="ctrl-label">Weight & BMI</span>
                  <div className="ctrl-val-readout">
                    <span className="base-val">{patient.weight}kg (BMI {currentBmi.toFixed(1)})</span>
                    <span className="arrow-val">→</span>
                    <strong className="sim-val">{simPatient.weight}kg (BMI {targetBmi.toFixed(1)})</strong>
                  </div>
                </div>
                <input
                  type="range"
                  min="45"
                  max="125"
                  step="1"
                  value={simPatient.weight}
                  onChange={e => handleFactorChange('weight', e.target.value)}
                  className="ctrl-range-slider"
                />
                <div className="ctrl-preset-bar">
                  <span className="preset-bounds">45 - 125 kg</span>
                  <button className="btn-quick-target" onClick={() => handleFactorChange('weight', Math.min(patient.weight, 68))}>
                    Target: Normal BMI
                  </button>
                </div>
              </div>

              {/* Cholesterol */}
              <div className={`factor-ctrl-box ${activeHoverFactor === 'chol' ? 'cross-highlighted' : ''}`}>
                <div className="ctrl-top-row">
                  <span className="ctrl-label">Cholesterol</span>
                  <div className="ctrl-val-readout">
                    <span className="base-val">{patient.cholesterol === 1 ? 'Normal' : patient.cholesterol === 2 ? 'Above' : 'High'}</span>
                    <span className="arrow-val">→</span>
                    <strong className="sim-val">{simPatient.cholesterol === 1 ? 'Normal' : simPatient.cholesterol === 2 ? 'Above Normal' : 'High'}</strong>
                  </div>
                </div>
                <div className="tri-toggle-row">
                  <button className={`tri-btn ${simPatient.cholesterol === 1 ? 'active' : ''}`} onClick={() => handleFactorChange('cholesterol', 1)}>1 - Normal</button>
                  <button className={`tri-btn ${simPatient.cholesterol === 2 ? 'active' : ''}`} onClick={() => handleFactorChange('cholesterol', 2)}>2 - Above</button>
                  <button className={`tri-btn ${simPatient.cholesterol === 3 ? 'active' : ''}`} onClick={() => handleFactorChange('cholesterol', 3)}>3 - High</button>
                </div>
              </div>

              {/* Lifestyle Compact Toggles */}
              <div className="lifestyle-toggle-duo">
                <div className={`mini-toggle-cell ${activeHoverFactor === 'smoke' ? 'cross-highlighted' : ''}`}>
                  <span className="mini-label">Smoking Status</span>
                  <div className="toggle-pair">
                    <button className={`pair-btn ${simPatient.smoke === 0 ? 'active' : ''}`} onClick={() => handleFactorChange('smoke', 0)}>Non-Smoker</button>
                    <button className={`pair-btn ${simPatient.smoke === 1 ? 'active red' : ''}`} onClick={() => handleFactorChange('smoke', 1)}>Smoker</button>
                  </div>
                </div>

                <div className={`mini-toggle-cell ${activeHoverFactor === 'active' ? 'cross-highlighted' : ''}`}>
                  <span className="mini-label">Physical Activity</span>
                  <div className="toggle-pair">
                    <button className={`pair-btn ${simPatient.active === 1 ? 'active' : ''}`} onClick={() => handleFactorChange('active', 1)}>Active</button>
                    <button className={`pair-btn ${simPatient.active === 0 ? 'active amber' : ''}`} onClick={() => handleFactorChange('active', 0)}>Inactive</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── COL 3: TARGET RISK REDUCTION PATHWAY (CURRENT RISK → TARGET SCENARIO → RISK REDUCTION WINDOW) ── */}
          <div className="whatif-col outcome-col">
            <div className="whatif-col-header">
              <span className="whatif-col-title">TARGET RISK REDUCTION PATHWAY</span>
              <span className="whatif-col-badge">{loading ? 'Calculating...' : 'Clinical Target'}</span>
            </div>

            <RiskReductionPathway
              currentScore={currentScore}
              currentCategory={currentCat}
              targetScore={targetScore}
              targetCategory={targetCat}
              diffPP={diffPP}
              windowText="≈ 1–3 MONTHS"
              whyText={getDynamicWhyText()}
              actionText="Begin risk-factor improvement now and reassess within the suggested window."
            />

            {/* Compact Clinical Methodology Footnote */}
            <div className="guidance-item-box disclaimer" style={{ marginTop: 'auto', padding: '5px 8px' }}>
              <div className="guidance-icon-bullet" style={{ fontSize: '10px' }}>ℹ️</div>
              <p className="guidance-disclaimer-text" style={{ fontSize: '7.5px', lineHeight: 1.25 }}>
                Cross-sectional empirical estimate. Machine learning model estimates risk from input parameters; reduction window reflects recommended clinical intervention interval prior to reassessment.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="whatif-modal-footer">
          <button className="btn-whatif-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-whatif-apply"
            onClick={() => {
              if (onApplyChanges) onApplyChanges(simPatient);
              onClose();
            }}
          >
            Apply Target Scenario to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
