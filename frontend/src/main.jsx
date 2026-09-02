import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

/* ─── CONSTANTS ──────────────────────────────────────────────────── */
const API  = 'http://localhost:8000';
const DEMO = { patient_id:'DEMO-001', age_years:54, gender:2, height:168, weight:78, ap_hi:145, ap_lo:92, cholesterol:2, gluc:1, smoke:0, alco:0, active:1 };

const C_GREEN = '#159B78';
const C_RED   = '#D95656';
const C_AMBER = '#D79A2B';
const C_BLUE  = '#4C82B8';
const C_CORAL = '#E07A5F';

const catCls = c => ({ High:'high', Moderate:'moderate', Low:'low' }[c] ?? 'low');
const catColor = c => ({ High: C_RED, Moderate: C_AMBER, Low: C_GREEN }[c] ?? C_GREEN);
const nowStr = () => new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });

/* ═══════════════════════════════════════════════════════════════════
   SHAP DIVERGING BAR CHART
   - Protective (negative) bars grow LEFT from centre line
   - Risk-increasing (positive) bars grow RIGHT from centre line
   - Scale is symmetric (same maxAbs on both sides)
   - Layout: [label 200px] [left-bar 1fr] [zero 2px] [right-bar 1fr] [shap-val 70px]
═══════════════════════════════════════════════════════════════════ */
function ShapDivergingChart({ data }) {
  if (!data) return null;

  const actionable = [...(data.modifiable    || [])].sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const baseline   = [...(data.non_modifiable|| [])].sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const all        = [...actionable, ...baseline];
  const maxAbs     = Math.max(...all.map(f => Math.abs(f.contribution)), 0.01);

  const topRisk = [...all].filter(f => f.contribution > 0).sort((a,b) => b.contribution - a.contribution)[0];
  const topProt = [...all].filter(f => f.contribution < 0).sort((a,b) => a.contribution - b.contribution)[0];

  // Grid template used by header + every row — guarantees perfect column alignment
  const COLS = '200px minmax(0,1fr) 2px minmax(0,1fr) 72px';

  const BarRow = ({ f, muted = false, isBaseline = false }) => {
    const isRisk  = f.contribution > 0;
    const pct     = (Math.abs(f.contribution) / maxAbs) * 100;
    const color   = isBaseline ? C_BLUE : (isRisk ? C_RED : C_GREEN);
    const valStr  = `${f.contribution > 0 ? '+' : ''}${f.contribution.toFixed(3)}`;
    const dirText = isRisk ? 'increases risk' : 'reduces risk';

    return (
      <div
        role="row"
        aria-label={`${f.label}: SHAP ${valStr}, ${dirText}`}
        style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          alignItems: 'center',
          minHeight: 40,
          opacity: muted ? 0.6 : 1,
          borderRadius: 6,
          padding: '2px 0',
        }}
      >
        {/* Col 1 — Factor name + patient value */}
        <div style={{ paddingRight: 14, textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#172B3A', lineHeight: 1.25 }}>
            {f.label}
          </div>
          <div style={{ fontSize: 12, color: '#536B7A', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
            {f.value}
          </div>
        </div>

        {/* Col 2 — Left bar zone (protective bars only, right-aligned so they touch the zero line) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: 28 }}>
          {!isRisk && (
            <div
              style={{
                width: `${pct}%`,
                height: 14,
                background: color,
                opacity: 0.82,
                borderRadius: '4px 0 0 4px',
                transition: 'width 0.4s ease',
              }}
            />
          )}
        </div>

        {/* Col 3 — Zero line */}
        <div
          aria-hidden
          style={{ width: 2, height: 32, background: '#D8E2EA', alignSelf: 'center', flexShrink: 0 }}
        />

        {/* Col 4 — Right bar zone (risk-increasing bars only, left-aligned so they touch the zero line) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: 28 }}>
          {isRisk && (
            <div
              style={{
                width: `${pct}%`,
                height: 14,
                background: color,
                opacity: 0.85,
                borderRadius: '0 4px 4px 0',
                transition: 'width 0.4s ease',
              }}
            />
          )}
        </div>

        {/* Col 5 — SHAP value + direction */}
        <div style={{ paddingLeft: 10, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color, lineHeight: 1 }}>
            {valStr}
          </div>
          <div style={{ fontSize: 11, color: '#7F9BAA', marginTop: 2, whiteSpace: 'nowrap' }}>
            {dirText}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Summary callout */}
      <div className="shap-summary-box">
        {topRisk ? (
          <div className="shap-summary-line">
            <span className="lbl" style={{ color: C_RED }}>Strongest risk driver: </span>
            {topRisk.label} ({topRisk.value}),{' '}
            <span className="mono" style={{ color: C_RED }}>SHAP +{topRisk.contribution.toFixed(3)}</span>
          </div>
        ) : (
          <div className="shap-summary-empty">No leading factors are increasing this prediction.</div>
        )}
        {topProt ? (
          <div className="shap-summary-line">
            <span className="lbl" style={{ color: C_GREEN }}>Strongest protective factor: </span>
            {topProt.label} ({topProt.value}),{' '}
            <span className="mono" style={{ color: C_GREEN }}>SHAP {topProt.contribution.toFixed(3)}</span>
          </div>
        ) : (
          <div className="shap-summary-empty">No leading factors are reducing this prediction.</div>
        )}
      </div>

      {/* Chart header */}
      <div style={{ display: 'grid', gridTemplateColumns: COLS, paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid #D8E2EA' }}>
        <div style={{ textAlign: 'right', paddingRight: 14, fontSize: 12, fontWeight: 700, color: C_GREEN, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ← Protective / reduces predicted risk
        </div>
        <div />
        <div />
        <div style={{ paddingLeft: 4, fontSize: 12, fontWeight: 700, color: C_RED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Risk increasing →
        </div>
        <div />
      </div>

      {/* Actionable factors */}
      {actionable.length > 0 && (
        <div>
          <div className="shap-section-title">Actionable Factors</div>
          {actionable.map(f => <BarRow key={f.feature} f={f} isBaseline={false} />)}
        </div>
      )}

      {/* Baseline factors */}
      {baseline.length > 0 && (
        <div>
          <div className="shap-section-title">Baseline · Non-Modifiable</div>
          {baseline.map(f => <BarRow key={f.feature} f={f} muted isBaseline />)}
        </div>
      )}

      <div className="shap-disclaimer">
        SHAP values show how each feature shifts this model's prediction for the selected patient.
        They do not establish clinical causation.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RISK GAUGE — Light clinical
═══════════════════════════════════════════════════════════════════ */
function RiskGauge({ prediction }) {
  if (!prediction) return null;
  const { risk_score: score, risk_category: cat } = prediction;
  const R = 57, C = 2 * Math.PI * R;
  const color = catColor(cat);
  const ticks = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="gauge-wrap">
      <div className="gauge-outer">
        <svg className="gauge-svg" viewBox="0 0 148 148">
          {ticks.map(i => {
            const a = (-135 + i * 13.5) * Math.PI / 180;
            const r1 = 61, r2 = 66;
            return <line key={i}
              x1={74 + r1 * Math.cos(a)} y1={74 + r1 * Math.sin(a)}
              x2={74 + r2 * Math.cos(a)} y2={74 + r2 * Math.sin(a)}
              stroke="#D8E2EA" strokeWidth="1" />;
          })}
          {/* Track */}
          <circle cx="74" cy="74" r={R} fill="none" stroke="#EEF4F8" strokeWidth="11" />
          {/* Zone shading */}
          <circle cx="74" cy="74" r={R} fill="none" stroke={C_GREEN} strokeWidth="11"
            strokeDasharray={`${C * 0.35} ${C * 0.65}`}
            strokeDashoffset={C * 0.375} transform="rotate(-90 74 74)" opacity="0.18" />
          <circle cx="74" cy="74" r={R} fill="none" stroke={C_AMBER} strokeWidth="11"
            strokeDasharray={`${C * 0.30} ${C * 0.70}`}
            strokeDashoffset={C * 0.375 - C * 0.35} transform="rotate(-90 74 74)" opacity="0.15" />
          <circle cx="74" cy="74" r={R} fill="none" stroke={C_RED} strokeWidth="11"
            strokeDasharray={`${C * 0.35} ${C * 0.65}`}
            strokeDashoffset={C * 0.375 - C * 0.65} transform="rotate(-90 74 74)" opacity="0.13" />
          {/* Active arc */}
          <circle cx="74" cy="74" r={R} fill="none" stroke={color} strokeWidth="11"
            strokeLinecap="butt"
            strokeDasharray={`${C * (score / 100) * 0.75} ${C}`}
            strokeDashoffset={C * 0.125}
            transform="rotate(-90 74 74)"
            style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s' }} />
          <circle cx="74" cy="74" r={R + 6} fill="none" stroke="#D8E2EA" strokeWidth="0.5" />
        </svg>
        <div className="gauge-center">
          <div className="gauge-pct">{score.toFixed(0)}<span style={{ fontSize: 14, fontWeight: 400 }}>%</span></div>
          <div className={`gauge-cat ${catCls(cat)}`}>{cat}</div>
        </div>
      </div>
      <div className="gauge-legend">
        <div className="gl-item"><div className="gl-dot" style={{ background: C_GREEN }} /> Low</div>
        <div className="gl-item"><div className="gl-dot" style={{ background: C_AMBER }} /> Mod</div>
        <div className="gl-item"><div className="gl-dot" style={{ background: C_RED }}   /> High</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PULSE TRAIL (WebSocket HR history)
═══════════════════════════════════════════════════════════════════ */
function PulseTrail({ hrHistory }) {
  if (!hrHistory || hrHistory.length < 2)
    return <div style={{ height: 56, borderRadius: 8, background: '#EEF4F8', border: '1px solid #D8E2EA' }} />;

  const W = 400, H = 56;
  const mn = Math.min(...hrHistory) - 4, mx = Math.max(...hrHistory) + 4, rng = mx - mn || 1;
  const step = W / (hrHistory.length - 1);
  const pts = hrHistory.map((v, i) => [i * step, H - ((v - mn) / rng * (H - 8) + 4)]);
  const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${(hrHistory.length - 1) * step},${H} L0,${H} Z`;

  return (
    <svg className="pulse-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C_GREEN} stopOpacity="0.22" />
          <stop offset="100%" stopColor={C_GREEN} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#pg)" className="pulse-area" />
      <path d={pathD} className="pulse-path" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CLINICAL INSTRUMENT READOUTS
═══════════════════════════════════════════════════════════════════ */
function ClinicalInstruments({ indicators, patient }) {
  if (!indicators) return null;
  const bpS   = patient.ap_hi > 140 ? 'hi' : patient.ap_hi > 120 ? 'mid' : 'ok';
  const bmiS  = indicators.bmi > 30  ? 'hi' : indicators.bmi > 25  ? 'mid' : 'ok';
  const cholS = patient.cholesterol === 3 ? 'hi' : patient.cholesterol === 2 ? 'mid' : 'ok';
  const glucS = patient.gluc === 3 ? 'hi' : patient.gluc === 2 ? 'mid' : 'ok';
  const smokeS = patient.smoke ? 'hi' : 'ok';
  const actS   = patient.active ? 'ok' : 'mid';

  const stateLabel = s => s === 'hi' ? 'Elevated' : s === 'mid' ? 'Watch' : 'Normal';

  return (
    <div className="instrument-grid">
      {/* Blood Pressure — full width */}
      <div className={`instrument full st-${bpS}`}>
        <div className="inst-label">Blood Pressure</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="inst-val" style={{ color: bpS === 'hi' ? C_RED : bpS === 'mid' ? C_AMBER : C_GREEN }}>
            {patient.ap_hi}
          </span>
          <span style={{ fontSize: 18, color: '#A8BDC7', fontFamily: 'var(--font-mono)' }}>/</span>
          <span className="inst-val" style={{ color: bpS === 'hi' ? C_RED : bpS === 'mid' ? C_AMBER : C_GREEN }}>
            {patient.ap_lo}
          </span>
          <span style={{ fontSize: 12, color: '#536B7A', marginLeft: 6, marginBottom: 2 }}>mmHg</span>
        </div>
        <div style={{ fontSize: 12, color: '#536B7A', marginBottom: 4 }}>Systolic · Diastolic</div>
        <span className={`inst-status ${bpS}`}><span className={`inst-dot ${bpS}`} />{stateLabel(bpS)}</span>
      </div>

      {/* BMI */}
      <div className={`instrument st-${bmiS}`}>
        <div className="inst-label">BMI</div>
        <div className="inst-val-md" style={{ marginBottom: 6, color: bmiS === 'hi' ? C_RED : bmiS === 'mid' ? C_AMBER : C_GREEN }}>
          {indicators.bmi.toFixed(1)}
        </div>
        <div className="sev-steps">
          <div className={`sev-step lit-${bmiS === 'ok' ? 'green' : bmiS === 'mid' ? 'amber' : 'red'}`} />
          <div className={`sev-step ${indicators.bmi > 25 ? `lit-${bmiS === 'hi' ? 'red' : 'amber'}` : ''}`} />
          <div className={`sev-step ${indicators.bmi > 30 ? 'lit-red' : ''}`} />
        </div>
        <span className={`inst-status ${bmiS}`} style={{ marginTop: 6 }}><span className={`inst-dot ${bmiS}`} />{bmiS === 'ok' ? 'Normal' : bmiS === 'mid' ? 'Overweight' : 'Obese'}</span>
      </div>

      {/* Cholesterol */}
      <div className={`instrument st-${cholS}`}>
        <div className="inst-label">Cholesterol</div>
        <div className="inst-val-md" style={{ marginBottom: 6, color: cholS === 'hi' ? C_RED : cholS === 'mid' ? C_AMBER : C_GREEN }}>
          {indicators.cholesterol}
        </div>
        <div className="sev-steps">
          <div className="sev-step lit-green" />
          <div className={`sev-step ${patient.cholesterol >= 2 ? `lit-${cholS === 'hi' ? 'red' : 'amber'}` : ''}`} />
          <div className={`sev-step ${patient.cholesterol === 3 ? 'lit-red' : ''}`} />
        </div>
        <span className={`inst-status ${cholS}`} style={{ marginTop: 6 }}><span className={`inst-dot ${cholS}`} />{stateLabel(cholS)}</span>
      </div>

      {/* Glucose */}
      <div className={`instrument st-${glucS}`}>
        <div className="inst-label">Glucose</div>
        <div className="inst-val-md" style={{ marginBottom: 6, color: glucS === 'hi' ? C_RED : glucS === 'mid' ? C_AMBER : C_GREEN }}>
          {indicators.glucose}
        </div>
        <div className="sev-steps">
          <div className="sev-step lit-green" />
          <div className={`sev-step ${patient.gluc >= 2 ? `lit-${glucS === 'hi' ? 'red' : 'amber'}` : ''}`} />
          <div className={`sev-step ${patient.gluc === 3 ? 'lit-red' : ''}`} />
        </div>
        <span className={`inst-status ${glucS}`} style={{ marginTop: 6 }}><span className={`inst-dot ${glucS}`} />{stateLabel(glucS)}</span>
      </div>

      {/* Smoking */}
      <div className={`instrument st-${smokeS}`}>
        <div className="inst-label">Smoking</div>
        <div className="inst-val-md" style={{ marginBottom: 6, color: smokeS === 'hi' ? C_RED : C_GREEN }}>
          {indicators.smoking}
        </div>
        <span className={`inst-status ${smokeS}`}><span className={`inst-dot ${smokeS}`} />{patient.smoke ? 'Risk Factor' : 'Non-smoker'}</span>
      </div>

      {/* Activity */}
      <div className={`instrument st-${actS}`}>
        <div className="inst-label">Physical Activity</div>
        <div className="inst-val-md" style={{ marginBottom: 6, color: actS === 'ok' ? C_GREEN : C_AMBER }}>
          {patient.active ? 'Active' : 'Inactive'}
        </div>
        <span className={`inst-status ${actS}`}><span className={`inst-dot ${actS}`} />{patient.active ? 'Beneficial' : 'Low activity'}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODEL AGREEMENT
═══════════════════════════════════════════════════════════════════ */
function ModelAgreement({ modelInfo, selectedModel }) {
  if (!modelInfo?.metrics) return null;
  return (
    <div className="model-agreement">
      {modelInfo.metrics.map(m => {
        const isSel = selectedModel && m.model === selectedModel;
        return (
          <div key={m.model} className={`model-row${isSel ? ' sel' : ''}`}>
            <div className="model-row-name">{m.model}</div>
            <div className="model-row-val" style={{ color: isSel ? C_BLUE : '#172B3A' }}>
              {(m.roc_auc * 100).toFixed(1)}%
            </div>
            {isSel && <span className="model-row-active">Active</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ATTENTION ALERTS
═══════════════════════════════════════════════════════════════════ */
function AlertPanel({ explanation }) {
  if (!explanation) return null;
  const hi  = (explanation.modifiable || []).filter(f => f.contribution > 0.05).slice(0, 3);
  const mid = (explanation.modifiable || []).filter(f => f.contribution > 0.01 && f.contribution <= 0.05).slice(0, 2);
  const ok  = (explanation.modifiable || []).filter(f => f.contribution < -0.01).slice(0, 2);
  if (!hi.length && !mid.length && !ok.length) return null;
  return (
    <div className="alert-items">
      {hi.map(f => (
        <div key={f.feature} className="alert-item hi">
          <span className="alert-mark">▲</span>
          <span><strong>{f.label}</strong> ({f.value}) — elevated impact (<span style={{ fontFamily: 'var(--font-mono)' }}>+{f.contribution.toFixed(3)}</span>)</span>
        </div>
      ))}
      {mid.map(f => (
        <div key={f.feature} className="alert-item mid">
          <span className="alert-mark">◆</span>
          <span><strong>{f.label}</strong> ({f.value}) — watch (<span style={{ fontFamily: 'var(--font-mono)' }}>+{f.contribution.toFixed(3)}</span>)</span>
        </div>
      ))}
      {ok.map(f => (
        <div key={f.feature} className="alert-item ok">
          <span className="alert-mark">▼</span>
          <span><strong>{f.label}</strong> ({f.value}) — protective (<span style={{ fontFamily: 'var(--font-mono)' }}>{f.contribution.toFixed(3)}</span>)</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WHAT-IF SCENARIO TRAJECTORY
═══════════════════════════════════════════════════════════════════ */
function SlopeChart({ current, projected }) {
  if (!projected) return null;
  const diff = projected.risk_score - current.risk_score;
  const projColor = diff > 0 ? C_RED : diff < 0 ? C_GREEN : C_BLUE;
  
  const W = 400, H = 180;
  const padY = 50;
  
  const minRisk = Math.min(current.risk_score, projected.risk_score);
  const maxRisk = Math.max(current.risk_score, projected.risk_score);
  const domainMin = Math.max(0, minRisk - 15);
  const domainMax = Math.min(100, maxRisk + 15);
  const domainRange = domainMax - domainMin || 1;
  
  const getY = (val) => H - padY - ((val - domainMin) / domainRange) * (H - 2 * padY);
  
  const y1 = getY(current.risk_score);
  const y2 = getY(projected.risk_score);
  const x1 = 60, x2 = 340;

  return (
    <div className="slope-chart-wrap" style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Connecting line */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={projColor} strokeWidth="3" opacity="0.6" />
        
        {/* Difference label on the line */}
        <g transform={`translate(${(x1+x2)/2}, ${(y1+y2)/2 - 12})`}>
          <rect x="-40" y="-12" width="80" height="24" rx="12" fill="white" stroke={projColor} strokeWidth="1" opacity="0.9" />
          <text x="0" y="4" textAnchor="middle" fontSize="12" fontWeight="600" fill={projColor} fontFamily="var(--font-mono)">
            {diff > 0 ? '+' : ''}{diff.toFixed(1)} pp
          </text>
        </g>

        {/* Current Node */}
        <g>
          <circle cx={x1} cy={y1} r="22" fill="white" stroke="#D8E2EA" strokeWidth="2" />
          <text x={x1} y={y1+4} textAnchor="middle" fontSize="13" fontWeight="600" fill="#172B3A" fontFamily="var(--font-mono)">
            {current.risk_score.toFixed(0)}%
          </text>
          <text x={x1} y={y1+38} textAnchor="middle" fontSize="11" fontWeight="700" fill="#7F9BAA" letterSpacing="0.05em">CURRENT</text>
          <text x={x1} y={y1+54} textAnchor="middle" fontSize="11" fill={catColor(current.risk_category)} fontWeight="600">
            {current.risk_category}
          </text>
        </g>

        {/* Projected Node */}
        <g>
          <circle cx={x2} cy={y2} r="24" fill="white" stroke={projColor} strokeWidth="2.5" />
          <text x={x2} y={y2+5} textAnchor="middle" fontSize="15" fontWeight="700" fill={projColor} fontFamily="var(--font-mono)">
            {projected.risk_score.toFixed(0)}%
          </text>
          <text x={x2} y={y2+42} textAnchor="middle" fontSize="11" fontWeight="700" fill="#7F9BAA" letterSpacing="0.05em">PROJECTED</text>
          <text x={x2} y={y2+58} textAnchor="middle" fontSize="11" fill={catColor(projected.risk_category)} fontWeight="600">
            {projected.risk_category}
          </text>
        </g>
      </svg>
    </div>
  );
}

function ModelEvalPanel({ modelInfo, activeModel, currentPrediction, who }) {
  if (!modelInfo?.metrics) return <div className="context-block">Evaluation metrics not available.</div>;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Metric Table */}
      <div className="model-eval-grid">
        <div className="metric-table">
          <div className="metric-row header">
            <div className="metric-cell name">Model</div>
            <div className="metric-cell val">ROC-AUC</div>
            <div className="metric-cell val">Accuracy</div>
            <div className="metric-cell val">F1-Score</div>
          </div>
          {modelInfo.metrics.map(m => {
            const isSel = m.model === activeModel;
            return (
              <div key={m.model} className={`metric-row ${isSel ? 'selected' : ''}`}>
                <div className="metric-cell name">
                  {m.model.includes('XGBoost') ? 'Gradient Boosting' : m.model}
                  {isSel && <span className="model-selected-badge">Selected</span>}
                </div>
                <div className="metric-cell val">
                  {(m.roc_auc * 100).toFixed(1)}%
                  <div className="metric-bar"><div className="metric-bar-fill" style={{ width: `${m.roc_auc * 100}%`, background: C_BLUE }} /></div>
                </div>
                <div className="metric-cell val">
                  {(m.accuracy * 100).toFixed(1)}%
                  <div className="metric-bar"><div className="metric-bar-fill" style={{ width: `${m.accuracy * 100}%`, background: C_GREEN }} /></div>
                </div>
                <div className="metric-cell val">
                  {(m.f1 * 100).toFixed(1)}%
                  <div className="metric-bar"><div className="metric-bar-fill" style={{ width: `${m.f1 * 100}%`, background: C_CORAL }} /></div>
                </div>
              </div>
            );
          })}
        </div>
        {modelInfo.metrics.some(m => m.model.includes('unavailable')) && (
          <div style={{ fontSize: 11, color: '#7F9BAA', marginTop: 8, fontStyle: 'italic' }}>
            Note: Displaying fallback models for environments lacking specific runtimes.
          </div>
        )}
      </div>

      {/* Grouped Dot Plot */}
      <div className="dot-plot-wrap">
        <div className="section-label" style={{ marginBottom: 12 }}>Performance Distribution</div>
        <svg viewBox="0 0 400 120" style={{ width: '100%', overflow: 'visible' }}>
          {/* Axis */}
          <line x1="100" y1="100" x2="380" y2="100" stroke="#D8E2EA" strokeWidth="2" />
          {[60, 70, 80, 90, 100].map(tick => {
            const tx = 100 + ((tick - 60) / 40) * 280;
            return (
              <g key={tick}>
                <line x1={tx} y1="96" x2={tx} y2="104" stroke="#D8E2EA" strokeWidth="2" />
                <text x={tx} y="118" fontSize="10" fill="#7F9BAA" textAnchor="middle">{tick}</text>
              </g>
            );
          })}
          
          {modelInfo.metrics.map((m, i) => {
            const y = 24 + i * 32;
            const getX = (val) => 100 + ((val * 100 - 60) / 40) * 280;
            const xAuc = getX(m.roc_auc);
            const xAcc = getX(m.accuracy);
            const xF1  = getX(m.f1);
            
            let displayName = m.model;
            if (displayName.includes("XGBoost")) displayName = "GradBoost";
            if (displayName.length > 12) displayName = displayName.substring(0, 10) + "..";

            return (
              <g key={m.model}>
                <line x1="100" y1={y} x2="380" y2={y} stroke="#EEF4F8" strokeWidth="1" />
                <text x="90" y={y+4} fontSize="11" fill="#536B7A" textAnchor="end" fontWeight="500">{displayName}</text>
                <circle cx={xF1} cy={y} r="5" fill={C_CORAL} opacity="0.8" />
                <circle cx={xAcc} cy={y} r="5" fill={C_GREEN} opacity="0.8" />
                <circle cx={xAuc} cy={y} r="5" fill={C_BLUE} opacity="0.8" />
              </g>
            );
          })}
          
          {/* Legend */}
          <g transform="translate(100, 0)">
            <circle cx="0" cy="0" r="4" fill={C_BLUE} />
            <text x="8" y="4" fontSize="10" fill="#536B7A">ROC-AUC</text>
            <circle cx="70" cy="0" r="4" fill={C_GREEN} />
            <text x="78" y="4" fontSize="10" fill="#536B7A">Accuracy</text>
            <circle cx="140" cy="0" r="4" fill={C_CORAL} />
            <text x="148" y="4" fontSize="10" fill="#536B7A">F1-Score</text>
          </g>
        </svg>
      </div>

      {/* Patient Estimates Panel */}
      <div className="patient-est-panel">
        <div className="section-label">Current Patient Estimate by Model</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {modelInfo.metrics.map(m => {
            const isSel = m.model === activeModel;
            return (
              <div key={m.model} className={`est-card ${isSel ? 'active' : ''}`}>
                <div className="est-model">{m.model.includes('XGBoost') ? 'GradBoost' : m.model}</div>
                {isSel ? (
                  <div className="est-val">{Math.round(currentPrediction.risk_score)}%</div>
                ) : (
                  <div className="est-unavailable">Unavailable in this assessment mode</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Glossary */}
      <div className="metric-glossary">
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, fontSize: 13 }}>Understanding the metrics</div>
        <ul>
          <li><strong>ROC-AUC:</strong> How well the model separates higher-risk from lower-risk cases across possible decision thresholds. Higher is better.</li>
          <li><strong>Accuracy:</strong> The proportion of all test records the model classified correctly.</li>
          <li><strong>F1-score:</strong> A balance between identifying positive cases and avoiding incorrect positive predictions. Useful when both error types matter.</li>
        </ul>
        <div style={{ marginTop: 8, fontStyle: 'italic', fontSize: 12, color: 'var(--text-muted)' }}>
          These are held-out test-set evaluation metrics. They are not an individual patient’s predicted risk percentage.
        </div>
      </div>
      
      {/* WHO GHO */}
      <div className="context-block" style={{ marginTop: 0, padding: '10px 14px' }}>
        <strong>WHO GHO Benchmark:</strong> {who?.message || 'Not configured for this prototype.'}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [patientsList, setPatientsList] = useState([DEMO]);
  const [patient,      setPatient]      = useState(DEMO);
  const [result,       setResult]       = useState(null);
  const [simPatient,   setSimPatient]   = useState(DEMO);
  const [simResult,    setSimResult]    = useState(null);
  const [telemetry,    setTelemetry]    = useState(null);
  const [hrHistory,    setHrHistory]    = useState([]);
  const [who,          setWho]          = useState(null);
  const [modelInfo,    setModelInfo]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [assessedAt,   setAssessedAt]   = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    fetch(API + '/api/patients').then(r => r.json()).then(data => {
      if (data?.length) { setPatientsList(data); setPatient(data[0]); setSimPatient(data[0]); }
    }).catch(() => {});
    fetch(API + '/api/who/benchmark').then(r => r.json()).then(setWho).catch(() => {});
    fetch(API + '/api/models').then(r => r.json()).then(setModelInfo).catch(() => {});
  }, []);

  const connectWS = useCallback(p => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`ws://localhost:8000/ws/patient/${p.patient_id}`);
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      setTelemetry(d);
      setHrHistory(prev => [...prev.slice(-28), d.heart_rate]);
    };
    wsRef.current = ws;
  }, []);

  const assess = useCallback(async p => {
    setLoading(true);
    try {
      const r = await fetch(API + '/api/assessment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      const data = await r.json();
      setResult(data); setSimResult(null); setSimPatient(p); setAssessedAt(nowStr());
      connectWS(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [connectWS]);

  useEffect(() => { if (patient) assess(patient); }, [patient.patient_id]);

  const changeBase = (k, v) => setPatient(p => ({ ...p, [k]: Number(v) }));
  const changeSim  = (k, v) => setSimPatient(p => ({ ...p, [k]: Number(v) }));

  const runWhatIf = async () => {
    const changes = Object.fromEntries(Object.entries(simPatient).filter(([k, v]) => patient[k] !== v && k !== 'patient_id'));
    if (!Object.keys(changes).length) return;
    try {
      const r = await fetch(API + '/api/what-if', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseline: patient, changes }) });
      setSimResult(await r.json());
    } catch (e) { console.error(e); }
  };

  const changedFactors = Object.keys(simPatient).filter(k => simPatient[k] !== patient[k] && k !== 'patient_id');

  return (
    <div className="app-shell">

      {/* ══ HEADER ══ */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24"><path d="M12 21C12 21 4 13.5 4 8.5a4.5 4.5 0 0 1 9-0.5 4.5 4.5 0 0 1 9 0.5c0 5-8 12.5-8 12.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <div className="brand-name">CardioRisk Analytics</div>
            <div className="brand-sub">Clinical Decision Support · Research Prototype</div>
          </div>
        </div>
        <div className="header-right">
          {assessedAt && <div className="header-time">Last assessed {assessedAt}</div>}
          <span className="proto-badge">Academic Prototype</span>
        </div>
      </header>

      {/* ══ MAIN 3-COLUMN GRID ══ */}
      <div className="main-grid">

        {/* ── LEFT: Patient Context ── */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Patient Context</div>
                <div className="card-sub">Active clinical record</div>
              </div>
              <span className="card-tag">{patient.patient_id}</span>
            </div>

            <select className="patient-select" value={patient.patient_id}
              onChange={e => { const s = patientsList.find(p => p.patient_id === e.target.value); if (s) setPatient(s); }}>
              {patientsList.map(p => <option key={p.patient_id} value={p.patient_id}>Patient {p.patient_id}</option>)}
            </select>

            <div className="meta-row">
              <div className="meta-chip"><div className="mc-label">Age</div><div className="mc-value">{patient.age_years.toFixed(0)} yr</div></div>
              <div className="meta-chip"><div className="mc-label">Sex</div><div className="mc-value">{patient.gender === 1 ? 'F' : 'M'}</div></div>
              <div className="meta-chip"><div className="mc-label">Source</div><div className="mc-value" style={{ fontSize: 12 }}>Records</div></div>
            </div>

            <div className="section-label">Clinical Parameters</div>
            <div className="form-pair">
              <div className="field-wrap">
                <label className="field-label">Weight (kg)</label>
                <input className="field-input" type="number" value={patient.weight} onChange={e => changeBase('weight', e.target.value)} />
              </div>
              <div className="field-wrap">
                <label className="field-label">Height (cm)</label>
                <input className="field-input" type="number" value={patient.height} onChange={e => changeBase('height', e.target.value)} />
              </div>
            </div>
            <div className="field-wrap">
              <label className="field-label">Systolic BP (mmHg)</label>
              <input className="field-input" type="number" value={patient.ap_hi} onChange={e => changeBase('ap_hi', e.target.value)} />
            </div>
            <div className="field-wrap">
              <label className="field-label">Diastolic BP (mmHg)</label>
              <input className="field-input" type="number" value={patient.ap_lo} onChange={e => changeBase('ap_lo', e.target.value)} />
            </div>
            <div className="field-wrap">
              <label className="field-label">Cholesterol</label>
              <select className="field-select" value={patient.cholesterol} onChange={e => changeBase('cholesterol', e.target.value)}>
                <option value="1">1 — Normal</option>
                <option value="2">2 — Above Normal</option>
                <option value="3">3 — High</option>
              </select>
            </div>
            <div className="field-wrap" style={{ marginBottom: 14 }}>
              <label className="field-label">Glucose</label>
              <select className="field-select" value={patient.gluc} onChange={e => changeBase('gluc', e.target.value)}>
                <option value="1">1 — Normal</option>
                <option value="2">2 — Above Normal</option>
                <option value="3">3 — High</option>
              </select>
            </div>

            <div className="toggle-pair">
              <button className={`toggle-btn${patient.smoke ? ' on-red' : ''}`}
                onClick={() => changeBase('smoke', patient.smoke ? 0 : 1)}>
                Smoker {patient.smoke ? '✓' : ''}
              </button>
              <button className={`toggle-btn${patient.active ? ' on-green' : ''}`}
                onClick={() => changeBase('active', patient.active ? 0 : 1)}>
                Active {patient.active ? '✓' : ''}
              </button>
            </div>

            <button className="btn-assess" onClick={() => assess(patient)} disabled={loading}>
              {loading ? 'Processing...' : 'Run Assessment'}
            </button>
          </div>

          {/* Telemetry */}
          <div className="card">
            <div className="telem-header">
              <div>
                <div className="card-title" style={{ marginBottom: 2 }}>Live Telemetry</div>
                <div className="card-sub">Simulated demonstration stream</div>
              </div>
              <div className="telem-live"><div className="telem-dot" /><span className="telem-label">Live</span></div>
            </div>
            {telemetry ? (
              <>
                <div className="telem-readings">
                  <div>
                    <div className="telem-val">{telemetry.systolic_bp}<span style={{ fontSize: 18, color: '#A8BDC7' }}>/</span>{telemetry.diastolic_bp}</div>
                    <div className="telem-unit">BP mmHg</div>
                  </div>
                  <div>
                    <div className="telem-val">{telemetry.heart_rate}</div>
                    <div className="telem-unit">HR bpm</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#7F9BAA', marginBottom: 6, fontStyle: 'italic' }}>Simulated pulse trend</div>
                <PulseTrail hrHistory={hrHistory} />
                <div className="telem-note">Demonstration stream — not hospital data. Updates every 3 s.</div>
              </>
            ) : (
              <div style={{ color: '#7F9BAA', fontSize: 13, padding: '8px 0' }}>Awaiting connection...</div>
            )}
          </div>
        </div>

        {/* ── CENTER: Heart + Gauge ── */}
        <div>
          <div className="card heart-panel">
            {/* Heart Viewport */}
            <div className="heart-viewport">
              <div className="vp-rings">
                <div className="vp-ring vp-ring-1" />
                <div className="vp-ring vp-ring-2" />
                <div className="vp-ring vp-ring-3" />
                <div className="vp-cross" />
              </div>
              <div className="heart-halo" />
              <div className="heart-halo heart-halo-2" />
              <div className="heart-img-wrap">
                <img src="/heart.png" className="heart-img" alt="Illustrative anatomical heart — not a patient scan" draggable="false" />
              </div>
              <div className="vp-label">Illustrative patient risk view · not an anatomical diagnosis</div>
            </div>

            {/* Gauge + model info + alerts */}
            <div className="heart-lower">
              <RiskGauge prediction={result?.prediction} />
              <div className="model-info">
                {result ? (
                  <>
                    <div>
                      <div className="model-label-sm">Active Model</div>
                      <span className="model-chip">{result.prediction.model_used}</span>
                    </div>
                    <div>
                      <div className="model-label-sm">Patient ID</div>
                      <div className="model-val-sm" style={{ fontFamily: 'var(--font-mono)' }}>{patient.patient_id}</div>
                    </div>
                    <AlertPanel explanation={result.explanation} />
                  </>
                ) : (
                  <div style={{ color: '#7F9BAA', fontSize: 14 }}>Run an assessment to see results.</div>
                )}
              </div>
            </div>
          </div>

          {/* SHAP Chart */}
          {result && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">SHAP Contribution Chart</div>
                  <div className="card-sub">Diverging bar chart · sorted by absolute impact · actual values only</div>
                </div>
              </div>
              <ShapDivergingChart data={result.explanation} />
            </div>
          )}
        </div>

        {/* ── RIGHT: Clinical Readouts + Model Agreement ── */}
        <div>
          {result && (
            <>
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Clinical Profile</div>
                    <div className="card-sub">Instrument readouts · patient record values</div>
                  </div>
                </div>
                <ClinicalInstruments indicators={result.indicators} patient={patient} />
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Model Agreement</div>
                    <div className="card-sub">Hold-out ROC-AUC per model</div>
                  </div>
                </div>
                <ModelAgreement modelInfo={modelInfo} selectedModel={result.prediction.model_used} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ BOTTOM GRID ══ */}
      {result && (
        <div className="bottom-grid">
          {/* What-If */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Scenario Simulation</div>
                <div className="card-sub">Adjust modifiable factors · What-If API output only</div>
              </div>
            </div>
            
            <div className="scenario-grid">
              {/* Left: 2x2 Factors Grid */}
              <div className="sim-factors-area">
                <div className="sim-factor-cell">
                  <label className="field-label">Systolic BP (mmHg)</label>
                  <input className="field-input" type="number" value={simPatient.ap_hi} onChange={e => changeSim('ap_hi', e.target.value)} />
                  <div className={`inst-status ${simPatient.ap_hi > 140 ? 'hi' : simPatient.ap_hi > 120 ? 'mid' : 'ok'}`} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <span className={`inst-dot ${simPatient.ap_hi > 140 ? 'hi' : simPatient.ap_hi > 120 ? 'mid' : 'ok'}`} />
                    {simPatient.ap_hi > 140 ? 'Elevated' : simPatient.ap_hi > 120 ? 'Watch' : 'Normal'}
                  </div>
                </div>
                
                <div className="sim-factor-cell">
                  <label className="field-label">Weight (kg)</label>
                  <input className="field-input" type="number" value={simPatient.weight} onChange={e => changeSim('weight', e.target.value)} />
                  <div className={`inst-status ${simPatient.weight > 90 ? 'hi' : simPatient.weight > 75 ? 'mid' : 'ok'}`} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <span className={`inst-dot ${simPatient.weight > 90 ? 'hi' : simPatient.weight > 75 ? 'mid' : 'ok'}`} />
                    {simPatient.weight > 90 ? 'High' : simPatient.weight > 75 ? 'Elevated' : 'Normal'}
                  </div>
                </div>

                <div className="sim-factor-cell">
                  <label className="field-label">Cholesterol</label>
                  <select className="field-select" value={simPatient.cholesterol} onChange={e => changeSim('cholesterol', e.target.value)}>
                    <option value="1">1 — Normal</option><option value="2">2 — Above Normal</option><option value="3">3 — High</option>
                  </select>
                  <div className={`inst-status ${simPatient.cholesterol == 3 ? 'hi' : simPatient.cholesterol == 2 ? 'mid' : 'ok'}`} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <span className={`inst-dot ${simPatient.cholesterol == 3 ? 'hi' : simPatient.cholesterol == 2 ? 'mid' : 'ok'}`} />
                    {simPatient.cholesterol == 3 ? 'High' : simPatient.cholesterol == 2 ? 'Watch' : 'Normal'}
                  </div>
                </div>

                <div className="sim-factor-cell">
                  <label className="field-label">Physical Activity</label>
                  <select className="field-select" value={simPatient.active} onChange={e => changeSim('active', e.target.value)}>
                    <option value="1">Active</option><option value="0">Inactive</option>
                  </select>
                  <div className={`inst-status ${simPatient.active == 1 ? 'ok' : 'mid'}`} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <span className={`inst-dot ${simPatient.active == 1 ? 'ok' : 'mid'}`} />
                    {simPatient.active == 1 ? 'Beneficial' : 'Low activity'}
                  </div>
                </div>
              </div>

              {/* Right: Summary */}
              <div className="sim-summary-area">
                {simResult?.simulated ? (
                  <div className="sim-summary-grid">
                    <div className="sim-summary-item">
                      <div className="ss-label">Current Risk</div>
                      <div className="ss-val">{result.prediction.risk_score.toFixed(1)}%</div>
                    </div>
                    <div className="sim-summary-item">
                      <div className="ss-label">Projected Risk</div>
                      <div className="ss-val" style={{ color: simResult.difference_points > 0 ? C_RED : simResult.difference_points < 0 ? C_GREEN : C_BLUE }}>
                        {simResult.simulated.risk_score.toFixed(1)}%
                      </div>
                    </div>
                    <div className="sim-summary-item">
                      <div className="ss-label">Change (pp)</div>
                      <div className="ss-val" style={{ color: simResult.difference_points > 0 ? C_RED : simResult.difference_points < 0 ? C_GREEN : C_BLUE }}>
                        {simResult.difference_points > 0 ? '+' : ''}{simResult.difference_points.toFixed(1)}
                      </div>
                    </div>
                    <div className="sim-summary-item">
                      <div className="ss-label">Category Shift</div>
                      <div className="ss-val" style={{ fontSize: 13, alignSelf: 'center' }}>
                        {result.prediction.risk_category} → {simResult.simulated.risk_category}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="context-block" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div>
                      <div>Modify factors and click</div>
                      <strong>Project Scenario</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0' }}>
              <button className="btn-whatif" onClick={runWhatIf} disabled={!changedFactors.length}>
                Project Scenario
              </button>
              {changedFactors.length > 0 && (
                <span style={{ fontSize: 13, color: '#536B7A' }}>Adjusting: {changedFactors.join(', ')}</span>
              )}
            </div>
            
            {simResult?.simulated ? (
              <SlopeChart current={result.prediction} projected={simResult.simulated} />
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-muted)' }}>
                Scenario visualization will appear here
              </div>
            )}
          </div>

          {/* Model eval context */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Model Performance Comparison</div>
                <div className="card-sub">Test-set evaluation metrics and benchmarks</div>
              </div>
            </div>
            <ModelEvalPanel modelInfo={modelInfo} activeModel={result.prediction.model_used} currentPrediction={result.prediction} who={who} />
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
