import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

/* ─── CONSTANTS ──────────────────────────────────────────────────── */
const API  = 'http://localhost:8000';
const DEMO = { patient_id:'DEMO-001', age_years:54, gender:2, height:168, weight:78, ap_hi:145, ap_lo:92, cholesterol:2, gluc:1, smoke:0, alco:0, active:1 };

const C_GREEN = '#159B78';
const C_RED   = '#C94040';
const C_AMBER = '#C98B20';
const C_BLUE  = '#3B72B0';

const catCls   = c => ({ High:'high', Moderate:'moderate', Low:'low' }[c] ?? 'low');
const catColor = c => ({ High: C_RED, Moderate: C_AMBER, Low: C_GREEN }[c] ?? C_GREEN);
const nowStr   = () => new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
const nowDateStr = () => new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

/* ─── CLAMP ──────────────────────────────────────────────────────── */
function clamp(v, lo, hi) {
  if (v == null || isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL SYSTEM
═══════════════════════════════════════════════════════════════════ */
function Modal({ open, onClose, title, subtitle, width = 720, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="modal-box"
        style={{ maxWidth: width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RISK GAUGE — Deterministic angle-based arc (always monotonic)

   MIN_ANGLE = -135° (leftmost = 0%)
   MAX_ANGLE = +135° (rightmost = 100%)
   angle = MIN_ANGLE + clamp(score,0,100)/100 * (MAX_ANGLE-MIN_ANGLE)

   SVG arc is drawn using polar→cartesian. Guaranteed clockwise for
   increasing risk. Handles null/NaN/negative/over-100 safely.
═══════════════════════════════════════════════════════════════════ */
function RiskGauge({ prediction }) {
  const MIN_DEG = -135, MAX_DEG = 135;
  const CX = 80, CY = 80, R = 60;

  const score = (prediction && !isNaN(prediction.risk_score))
    ? clamp(prediction.risk_score, 0, 100)
    : 0;
  const cat   = prediction?.risk_category ?? 'Low';
  const color = catColor(cat);

  function polar(cx, cy, r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startDeg, endDeg, r, strokeW = 0) {
    const inner = r - strokeW / 2;
    const s = polar(CX, CY, inner, startDeg);
    const e = polar(CX, CY, inner, endDeg);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${inner} ${inner} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const needleDeg = MIN_DEG + (score / 100) * (MAX_DEG - MIN_DEG);
  const needleTip = polar(CX, CY, R - 8, needleDeg);
  const needleBase1 = polar(CX, CY, 8, needleDeg + 90);
  const needleBase2 = polar(CX, CY, 8, needleDeg - 90);

  // Zone boundaries (degrees)
  const lowEnd  = MIN_DEG + 0.35 * (MAX_DEG - MIN_DEG); // 35%
  const midEnd  = MIN_DEG + 0.65 * (MAX_DEG - MIN_DEG); // 65%

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 160 130" className="gauge-svg-v2">
        {/* Track */}
        <path d={arcPath(MIN_DEG, MAX_DEG, R, 12)} fill="none" stroke="#EEF4F8" strokeWidth="12" strokeLinecap="butt"/>
        {/* Zone: Low */}
        <path d={arcPath(MIN_DEG, lowEnd, R, 12)} fill="none" stroke={C_GREEN} strokeWidth="12" strokeLinecap="butt" opacity="0.20"/>
        {/* Zone: Moderate */}
        <path d={arcPath(lowEnd, midEnd, R, 12)} fill="none" stroke={C_AMBER} strokeWidth="12" strokeLinecap="butt" opacity="0.18"/>
        {/* Zone: High */}
        <path d={arcPath(midEnd, MAX_DEG, R, 12)} fill="none" stroke={C_RED} strokeWidth="12" strokeLinecap="butt" opacity="0.18"/>
        {/* Active fill */}
        <path
          d={arcPath(MIN_DEG, needleDeg, R, 12)}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="butt"
          style={{ transition: 'all 0.5s ease' }}
        />
        {/* Needle */}
        <polygon
          points={`${needleTip.x.toFixed(1)},${needleTip.y.toFixed(1)} ${needleBase1.x.toFixed(1)},${needleBase1.y.toFixed(1)} ${needleBase2.x.toFixed(1)},${needleBase2.y.toFixed(1)}`}
          fill={color} opacity="0.90"
          style={{ transition: 'all 0.5s ease' }}
        />
        {/* Centre cap */}
        <circle cx={CX} cy={CY} r="5" fill="white" stroke={color} strokeWidth="2"/>

        {/* Scale labels */}
        <text x={polar(CX,CY,R+14,MIN_DEG).x.toFixed(1)} y={(polar(CX,CY,R+14,MIN_DEG).y+4).toFixed(1)}
          fontSize="8" fill="#A8BDC7" textAnchor="middle" fontFamily="var(--font-mono)">0</text>
        <text x={(polar(CX,CY,R+14,0).x+2).toFixed(1)} y={(polar(CX,CY,R+14,0).y+4).toFixed(1)}
          fontSize="8" fill="#A8BDC7" textAnchor="middle" fontFamily="var(--font-mono)">50</text>
        <text x={(polar(CX,CY,R+14,MAX_DEG).x).toFixed(1)} y={(polar(CX,CY,R+14,MAX_DEG).y+4).toFixed(1)}
          fontSize="8" fill="#A8BDC7" textAnchor="middle" fontFamily="var(--font-mono)">100</text>
      </svg>

      <div className="gauge-legend">
        <div className="gl-item"><div className="gl-dot" style={{ background: C_GREEN }} /> Low</div>
        <div className="gl-item"><div className="gl-dot" style={{ background: C_AMBER }} /> Mod</div>
        <div className="gl-item"><div className="gl-dot" style={{ background: C_RED }}   /> High</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHAP DIVERGING BAR CHART (unchanged logic)
═══════════════════════════════════════════════════════════════════ */
function ShapDivergingChart({ data }) {
  if (!data) return null;

  const actionable = [...(data.modifiable    || [])].sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const baseline   = [...(data.non_modifiable|| [])].sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const all        = [...actionable, ...baseline];
  const maxAbs     = Math.max(...all.map(f => Math.abs(f.contribution)), 0.01);

  const topRisk = [...all].filter(f => f.contribution > 0).sort((a,b) => b.contribution - a.contribution)[0];
  const topProt = [...all].filter(f => f.contribution < 0).sort((a,b) => a.contribution - b.contribution)[0];

  const COLS = '160px minmax(0,1fr) 2px minmax(0,1fr) 68px';

  const BarRow = ({ f, muted = false, isBaseline = false }) => {
    const isRisk  = f.contribution > 0;
    const pct     = (Math.abs(f.contribution) / maxAbs) * 100;
    const color   = isBaseline ? C_BLUE : (isRisk ? C_RED : C_GREEN);
    const valStr  = `${f.contribution > 0 ? '+' : ''}${f.contribution.toFixed(3)}`;
    const dirText = isRisk ? 'increases risk' : 'reduces risk';

    return (
      <div role="row" aria-label={`${f.label}: SHAP ${valStr}, ${dirText}`}
        style={{ display:'grid', gridTemplateColumns:COLS, alignItems:'center', minHeight:36, opacity: muted ? 0.6 : 1, borderRadius:6, padding:'2px 0' }}>
        <div style={{ paddingRight:10, textAlign:'right' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'#172B3A', lineHeight:1.25 }}>{f.label}</div>
          <div style={{ fontSize:10, color:'#536B7A', fontFamily:'var(--font-mono)', marginTop:1 }}>{f.value}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', height:24 }}>
          {!isRisk && <div style={{ width:`${pct}%`, height:11, background:color, opacity:0.82, borderRadius:'4px 0 0 4px', transition:'width 0.4s ease' }} />}
        </div>
        <div aria-hidden style={{ width:2, height:28, background:'#D8E2EA', alignSelf:'center', flexShrink:0 }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', height:24 }}>
          {isRisk && <div style={{ width:`${pct}%`, height:11, background:color, opacity:0.85, borderRadius:'0 4px 4px 0', transition:'width 0.4s ease' }} />}
        </div>
        <div style={{ paddingLeft:8, textAlign:'left' }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, color, lineHeight:1 }}>{valStr}</div>
          <div style={{ fontSize:9, color:'#7F9BAA', marginTop:2, whiteSpace:'nowrap' }}>{dirText}</div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="shap-summary-box">
        {topRisk ? (
          <div className="shap-summary-line">
            <span className="lbl" style={{ color: C_RED }}>Strongest risk driver: </span>
            {topRisk.label} ({topRisk.value}),{' '}
            <span className="mono" style={{ color: C_RED }}>SHAP +{topRisk.contribution.toFixed(3)}</span>
          </div>
        ) : <div className="shap-summary-empty">No factors are increasing this prediction.</div>}
        {topProt ? (
          <div className="shap-summary-line">
            <span className="lbl" style={{ color: C_GREEN }}>Strongest protective factor: </span>
            {topProt.label} ({topProt.value}),{' '}
            <span className="mono" style={{ color: C_GREEN }}>SHAP {topProt.contribution.toFixed(3)}</span>
          </div>
        ) : <div className="shap-summary-empty">No factors are reducing this prediction.</div>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:COLS, paddingBottom:6, marginBottom:4, borderBottom:'1px solid #D8E2EA' }}>
        <div style={{ textAlign:'right', paddingRight:10, fontSize:10, fontWeight:700, color:C_GREEN, textTransform:'uppercase', letterSpacing:'0.05em' }}>← Protective</div>
        <div /><div />
        <div style={{ paddingLeft:4, fontSize:10, fontWeight:700, color:C_RED, textTransform:'uppercase', letterSpacing:'0.05em' }}>Risk Increasing →</div>
        <div />
      </div>

      {actionable.length > 0 && (
        <div>
          <div className="shap-section-title">Modifiable / Actionable Factors</div>
          {actionable.map(f => <BarRow key={f.feature} f={f} isBaseline={false} />)}
        </div>
      )}
      {baseline.length > 0 && (
        <div>
          <div className="shap-section-title">Non-Modifiable / Baseline</div>
          {baseline.map(f => <BarRow key={f.feature} f={f} muted isBaseline />)}
        </div>
      )}

      <div className="shap-disclaimer">
        Bars show model contribution to this patient's estimated risk.
        They indicate model influence, not clinical causation.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HEALTH INDICATOR TABLE (right panel — replaces CompactHealthIndicators)
═══════════════════════════════════════════════════════════════════ */
function HealthIndicatorTable({ indicators, patient }) {
  if (!indicators || !patient) return (
    <div style={{ color:'#7F9BAA', fontSize:12, padding:'10px 0' }}>Awaiting assessment...</div>
  );

  const bmiVal = patient.weight / (patient.height / 100) ** 2;
  const bpS   = patient.ap_hi > 140 ? 'hi' : patient.ap_hi > 120 ? 'mid' : 'ok';
  const bmiS  = bmiVal > 30  ? 'hi' : bmiVal > 25  ? 'mid' : 'ok';
  const cholS = patient.cholesterol === 3 ? 'hi' : patient.cholesterol === 2 ? 'mid' : 'ok';
  const glucS = patient.gluc === 3 ? 'hi' : patient.gluc === 2 ? 'mid' : 'ok';
  const smokeS = patient.smoke ? 'hi' : 'ok';
  const alcoS  = patient.alco  ? 'mid' : 'ok';
  const actS   = patient.active ? 'ok' : 'mid';

  const stLabel = s => s === 'hi' ? 'Elevated' : s === 'mid' ? 'Watch' : 'Normal';
  const stColor = s => s === 'hi' ? C_RED : s === 'mid' ? C_AMBER : C_GREEN;

  // Numeric positions (0–1) on the range track
  const bpPos   = Math.min(1, Math.max(0, (patient.ap_hi - 80) / (200 - 80)));
  const bmiPos  = Math.min(1, Math.max(0, (bmiVal - 15) / (45 - 15)));
  const cholPos = (patient.cholesterol - 1) / 2;
  const glucPos = (patient.gluc - 1) / 2;

  const rows = [
    { label:'Blood Pressure', val: indicators.blood_pressure, state: bpS, pos: bpPos },
    { label:'BMI',            val: bmiVal.toFixed(1),          state: bmiS, pos: bmiPos },
    { label:'Cholesterol',    val: indicators.cholesterol,     state: cholS, pos: cholPos },
    { label:'Glucose',        val: indicators.glucose,         state: glucS, pos: glucPos },
    { label:'Smoking',        val: indicators.smoking,         state: smokeS, pos: null },
    { label:'Alcohol',        val: indicators.alcohol,         state: alcoS, pos: null },
    { label:'Physical Activity', val: indicators.physical_activity, state: actS, pos: null },
  ];

  // For categorical fields with no real position, map state to fixed positions
  const stPos = s => s === 'ok' ? 0.15 : s === 'mid' ? 0.52 : 0.85;

  return (
    <div>
      <div className="ind-table-header">
        <div className="ind-th">Parameter</div>
        <div className="ind-th">Value</div>
        <div className="ind-th">Status</div>
        <div className="ind-th">Range</div>
      </div>
      <div className="ind-table">
        {rows.map(({ label, val, state, pos }) => {
          const dotPos = pos !== null ? pos : stPos(state);
          return (
            <div key={label} className={`ind-row st-${state}`}>
              <div className="ind-param">{label}</div>
              <div className="ind-value">{val}</div>
              <div>
                <span className={`ind-status-pill ${state}`}>
                  <span className={`ind-dot ${state}`} />
                  {stLabel(state)}
                </span>
              </div>
              <div className="range-bar-wrap">
                <div className="range-track" />
                <div
                  className="range-dot-marker"
                  style={{
                    left: `calc(${dotPos * 100}% - 4px)`,
                    background: stColor(state),
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SLOPE CHART (What-If comparison)
═══════════════════════════════════════════════════════════════════ */
function SlopeChart({ current, simulated }) {
  const W = 240, H = 160, padY = 40;

  if (!simulated) {
    return (
      <div style={{ width:'100%', height:H, display:'flex', alignItems:'center', justifyContent:'center',
        color:'#A8BDC7', fontSize:11, border:'1px dashed #D8E2EA', borderRadius:8, textAlign:'center', padding:12 }}>
        Modify factors and apply to see the comparison
      </div>
    );
  }

  const diff = simulated.risk_score - current.risk_score;
  const projColor = diff > 0 ? C_RED : diff < 0 ? C_GREEN : C_BLUE;

  const minRisk = Math.min(current.risk_score, simulated.risk_score);
  const maxRisk = Math.max(current.risk_score, simulated.risk_score);
  const domainMin = Math.max(0, minRisk - 15);
  const domainMax = Math.min(100, maxRisk + 15);
  const domainRange = domainMax - domainMin || 1;
  const getY = val => H - padY - ((val - domainMin) / domainRange) * (H - 2 * padY);
  const y1 = getY(current.risk_score);
  const y2 = getY(simulated.risk_score);
  const x1 = 50, x2 = 190;

  return (
    <div style={{ width:'100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
        style={{ width:'100%', height:'auto', overflow:'visible' }}>
        {/* Soft grid */}
        <line x1={x1-20} y1={getY(50)} x2={x2+20} y2={getY(50)}
          stroke="#EEF4F8" strokeWidth="1" strokeDasharray="4 2"/>
        <text x={x1-22} y={getY(50)+4} fontSize="8" fill="#D8E2EA" textAnchor="end"
          fontFamily="var(--font-mono)">50</text>

        {/* Connector */}
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={projColor} strokeWidth="2" opacity="0.5" strokeDasharray="5 3"/>

        {/* Current node */}
        <circle cx={x1} cy={y1} r="20" fill="white" stroke="#D8E2EA" strokeWidth="1.5"/>
        <text x={x1} y={y1+5} textAnchor="middle" fontSize="13" fontWeight="700"
          fill="#172B3A" fontFamily="var(--font-mono)">{current.risk_score.toFixed(0)}%</text>
        <text x={x1} y={y1+34} textAnchor="middle" fontSize="9" fontWeight="700"
          fill="#7F9BAA" letterSpacing="0.06em">CURRENT</text>
        <text x={x1} y={y1+46} textAnchor="middle" fontSize="10"
          fill={catColor(current.risk_category)} fontWeight="600">{current.risk_category}</text>

        {/* Target node */}
        <circle cx={x2} cy={y2} r="22" fill="white" stroke={projColor} strokeWidth="2"/>
        <text x={x2} y={y2+5} textAnchor="middle" fontSize="14" fontWeight="700"
          fill={projColor} fontFamily="var(--font-mono)">{simulated.risk_score.toFixed(0)}%</text>
        <text x={x2} y={y2+38} textAnchor="middle" fontSize="9" fontWeight="700"
          fill="#7F9BAA" letterSpacing="0.06em">TARGET</text>
        <text x={x2} y={y2+50} textAnchor="middle" fontSize="10"
          fill={catColor(simulated.risk_category)} fontWeight="600">{simulated.risk_category}</text>
      </svg>

      <div style={{ textAlign:'center', marginTop:6 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700, color:projColor }}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)} pp
        </div>
        <div style={{ fontSize:10, color:'#7F9BAA', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>
          Estimated change
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PULSE TRAIL SPARKLINE
═══════════════════════════════════════════════════════════════════ */
function PulseTrail({ hrHistory, color = C_GREEN, height = 36 }) {
  if (!hrHistory || hrHistory.length < 2)
    return <div style={{ height, borderRadius:4, background:'#EEF4F8' }} />;
  const W = 300, H = height;
  const mn = Math.min(...hrHistory) - 4, mx = Math.max(...hrHistory) + 4, rng = mx - mn || 1;
  const step = W / (hrHistory.length - 1);
  const pts = hrHistory.map((v, i) => [i * step, H - ((v - mn) / rng * (H - 6) + 3)]);
  const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${(hrHistory.length - 1) * step},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sparkGrad-${color.replace('#','')})`}/>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODEL EVAL PANEL (for modal)
═══════════════════════════════════════════════════════════════════ */
function ModelEvalPanel({ modelInfo, activeModel }) {
  if (!modelInfo?.metrics) return <div className="context-block">Evaluation metrics not available.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <div className="section-label" style={{ marginBottom:6 }}>Selection Metric: ROC-AUC</div>
        <div style={{ fontSize:12, color:'#536B7A', marginBottom:12 }}>
          The model with the highest ROC-AUC on the held-out test set was selected for all predictions.
        </div>
        <div className="metric-table">
          <div className="metric-row header">
            <div className="metric-cell name">Model</div>
            <div className="metric-cell val">ROC-AUC</div>
            <div className="metric-cell val">Accuracy</div>
            <div className="metric-cell val">F1-Score</div>
          </div>
          {modelInfo.metrics.map(m => {
            const isSel = m.model === modelInfo.best_model || m.model === modelInfo.best_model_raw;
            const displayName = m.model.includes('XGBoost runtime unavailable')
              ? 'Gradient Boosting (HistGB)'
              : m.model;
            return (
              <div key={m.model} className={`metric-row ${isSel ? 'selected' : ''}`}>
                <div className="metric-cell name">
                  {displayName}
                  {isSel && <span className="model-selected-badge">Selected</span>}
                </div>
                <div className="metric-cell val">
                  {(m.roc_auc * 100).toFixed(1)}%
                  <div className="metric-bar"><div className="metric-bar-fill" style={{ width:`${m.roc_auc*100}%`, background:C_BLUE }}/></div>
                </div>
                <div className="metric-cell val">
                  {(m.accuracy * 100).toFixed(1)}%
                  <div className="metric-bar"><div className="metric-bar-fill" style={{ width:`${m.accuracy*100}%`, background:C_GREEN }}/></div>
                </div>
                <div className="metric-cell val">
                  {(m.f1 * 100).toFixed(1)}%
                  <div className="metric-bar"><div className="metric-bar-fill" style={{ width:`${m.f1*100}%`, background:'#E07A5F' }}/></div>
                </div>
              </div>
            );
          })}
        </div>
        {modelInfo.metrics.some(m => m.model.includes('unavailable')) && (
          <div style={{ fontSize:11, color:'#7F9BAA', marginTop:8, fontStyle:'italic' }}>
            Note: XGBoost runtime was unavailable on this platform. scikit-learn HistGradientBoostingClassifier was used as an equivalent fallback and is the active model.
          </div>
        )}
      </div>

      <div className="metric-glossary">
        <div style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:6, fontSize:13 }}>Understanding the metrics</div>
        <ul>
          <li><strong>ROC-AUC:</strong> How well the model separates higher-risk from lower-risk cases. Higher is better; 0.5 = chance, 1.0 = perfect.</li>
          <li><strong>Accuracy:</strong> Proportion of correctly classified test records.</li>
          <li><strong>F1-Score:</strong> Balance between identifying positive cases and avoiding false positives.</li>
        </ul>
        <div style={{ marginTop:8, fontStyle:'italic', fontSize:12, color:'var(--text-muted)' }}>
          These are held-out test-set metrics. They are not an individual patient's predicted risk.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WHAT-IF MODAL — 3-COLUMN LAYOUT
═══════════════════════════════════════════════════════════════════ */
function WhatIfModal({ open, onClose, patient, result, modelInfo }) {
  const [simPatient, setSimPatient] = useState(() => ({ ...patient }));
  const [window_,    setWindow]     = useState('3 months');
  const [simResult,  setSimResult]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (open) { setSimPatient({ ...patient }); setSimResult(null); setError(null); }
  }, [open, patient]);

  const changeSim = (k, v) => setSimPatient(p => ({ ...p, [k]: Number(v) }));

  const changedFactors = Object.keys(simPatient).filter(
    k => simPatient[k] !== patient[k] && k !== 'patient_id'
  );

  const runWhatIf = async () => {
    const changes = Object.fromEntries(
      Object.entries(simPatient).filter(([k, v]) => patient[k] !== v && k !== 'patient_id')
    );
    if (!Object.keys(changes).length) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(API + '/api/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline: patient, changes, improvement_window: window_ }),
      });
      if (!r.ok) throw new Error('API error');
      setSimResult(await r.json());
    } catch (e) { setError('Could not run simulation. Check that the backend is running.'); }
    finally { setLoading(false); }
  };

  const cholLabel = v => Number(v) === 1 ? 'Normal' : Number(v) === 2 ? 'Above Normal' : 'High';
  const glucLabel = v => Number(v) === 1 ? 'Normal' : Number(v) === 2 ? 'Above Normal' : 'High';

  const generateInsight = () => {
    if (!simResult) return '';
    const diff = simResult.change_pp;
    if (diff < -15) return 'A substantial reduction in estimated CVD risk is observed under the target conditions. The modifiable factor changes have a notable positive effect in this model estimate.';
    if (diff < -5)  return 'A meaningful reduction in estimated risk is observed. Continued improvement of these modifiable factors may yield further benefit.';
    if (diff < 0)   return 'A modest reduction in estimated risk is observed. Consider targeting additional modifiable factors for greater estimated impact.';
    if (diff > 5)   return 'The estimated risk increases under these target conditions. Consider choosing target values that reduce risk factors rather than increasing them.';
    if (diff > 0)   return 'The estimated risk is slightly higher under these target conditions. Review the selected factor values.';
    return 'Estimated risk remains similar under the selected target conditions. Consider adjusting more impactful modifiable factors.';
  };

  const currentForSlope = simResult?.current ?? result?.prediction;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="What-If Risk Simulator"
      subtitle="Explore changes to modifiable risk factors"
      width={1080}
      footer={
        <>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-apply"
            onClick={runWhatIf}
            disabled={!changedFactors.length || loading}
          >
            {loading ? 'Simulating...' : 'Apply Changes'}
          </button>
        </>
      }
    >
      <div className="whatif-3col">

        {/* ── LEFT: Current vs Target ── */}
        <div className="whatif-col">
          <div className="whatif-col-header">Current vs Target Risk</div>

          <div className="slope-section">
            <SlopeChart
              current={currentForSlope ?? { risk_score: 0, risk_category: 'Low' }}
              simulated={simResult?.simulated ?? null}
            />
          </div>

          {simResult && (
            <div style={{ display:'flex', gap:6 }}>
              <div className="sim-summary-item" style={{ flex:1 }}>
                <div className="ss-label">Current</div>
                <div className="ss-val" style={{ color: catColor(simResult.current_category), fontSize:12 }}>
                  {simResult.current_category}
                </div>
              </div>
              <div className="sim-summary-item" style={{ flex:1 }}>
                <div className="ss-label">Target</div>
                <div className="ss-val" style={{ color: catColor(simResult.simulated_category), fontSize:12 }}>
                  {simResult.simulated_category}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER: Modify Factors ── */}
        <div className="whatif-col">
          <div className="whatif-col-header">Modify Risk Factors</div>

          <div>
            <div className="section-label" style={{ marginBottom:5 }}>Improvement Window</div>
            <div className="window-row">
              {['3 months', '6 months', '12 months'].map(w => (
                <button key={w} className={`window-btn${window_ === w ? ' active' : ''}`}
                  onClick={() => setWindow(w)}>{w}</button>
              ))}
            </div>
          </div>

          <div className="section-divider" />

          <div className="sim-factor-grid">
            {/* Systolic BP */}
            <div className="sim-factor-cell">
              <label className="field-label">Systolic BP (mmHg)</label>
              <div className="sim-arrow">
                <span style={{ fontFamily:'var(--font-mono)', color:'#536B7A', fontSize:12, flexShrink:0 }}>{patient.ap_hi}</span>
                <span style={{ color:'#A8BDC7' }}>→</span>
                <input className="field-input" type="number" value={simPatient.ap_hi}
                  onChange={e => changeSim('ap_hi', e.target.value)} min={80} max={250}
                  style={{ flex:1, padding:'4px 6px', fontSize:12 }}/>
              </div>
            </div>

            {/* Diastolic BP */}
            <div className="sim-factor-cell">
              <label className="field-label">Diastolic BP (mmHg)</label>
              <div className="sim-arrow">
                <span style={{ fontFamily:'var(--font-mono)', color:'#536B7A', fontSize:12, flexShrink:0 }}>{patient.ap_lo}</span>
                <span style={{ color:'#A8BDC7' }}>→</span>
                <input className="field-input" type="number" value={simPatient.ap_lo}
                  onChange={e => changeSim('ap_lo', e.target.value)} min={40} max={150}
                  style={{ flex:1, padding:'4px 6px', fontSize:12 }}/>
              </div>
            </div>

            {/* Weight */}
            <div className="sim-factor-cell">
              <label className="field-label">Weight (kg)</label>
              <div className="sim-arrow">
                <span style={{ fontFamily:'var(--font-mono)', color:'#536B7A', fontSize:12, flexShrink:0 }}>{patient.weight}</span>
                <span style={{ color:'#A8BDC7' }}>→</span>
                <input className="field-input" type="number" value={simPatient.weight}
                  onChange={e => changeSim('weight', e.target.value)} min={35} max={220}
                  style={{ flex:1, padding:'4px 6px', fontSize:12 }}/>
              </div>
            </div>

            {/* Cholesterol */}
            <div className="sim-factor-cell">
              <label className="field-label">Cholesterol</label>
              <div className="sim-arrow">
                <span style={{ fontFamily:'var(--font-mono)', color:'#536B7A', fontSize:10, flexShrink:0 }}>{cholLabel(patient.cholesterol)}</span>
                <span style={{ color:'#A8BDC7' }}>→</span>
                <select className="field-select" value={simPatient.cholesterol}
                  onChange={e => changeSim('cholesterol', e.target.value)}
                  style={{ flex:1, padding:'4px 6px', fontSize:11 }}>
                  <option value="1">Normal</option>
                  <option value="2">Above Normal</option>
                  <option value="3">High</option>
                </select>
              </div>
            </div>

            {/* Smoking */}
            <div className="sim-factor-cell">
              <label className="field-label">Smoking</label>
              <div className="sim-arrow">
                <span style={{ fontFamily:'var(--font-mono)', color:'#536B7A', fontSize:11, flexShrink:0 }}>{patient.smoke ? 'Yes' : 'No'}</span>
                <span style={{ color:'#A8BDC7' }}>→</span>
                <select className="field-select" value={simPatient.smoke}
                  onChange={e => changeSim('smoke', e.target.value)}
                  style={{ flex:1, padding:'4px 6px', fontSize:11 }}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>

            {/* Alcohol */}
            <div className="sim-factor-cell">
              <label className="field-label">Alcohol</label>
              <div className="sim-arrow">
                <span style={{ fontFamily:'var(--font-mono)', color:'#536B7A', fontSize:11, flexShrink:0 }}>{patient.alco ? 'Yes' : 'No'}</span>
                <span style={{ color:'#A8BDC7' }}>→</span>
                <select className="field-select" value={simPatient.alco}
                  onChange={e => changeSim('alco', e.target.value)}
                  style={{ flex:1, padding:'4px 6px', fontSize:11 }}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>

            {/* Physical Activity */}
            <div className="sim-factor-cell">
              <label className="field-label">Physical Activity</label>
              <div className="sim-arrow">
                <span style={{ fontFamily:'var(--font-mono)', color:'#536B7A', fontSize:10, flexShrink:0 }}>{patient.active ? 'Active' : 'Inactive'}</span>
                <span style={{ color:'#A8BDC7' }}>→</span>
                <select className="field-select" value={simPatient.active}
                  onChange={e => changeSim('active', e.target.value)}
                  style={{ flex:1, padding:'4px 6px', fontSize:11 }}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ fontSize:10, color:'#7F9BAA' }}>
            Age and sex are non-modifiable and are kept at baseline values.
          </div>

          {changedFactors.length > 0 && (
            <div style={{ fontSize:11, color:C_BLUE, fontWeight:600 }}>
              {changedFactors.length} factor{changedFactors.length > 1 ? 's' : ''} modified — click Apply Changes to simulate.
            </div>
          )}
          {error && <div style={{ color:C_RED, fontSize:12 }}>{error}</div>}
        </div>

        {/* ── RIGHT: Expected Outcome ── */}
        <div className="whatif-col">
          <div className="whatif-col-header">Expected Outcome</div>

          {simResult ? (
            <>
              <div className="outcome-block">
                <div className="outcome-block-title">Simulated Risk</div>
                <div className="outcome-risk-val" style={{ color: catColor(simResult.simulated_category) }}>
                  {simResult.simulated_risk.toFixed(1)}%
                </div>
                <span className={`risk-cat-badge ${catCls(simResult.simulated_category)}`}
                  style={{ marginBottom:0, marginTop:4 }}>
                  {simResult.simulated_category} Risk
                </span>
              </div>

              <div className="outcome-block">
                <div className="outcome-block-title">Key Insight</div>
                <div className="outcome-key-insight">{generateInsight()}</div>
              </div>

              {simResult.factor_changes?.length > 0 && (
                <div>
                  <div className="section-label" style={{ marginBottom:4 }}>Changed Factors</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {simResult.factor_changes.map(fc => (
                      <div key={fc.field} style={{ fontSize:11, color:'#536B7A', display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ color:'#172B3A', fontWeight:600 }}>{fc.label}:</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:10 }}>{fc.from} → {fc.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="outcome-note">
                <strong>Important Note</strong><br/>
                Target risk is a model estimate based on modified input values. The selected improvement window ({simResult.improvement_window}) is illustrative and does not predict when or whether CVD risk will change.
              </div>
            </>
          ) : (
            <>
              <div className="context-block" style={{ textAlign:'center', padding:'24px 16px' }}>
                <div style={{ fontSize:12, color:'#7F9BAA' }}>
                  Modify risk factors and click<br/><strong>Apply Changes</strong><br/>to see the simulated outcome.
                </div>
              </div>
              <div style={{ marginTop:'auto' }}>
                <div className="outcome-note">
                  Aim to improve the selected modifiable risk factors within the chosen improvement window and reassess the estimated CVD risk.
                  <br/><br/>
                  The target risk is a model estimate based on modified input values. The improvement window is illustrative and does not predict when risk will change.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TELEMETRY MODAL
═══════════════════════════════════════════════════════════════════ */
function TelemetryModal({ open, onClose, telemetry, hrHistory }) {
  const bpHistRef = useRef([]);
  useEffect(() => {
    if (telemetry) {
      bpHistRef.current = [...bpHistRef.current.slice(-28), telemetry.systolic_bp];
    }
  }, [telemetry]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Simulated Live Telemetry"
      subtitle="Demonstration stream — not connected to any medical device or hospital system"
      width={540}
    >
      <div className="context-block" style={{ marginBottom:14, fontSize:11 }}>
        <strong>SIMULATED DATA</strong> — Values are randomly generated for UI demonstration purposes only.
        This is not real patient telemetry.
      </div>
      {telemetry ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div className="telem-metric">
              <div className="telem-metric-label">Heart Rate</div>
              <div className="telem-metric-val">{telemetry.heart_rate} <span className="telem-metric-unit">bpm</span></div>
              <div className="telem-sparkline-wrap">
                <PulseTrail hrHistory={hrHistory} color={C_GREEN} height={32} />
              </div>
            </div>
            <div className="telem-metric">
              <div className="telem-metric-label">Blood Pressure</div>
              <div className="telem-metric-val" style={{ fontSize:15 }}>
                {telemetry.systolic_bp}/{telemetry.diastolic_bp} <span className="telem-metric-unit">mmHg</span>
              </div>
              <div className="telem-sparkline-wrap">
                <PulseTrail hrHistory={bpHistRef.current} color={C_BLUE} height={32} />
              </div>
            </div>
          </div>
          <div style={{ fontSize:11, color:'#7F9BAA', marginTop:4, fontStyle:'italic', textAlign:'center' }}>
            Simulated stream · Updates every 3 s · Not hospital data
          </div>
        </>
      ) : (
        <div style={{ color:'#7F9BAA', fontSize:13, padding:'20px', textAlign:'center' }}>Awaiting stream connection...</div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TELEMETRY CARD (right column)
═══════════════════════════════════════════════════════════════════ */
function TelemetryCard({ telemetry, hrHistory, onClick }) {
  return (
    <div className="card telem-card">
      <div className="card-header" style={{ marginBottom:10, paddingBottom:8 }}>
        <div>
          <div className="card-title">Live Telemetry</div>
          <div className="card-sub">Simulated vital signs</div>
        </div>
        <div className="telem-status">
          <div className="telem-dot" />
          <span className="telem-sim-label">Simulated</span>
        </div>
      </div>

      {telemetry ? (
        <>
          <div className="telem-grid">
            <div className="telem-metric">
              <div className="telem-metric-label">Heart Rate</div>
              <div className="telem-metric-val">{telemetry.heart_rate} <span className="telem-metric-unit">bpm</span></div>
              <div className="telem-sparkline-wrap">
                <PulseTrail hrHistory={hrHistory.slice(-14)} color={C_GREEN} height={28} />
              </div>
            </div>
            <div className="telem-metric">
              <div className="telem-metric-label">Blood Pressure</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:'2px 0' }}>
                {telemetry.systolic_bp}/{telemetry.diastolic_bp}
              </div>
              <div className="telem-metric-unit">mmHg</div>
            </div>
          </div>
          <div className="telem-disclaimer">Simulated data only · Not real patient telemetry</div>
          <button className="btn-link" onClick={onClick} style={{ display:'block', textAlign:'center', marginTop:6 }}>
            View full telemetry →
          </button>
        </>
      ) : (
        <div style={{ color:'#7F9BAA', fontSize:12, padding:'6px 0' }}>Connecting to stream...</div>
      )}
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
  const [telemetry,    setTelemetry]    = useState(null);
  const [hrHistory,    setHrHistory]    = useState([]);
  const [who,          setWho]          = useState(null);
  const [modelInfo,    setModelInfo]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [assessedAt,   setAssessedAt]   = useState(null);
  const [assessedDate, setAssessedDate] = useState(null);

  // Modal state
  const [shapOpen,    setShapOpen]    = useState(false);
  const [whatIfOpen,  setWhatIfOpen]  = useState(false);
  const [telemOpen,   setTelemOpen]   = useState(false);
  const [modelOpen,   setModelOpen]   = useState(false);

  const wsRef = useRef(null);

  useEffect(() => {
    fetch(API + '/api/patients').then(r => r.json()).then(data => {
      if (data?.length) { setPatientsList(data); setPatient(data[0]); }
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
      const r = await fetch(API + '/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const data = await r.json();
      setResult(data);
      setAssessedAt(nowStr());
      setAssessedDate(nowDateStr());
      connectWS(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [connectWS]);

  // Auto-assess when patient ID changes
  useEffect(() => { if (patient) assess(patient); }, [patient.patient_id]);

  const changeBase = (k, v) => setPatient(p => ({ ...p, [k]: Number(v) }));

  const resetPatient = () => {
    const orig = patientsList.find(p => p.patient_id === patient.patient_id) ?? patientsList[0];
    if (orig) setPatient({ ...orig });
  };

  const bmiVal = patient.weight / (patient.height / 100) ** 2;

  return (
    <div className="app-shell">

      {/* ══ HEADER ══ */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">CardioRisk Analytics</div>
            <div className="brand-sub">Intelligent Clinical Decision Support System</div>
          </div>
        </div>

        <div className="header-right">
          <div className="header-status-group">
            <div className="header-stat">
              <div className="header-stat-label">System</div>
              <div className="header-stat-value online">
                <span className="sys-online-dot" />Online
              </div>
            </div>
            <div className="header-divider" />
            <div className="header-stat">
              <div className="header-stat-label">Status</div>
              <div className="header-stat-value">Research Prototype</div>
            </div>
            {assessedAt && (
              <>
                <div className="header-divider" />
                <div className="header-stat">
                  <div className="header-stat-label">Last Assessed</div>
                  <div className="header-stat-value">{assessedAt} · {assessedDate}</div>
                </div>
              </>
            )}
            <div className="header-divider" />
            <div className="patient-pill">
              <div className="patient-pill-icon">
                {(patient.patient_id ?? 'P').slice(-1).toUpperCase()}
              </div>
              <span className="patient-pill-id">{patient.patient_id}</span>
            </div>
          </div>
          <span className="proto-badge">Academic Prototype</span>
        </div>
      </header>

      {/* ══ MAIN 3-COLUMN GRID ══ */}
      <div className="main-grid">

        {/* ── LEFT: Patient Profile ── */}
        <div className="left-col">
          <div className="card" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Patient Profile</div>
                <div className="card-sub">Demographic and clinical information</div>
              </div>
              <span className="card-tag">{patient.patient_id}</span>
            </div>

            <select className="patient-select" value={patient.patient_id}
              onChange={e => {
                const s = patientsList.find(p => p.patient_id === e.target.value);
                if (s) setPatient(s);
              }}>
              {patientsList.map(p => (
                <option key={p.patient_id} value={p.patient_id}>Patient {p.patient_id}</option>
              ))}
            </select>

            {/* Demographic chips */}
            <div className="meta-row">
              <div className="meta-chip">
                <div className="mc-label">Age</div>
                <div className="mc-value">{patient.age_years.toFixed(0)}</div>
                <div className="mc-sub">years</div>
              </div>
              <div className="meta-chip">
                <div className="mc-label">Sex</div>
                <div className="mc-value">{patient.gender === 1 ? 'F' : 'M'}</div>
                <div className="mc-sub">{patient.gender === 1 ? 'Female' : 'Male'}</div>
              </div>
              <div className="meta-chip">
                <div className="mc-label">BMI</div>
                <div className="mc-value">{bmiVal.toFixed(1)}</div>
                <div className="mc-sub">{bmiVal < 18.5 ? 'Under' : bmiVal < 25 ? 'Normal' : bmiVal < 30 ? 'Over' : 'Obese'}</div>
              </div>
            </div>

            {/* Clinical Parameters */}
            <div className="section-label">Clinical Parameters</div>

            <div className="form-pair">
              <div className="field-wrap">
                <label className="field-label" htmlFor="inp-weight">Weight (kg)</label>
                <input id="inp-weight" className="field-input" type="number" value={patient.weight}
                  onChange={e => changeBase('weight', e.target.value)}/>
              </div>
              <div className="field-wrap">
                <label className="field-label" htmlFor="inp-height">Height (cm)</label>
                <input id="inp-height" className="field-input" type="number" value={patient.height}
                  onChange={e => changeBase('height', e.target.value)}/>
              </div>
            </div>
            <div className="form-pair">
              <div className="field-wrap">
                <label className="field-label" htmlFor="inp-aphi">Systolic BP (mmHg)</label>
                <input id="inp-aphi" className="field-input" type="number" value={patient.ap_hi}
                  onChange={e => changeBase('ap_hi', e.target.value)}/>
              </div>
              <div className="field-wrap">
                <label className="field-label" htmlFor="inp-aplo">Diastolic BP (mmHg)</label>
                <input id="inp-aplo" className="field-input" type="number" value={patient.ap_lo}
                  onChange={e => changeBase('ap_lo', e.target.value)}/>
              </div>
            </div>
            <div className="form-pair">
              <div className="field-wrap">
                <label className="field-label" htmlFor="sel-chol">Cholesterol</label>
                <select id="sel-chol" className="field-select" value={patient.cholesterol}
                  onChange={e => changeBase('cholesterol', e.target.value)}>
                  <option value="1">1 — Normal</option>
                  <option value="2">2 — Above Normal</option>
                  <option value="3">3 — High</option>
                </select>
              </div>
              <div className="field-wrap">
                <label className="field-label" htmlFor="sel-gluc">Glucose</label>
                <select id="sel-gluc" className="field-select" value={patient.gluc}
                  onChange={e => changeBase('gluc', e.target.value)}>
                  <option value="1">1 — Normal</option>
                  <option value="2">2 — Above Normal</option>
                  <option value="3">3 — High</option>
                </select>
              </div>
            </div>

            {/* Lifestyle Factors */}
            <div className="section-label" style={{ marginTop:2 }}>Lifestyle Factors</div>

            {/* Smoking */}
            <div
              className={`lifestyle-row${patient.smoke ? ' active-red' : ''}`}
              onClick={() => changeBase('smoke', patient.smoke ? 0 : 1)}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && changeBase('smoke', patient.smoke ? 0 : 1)}
              aria-pressed={!!patient.smoke}
            >
              <div className="lifestyle-row-left">
                <div className="lifestyle-icon">
                  <svg viewBox="0 0 24 24" fill="none"
                    stroke={patient.smoke ? C_RED : '#A8BDC7'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 12h2a2 2 0 0 1 0 4h-2v-4z"/>
                    <path d="M2 12h16v4H2z"/>
                    <path d="M22 12v4"/>
                  </svg>
                </div>
                <span className="lifestyle-name" style={{ color: patient.smoke ? C_RED : undefined }}>Smoking</span>
              </div>
              <span className="lifestyle-val" style={{ color: patient.smoke ? C_RED : C_GREEN }}>
                {patient.smoke ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Alcohol */}
            <div
              className={`lifestyle-row${patient.alco ? ' active-amber' : ''}`}
              onClick={() => changeBase('alco', patient.alco ? 0 : 1)}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && changeBase('alco', patient.alco ? 0 : 1)}
              aria-pressed={!!patient.alco}
            >
              <div className="lifestyle-row-left">
                <div className="lifestyle-icon">
                  <svg viewBox="0 0 24 24" fill="none"
                    stroke={patient.alco ? C_AMBER : '#A8BDC7'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 22h8M12 11v11"/>
                    <path d="M5.45 4.11 4 16h16L18.55 4.11"/>
                    <line x1="4" y1="4" x2="20" y2="4"/>
                  </svg>
                </div>
                <span className="lifestyle-name" style={{ color: patient.alco ? C_AMBER : undefined }}>Alcohol Use</span>
              </div>
              <span className="lifestyle-val" style={{ color: patient.alco ? C_AMBER : C_GREEN }}>
                {patient.alco ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Physical Activity */}
            <div
              className={`lifestyle-row${patient.active ? ' active-green' : ''}`}
              onClick={() => changeBase('active', patient.active ? 0 : 1)}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && changeBase('active', patient.active ? 0 : 1)}
              aria-pressed={!!patient.active}
            >
              <div className="lifestyle-row-left">
                <div className="lifestyle-icon">
                  <svg viewBox="0 0 24 24" fill="none"
                    stroke={patient.active ? C_GREEN : '#A8BDC7'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <span className="lifestyle-name" style={{ color: patient.active ? C_GREEN : undefined }}>Physical Activity</span>
              </div>
              <span className="lifestyle-val" style={{ color: patient.active ? C_GREEN : C_AMBER }}>
                {patient.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <button className="btn-assess" id="btn-run-assessment"
              onClick={() => assess(patient)} disabled={loading}>
              {loading ? 'Processing Assessment...' : 'Run Assessment'}
            </button>
            <button className="btn-reset" onClick={resetPatient}>Reset</button>
          </div>
        </div>

        {/* ── CENTER: Risk Card + SHAP ── */}
        <div className="center-col">

          {/* Risk Score Card */}
          <div className="card risk-card">
            <div className="card-header" style={{ marginBottom:14 }}>
              <div>
                <div className="card-title">Estimated Cardiovascular Risk</div>
                <div className="card-sub">Model-based risk estimate for cardiovascular disease</div>
              </div>
            </div>

            {result ? (
              <div className="risk-layout">
                <div className="risk-left">
                  <div className="risk-score-big" style={{ color: catColor(result.prediction.risk_category) }}>
                    {result.prediction.risk_score.toFixed(1)}<span style={{ fontSize:24, fontWeight:400 }}>%</span>
                  </div>
                  <div className={`risk-cat-badge ${catCls(result.prediction.risk_category)}`}>
                    {result.prediction.risk_category} Risk
                  </div>

                  <div className="model-info-block">
                    <span className="model-label-sm">Model Used</span>
                    <span className="model-chip">{result.prediction.model_used}</span>
                    <span className="selected-badge">Selected Model</span>
                    {result.prediction.model_note && (
                      <span title={result.prediction.model_note} style={{ cursor:'help', fontSize:11, color:'#7F9BAA' }}>ⓘ</span>
                    )}
                  </div>
                  <div className="model-note-text">
                    Selected based on best ROC-AUC performance on test data.
                  </div>

                  {/* Action buttons */}
                  <div className="action-btns">
                    <button id="btn-explanation" className="btn-action" onClick={() => setShapOpen(true)}>
                      <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                      Explanation
                    </button>
                    <button id="btn-whatif" className="btn-action primary" onClick={() => setWhatIfOpen(true)}>
                      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                      What-If Simulator
                    </button>
                    <button id="btn-telemetry" className="btn-action" onClick={() => setTelemOpen(true)}>
                      <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      Live Telemetry
                    </button>
                    <button id="btn-model-details" className="btn-action" onClick={() => setModelOpen(true)}>
                      <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>
                      Model Details
                    </button>
                  </div>
                </div>
                <div className="risk-right">
                  <RiskGauge prediction={result.prediction} />
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:120, color:'#7F9BAA', fontSize:14 }}>
                {loading ? 'Loading assessment...' : 'Run an assessment to view results.'}
              </div>
            )}
          </div>

          {/* Risk Drivers (SHAP) — inline dashboard */}
          {result?.explanation && (
            <div className="card">
              <div className="card-header" style={{ marginBottom:10, paddingBottom:8 }}>
                <div>
                  <div className="card-title">Why Is the Risk Elevated?</div>
                  <div className="card-sub">Top model-derived factors contributing to this estimate (SHAP values)</div>
                </div>
              </div>
              <ShapDivergingChart data={result.explanation} />
            </div>
          )}

          {/* Disclaimer */}
          <div className="disclaimer-bar">
            Academic/research prototype only. This system provides model-based cardiovascular risk estimates and is not a diagnostic tool or a substitute for professional medical advice.
          </div>
        </div>

        {/* ── RIGHT: Health Indicators + Benchmark + Telemetry ── */}
        <div className="right-col">

          {/* Health Indicators */}
          <div className="card" style={{ flex:'0 0 auto' }}>
            <div className="card-header" style={{ marginBottom:10, paddingBottom:8 }}>
              <div>
                <div className="card-title">Health Indicators</div>
                <div className="card-sub">Current patient measurements vs normal ranges</div>
              </div>
            </div>
            <HealthIndicatorTable indicators={result?.indicators} patient={patient} />
          </div>

          {/* Population Benchmark */}
          <div className="card" style={{ flex:'0 0 auto' }}>
            <div className="card-header" style={{ marginBottom:6, paddingBottom:8 }}>
              <div>
                <div className="card-title">Patient vs Population Benchmark</div>
                <div className="card-sub">Comparison with general population (WHO GHO)</div>
              </div>
            </div>
            <div className="benchmark-unavail">
              <div className="benchmark-unavail-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <div className="benchmark-unavail-title">Population Benchmark Unavailable</div>
              <div className="benchmark-unavail-sub">WHO GHO integration is not active in this MVP.</div>
            </div>
          </div>

          {/* Telemetry Card */}
          <TelemetryCard
            telemetry={telemetry}
            hrHistory={hrHistory}
            onClick={() => setTelemOpen(true)}
          />
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="app-footer">
        <span className="footer-brand">CardioRisk Analytics · Research Prototype</span>
        <div className="footer-right">
          <div className="footer-stat">
            <span className="footer-stat-label">System:</span>
            <span className="footer-stat-value" style={{ color: C_GREEN }}>Online</span>
          </div>
          {assessedAt && (
            <div className="footer-stat">
              <span className="footer-stat-label">Last Assessment:</span>
              <span className="footer-stat-value">{assessedAt}</span>
            </div>
          )}
          <div className="footer-stat">
            <span className="footer-stat-label">Patient:</span>
            <span className="footer-stat-value">{patient.patient_id}</span>
          </div>
        </div>
      </footer>

      {/* ══ MODALS ══ */}

      {/* SHAP / Explanation Modal */}
      <Modal
        open={shapOpen}
        onClose={() => setShapOpen(false)}
        title="Model Explanation"
        subtitle="SHAP feature contribution analysis — model influence, not clinical causation"
        width={780}
      >
        <ShapDivergingChart data={result?.explanation} />
      </Modal>

      {/* What-If Modal */}
      <WhatIfModal
        open={whatIfOpen}
        onClose={() => setWhatIfOpen(false)}
        patient={patient}
        result={result}
        modelInfo={modelInfo}
      />

      {/* Telemetry Modal */}
      <TelemetryModal
        open={telemOpen}
        onClose={() => setTelemOpen(false)}
        telemetry={telemetry}
        hrHistory={hrHistory}
      />

      {/* Model Details Modal */}
      <Modal
        open={modelOpen}
        onClose={() => setModelOpen(false)}
        title="Model Performance Details"
        subtitle="Evaluation metrics from the held-out test set — not an individual prediction"
        width={680}
      >
        <ModelEvalPanel modelInfo={modelInfo} activeModel={result?.prediction?.model_used} />
      </Modal>

    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
