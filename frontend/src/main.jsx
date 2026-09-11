import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

/* ─── API & CONFIGURATION ────────────────────────────────────────── */
const API = 'http://localhost:8000';

const DEFAULT_PATIENT = {
  patient_id: 'P-1001',
  age_years: 50,
  gender: 2, // 2: Male, 1: Female
  height: 168,
  weight: 62,
  ap_hi: 110,
  ap_lo: 80,
  cholesterol: 1,
  gluc: 1,
  smoke: 0,
  alco: 0,
  active: 1
};

const C_GREEN = '#10B981';
const C_AMBER = '#F59E0B';
const C_RED   = '#EF4444';
const C_BLUE  = '#2563EB';

const catColor = c => ({ High: C_RED, Moderate: C_AMBER, Low: C_GREEN }[c] ?? C_GREEN);
const catCls   = c => ({ High: 'high', Moderate: 'moderate', Low: 'low' }[c] ?? 'low');

function clamp(v, lo, hi) {
  if (v == null || isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function calculateBMI(weight, height) {
  if (!weight || !height) return 22.0;
  const hM = height / 100;
  return weight / (hM * hM);
}

/* ═══════════════════════════════════════════════════════════════════
   SVG CLINICAL ICONS
═══════════════════════════════════════════════════════════════════ */
const Icons = {
  heartPulse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      <path d="M3.5 12h3l2-4 3 8 2-5 1.5 2 2.5-1"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  male: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="13.6" y2="10.4"/><polyline points="15 5 19 5 19 9"/>
    </svg>
  ),
  scale: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 7l4 8h10l4-8M6 15h12"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  run: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  barChart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  broadcast: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.93 4.93a10 10 0 0 1 14.14 0"/><path d="M7.76 7.76a6 6 0 0 1 8.48 0"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M12 14v7M9 18l3 3 3-3"/>
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  pulseWave: (
    <svg viewBox="0 0 60 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,10 16,10 22,2 28,18 34,7 39,12 44,10 58,10"/>
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  droplet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  )
};

/* ═══════════════════════════════════════════════════════════════════
   CLINICAL MODAL COMPONENT (WITH FLUID POPUP TRANSITIONS)
═══════════════════════════════════════════════════════════════════ */
function ClinicalModal({ open, onClose, title, subtitle, width = 760, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="clinical-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="clinical-modal-card" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div className="clinical-modal-header">
          <div>
            <div className="clinical-modal-title">{title}</div>
            {subtitle && <div className="clinical-modal-subtitle">{subtitle}</div>}
          </div>
          <button className="btn-modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="clinical-modal-body">{children}</div>
        {footer && <div className="clinical-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROBUST ENGINEERED SEMICIRCULAR GAUGE
   Clean SVG rotation, proportional font size, unblocked needle movement
═══════════════════════════════════════════════════════════════════ */
function AuthenticSemicircularGauge({ prediction }) {
  const CX = 120, CY = 88, R = 72, SW = 14;

  const score = (prediction && !isNaN(prediction.risk_score))
    ? clamp(prediction.risk_score, 0, 100)
    : 82.8;
  const cat = prediction?.risk_category ?? (score >= 65 ? 'High' : score >= 35 ? 'Moderate' : 'Low');

  // Rotation: 0% -> -90 deg (left); 50% -> 0 deg (top); 100% -> +90 deg (right)
  const rotDeg = -90 + (score / 100) * 180;

  // Arc path from (CX - R, CY) through top to (CX + R, CY)
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <div className="semicircular-gauge-container">
      <svg viewBox="0 0 240 148" className="gauge-svg-frame">
        <defs>
          <linearGradient id="clinicalGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="78%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>

        {/* Outer Background Track */}
        <path
          d={arcPath}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={SW}
          strokeLinecap="round"
        />

        {/* Gradient Spectrum Track */}
        <path
          d={arcPath}
          fill="none"
          stroke="url(#clinicalGaugeGrad)"
          strokeWidth={SW}
          strokeLinecap="round"
        />

        {/* Scale tick labels */}
        <text x={CX - R - 6} y={CY + 4} fontSize="9" fill="#64748B" fontWeight="600" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">0%</text>
        <text x={CX} y={CY - R - 6} fontSize="9" fill="#64748B" fontWeight="600" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">50%</text>
        <text x={CX + R + 6} y={CY + 4} fontSize="9" fill="#64748B" fontWeight="600" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">100%</text>

        {/* Rotating Needle */}
        <g
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${rotDeg}deg)`,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {/* Tapered Pointer */}
          <polygon
            points={`${CX - 4},${CY} ${CX},${CY - R + 8} ${CX + 4},${CY}`}
            fill="#DC2626"
            stroke="#991B1B"
            strokeWidth="0.5"
          />
          {/* Counter-weight tail */}
          <polygon
            points={`${CX - 3},${CY} ${CX},${CY + 10} ${CX + 3},${CY}`}
            fill="#B91C1C"
          />
        </g>

        {/* Center Pivot Hub */}
        <circle cx={CX} cy={CY} r="6.5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="2.5" />
        <circle cx={CX} cy={CY} r="2.5" fill="#DC2626" />

        {/* Perfectly Positioned Center Readout */}
        <text
          x={CX}
          y={CY + 26}
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="#0F172A"
          fontFamily="'Outfit', sans-serif"
          letterSpacing="-0.02em"
        >
          {score.toFixed(1)}%
        </text>

        {/* Category Pill Badge */}
        <g transform={`translate(${CX - 40}, ${CY + 34})`}>
          <rect
            width="80"
            height="18"
            rx="9"
            fill={catColor(cat)}
          />
          <text
            x="40"
            y="12.5"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="800"
            fontFamily="'Outfit', sans-serif"
            letterSpacing="0.06em"
          >
            {cat.toUpperCase()} RISK
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHAP DIVERGING CHART
═══════════════════════════════════════════════════════════════════ */
function ShapDivergingChart({ explanation }) {
  if (!explanation) {
    const defaultRows = [
      { label: 'Systolic BP', value: '+1.400', isRisk: true, pct: 92 },
      { label: 'Cholesterol', value: '+0.133', isRisk: true, pct: 28 },
      { label: 'Age', value: '-0.051', isRisk: false, pct: 15 },
      { label: 'Glucose', value: '+0.050', isRisk: true, pct: 14 },
      { label: 'Diastolic BP', value: '+0.049', isRisk: true, pct: 14 }
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="shap-legend-row">
          <span className="shap-legend-lower">← Lower risk</span>
          <span className="shap-legend-higher">Increases risk →</span>
        </div>
        <div className="shap-bars-container">
          {defaultRows.map(r => (
            <div key={r.label} className="shap-bar-row">
              <span className="shap-bar-label">{r.label}</span>
              <div className="shap-bar-left-track">
                {!r.isRisk && <div className="shap-bar-fill-green" style={{ width: `${r.pct}%` }} />}
              </div>
              <div className="shap-center-axis-line" />
              <div className="shap-bar-right-track">
                {r.isRisk && <div className="shap-bar-fill-red" style={{ width: `${r.pct}%` }} />}
              </div>
              <span className={`shap-bar-score ${r.isRisk ? 'red' : 'green'}`}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className="clinical-footnote">
          Bars show model contribution to this patient's estimated risk. They indicate model influence, not clinical causation.
        </div>
      </div>
    );
  }

  const all = [...(explanation.modifiable || []), ...(explanation.non_modifiable || [])];
  all.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const topFactors = all.slice(0, 5);
  const maxAbs = Math.max(...topFactors.map(f => Math.abs(f.contribution)), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="shap-legend-row">
        <span className="shap-legend-lower">← Lower risk</span>
        <span className="shap-legend-higher">Increases risk →</span>
      </div>
      <div className="shap-bars-container">
        {topFactors.map(f => {
          const isRisk = f.contribution > 0;
          const pct = Math.min(100, Math.round((Math.abs(f.contribution) / maxAbs) * 100));
          const valStr = `${isRisk ? '+' : ''}${f.contribution.toFixed(3)}`;
          return (
            <div key={f.feature} className="shap-bar-row">
              <span className="shap-bar-label">{f.label}</span>
              <div className="shap-bar-left-track">
                {!isRisk && <div className="shap-bar-fill-green" style={{ width: `${pct}%` }} />}
              </div>
              <div className="shap-center-axis-line" />
              <div className="shap-bar-right-track">
                {isRisk && <div className="shap-bar-fill-red" style={{ width: `${pct}%` }} />}
              </div>
              <span className={`shap-bar-score ${isRisk ? 'red' : 'green'}`}>{valStr}</span>
            </div>
          );
        })}
      </div>
      <div className="clinical-footnote">
        Bars show model contribution to this patient's estimated risk. They indicate model influence, not clinical causation.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PATIENT VS POPULATION BENCHMARK (WHO GHO DUMBBELL PLOT)
═══════════════════════════════════════════════════════════════════ */
function PopulationBenchmarkChart({ patient }) {
  const pSystolic = clamp(patient.ap_hi, 90, 180);
  const whoSystolic = 128;
  const sysPPos = ((pSystolic - 90) / (180 - 90)) * 100;
  const sysWPos = ((whoSystolic - 90) / (180 - 90)) * 100;

  const currentBMI = clamp(calculateBMI(patient.weight, patient.height), 16, 40);
  const whoBMI = 24.5;
  const bmiPPos = ((currentBMI - 16) / (40 - 16)) * 100;
  const bmiWPos = ((whoBMI - 16) / (40 - 16)) * 100;

  const cholPPos = patient.cholesterol === 3 ? 90 : patient.cholesterol === 2 ? 62 : 28;
  const cholWPos = 28;

  const glucPPos = patient.gluc === 3 ? 90 : patient.gluc === 2 ? 60 : 28;
  const glucWPos = 28;

  const rows = [
    { label: 'Systolic BP', pVal: patient.ap_hi, wVal: 128, pPos: sysPPos, wPos: sysWPos },
    { label: 'BMI', pVal: currentBMI.toFixed(1), wVal: 24.5, pPos: bmiPPos, wPos: bmiWPos },
    { label: 'Cholesterol', pVal: patient.cholesterol === 1 ? 'Normal' : patient.cholesterol === 2 ? 'Above' : 'High', wVal: 'Normal', pPos: cholPPos, wPos: cholWPos },
    { label: 'Glucose', pVal: patient.gluc === 1 ? 'Normal' : patient.gluc === 2 ? 'Above' : 'High', wVal: 'Normal', pPos: glucPPos, wPos: glucWPos }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="benchmark-legend-row">
        <div className="benchmark-legend-item">
          <div className="benchmark-dot-patient" />
          <span>Patient</span>
        </div>
        <div className="benchmark-legend-item">
          <div className="benchmark-dot-who" />
          <span>Population Benchmark (WHO)</span>
        </div>
      </div>

      <div className="benchmark-dumbbells-container">
        {rows.map(r => {
          const left = Math.min(r.pPos, r.wPos);
          const width = Math.abs(r.pPos - r.wPos);
          return (
            <div key={r.label} className="benchmark-row">
              <span className="benchmark-param-label">{r.label}</span>
              <div className="benchmark-track-area">
                <div className="benchmark-track-bg-line" />
                {width > 2 && (
                  <div className="benchmark-span-bar" style={{ left: `${left}%`, width: `${width}%` }} />
                )}
                <div className="benchmark-pin who" style={{ left: `${r.wPos}%` }} title={`WHO: ${r.wVal}`} />
                <span className="benchmark-pin-label" style={{ left: `${r.wPos}%` }}>{r.wVal}</span>
                <div className="benchmark-pin patient" style={{ left: `${r.pPos}%` }} title={`Patient: ${r.pVal}`} />
                <span className="benchmark-pin-label" style={{ left: `${r.pPos}%`, color: '#2563EB' }}>{r.pVal}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="benchmark-scale-axis">
        <span>Lower</span>
        <span>Higher</span>
      </div>

      <div className="clinical-footnote">
        WHO GHO benchmark integration is not active in this MVP.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HEALTH INDICATORS TABLE
═══════════════════════════════════════════════════════════════════ */
function HealthIndicatorsTable({ patient }) {
  const currentBMI = calculateBMI(patient.weight, patient.height);

  const rows = [
    {
      name: 'Blood Pressure',
      val: `${patient.ap_hi} / ${patient.ap_lo}`,
      status: patient.ap_hi >= 140 || patient.ap_lo >= 90 ? 'Elevated' : patient.ap_hi >= 125 ? 'Watch' : 'Normal',
      cls: patient.ap_hi >= 140 || patient.ap_lo >= 90 ? 'elevated' : patient.ap_hi >= 125 ? 'watch' : 'normal',
      pinPct: clamp(((patient.ap_hi - 90) / (180 - 90)) * 100, 10, 92)
    },
    {
      name: 'BMI',
      val: currentBMI.toFixed(1),
      status: currentBMI >= 30 ? 'Elevated' : currentBMI >= 25 ? 'Watch' : 'Normal',
      cls: currentBMI >= 30 ? 'elevated' : currentBMI >= 25 ? 'watch' : 'normal',
      pinPct: clamp(((currentBMI - 18) / (36 - 18)) * 100, 12, 90)
    },
    {
      name: 'Cholesterol',
      val: patient.cholesterol === 1 ? 'Normal' : patient.cholesterol === 2 ? 'Above normal' : 'High',
      status: patient.cholesterol === 1 ? 'Normal' : 'Elevated',
      cls: patient.cholesterol === 1 ? 'normal' : 'elevated',
      pinPct: patient.cholesterol === 1 ? 24 : patient.cholesterol === 2 ? 72 : 92
    },
    {
      name: 'Glucose',
      val: patient.gluc === 1 ? 'Normal' : patient.gluc === 2 ? 'Above normal' : 'High',
      status: patient.gluc === 1 ? 'Normal' : 'Elevated',
      cls: patient.gluc === 1 ? 'normal' : 'elevated',
      pinPct: patient.gluc === 1 ? 24 : patient.gluc === 2 ? 70 : 90
    },
    {
      name: 'Smoking',
      val: patient.smoke === 1 ? 'Yes' : 'No',
      status: patient.smoke === 1 ? 'Elevated' : 'Normal',
      cls: patient.smoke === 1 ? 'elevated' : 'normal',
      pinPct: patient.smoke === 1 ? 88 : 18
    },
    {
      name: 'Alcohol',
      val: patient.alco === 1 ? 'Yes' : 'No',
      status: patient.alco === 1 ? 'Watch' : 'Normal',
      cls: patient.alco === 1 ? 'watch' : 'normal',
      pinPct: patient.alco === 1 ? 75 : 18
    },
    {
      name: 'Physical Activity',
      val: patient.active === 1 ? 'Active' : 'Inactive',
      status: patient.active === 1 ? 'Normal' : 'Watch',
      cls: patient.active === 1 ? 'normal' : 'watch',
      pinPct: patient.active === 1 ? 22 : 78
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="indicators-table-header">
        <div>Parameter</div>
        <div>Value</div>
        <div>Status</div>
        <div style={{ paddingLeft: 8 }}>Range (visual)</div>
      </div>
      <div className="indicators-table-scroll">
        {rows.map(r => (
          <div key={r.name} className="indicator-table-row">
            <div className="indicator-name" title={r.name}>{r.name}</div>
            <div className="indicator-val">{r.val}</div>
            <div className={`indicator-status-badge ${r.cls}`}>
              <span style={{ fontSize: 10 }}>•</span> {r.status}
            </div>
            <div className="range-track-box">
              <div className={`range-track-marker-pin ${r.cls}`} style={{ left: `${r.pinPct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LIVE CLINICAL TELEMETRY MONITOR
═══════════════════════════════════════════════════════════════════ */
function TelemetryMonitorPanel({ telemetry }) {
  const hr = telemetry?.heart_rate ?? 72;
  const bpSys = telemetry?.systolic_bp ?? 132;
  const bpDia = telemetry?.diastolic_bp ?? 89;

  const ecgPoints = [
    [0, 10], [15, 10], [20, 4], [25, 18], [30, 1], [35, 12], [40, 10],
    [55, 10], [60, 4], [65, 18], [70, 1], [75, 12], [80, 10],
    [95, 10], [100, 4], [105, 18], [110, 1], [115, 12], [120, 10],
    [135, 10], [140, 4], [145, 18], [150, 1], [155, 12], [160, 10]
  ].map(([x, y]) => `${x},${y}`).join(' ');

  const bpPoints = [
    [0, 12], [15, 4], [25, 9], [40, 12],
    [55, 4], [65, 9], [80, 12],
    [95, 4], [105, 9], [120, 12],
    [135, 4], [145, 9], [160, 12]
  ].map(([x, y]) => `${x},${y}`).join(' ');

  const o2Points = [
    [0, 14], [18, 5], [32, 14],
    [50, 5], [64, 14],
    [82, 5], [96, 14],
    [114, 5], [128, 14],
    [146, 5], [160, 14]
  ].map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-header-row" style={{ padding: '0 0 4px' }}>
        <div className="card-header-titles">
          <div className="card-main-title" style={{ fontSize: 12.5 }}>
            {Icons.pulseWave} Simulated Live Telemetry
          </div>
          <div className="card-sub-title">Real-time vital signs (simulated data)</div>
        </div>
        <div className="telemetry-active-pill">
          <div className="status-led-pulse" />
          <span>Simulation Active</span>
        </div>
      </div>

      <div className="telemetry-vitals-stack">
        <div className="vital-stream-row">
          <div className="vital-icon-box vital-icon-hr">
            {Icons.heartPulse}
          </div>
          <div className="vital-text-meta">
            <span className="vital-name-label">Heart Rate</span>
            <span className="vital-val-num" style={{ color: '#E11D48' }}>{hr} <span style={{ fontSize: 10, fontWeight: 500 }}>bpm</span></span>
          </div>
          <div className="vital-wave-canvas-wrap">
            <svg viewBox="0 0 160 20" style={{ width: '100%', height: 20 }}>
              <polyline points={ecgPoints} fill="none" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="vital-stream-row">
          <div className="vital-icon-box vital-icon-bp">
            {Icons.monitor}
          </div>
          <div className="vital-text-meta">
            <span className="vital-name-label">Blood Pressure</span>
            <span className="vital-val-num" style={{ color: '#2563EB', fontSize: 12 }}>{bpSys} / {bpDia} <span style={{ fontSize: 9, fontWeight: 500 }}>mmHg</span></span>
          </div>
          <div className="vital-wave-canvas-wrap">
            <svg viewBox="0 0 160 20" style={{ width: '100%', height: 20 }}>
              <polyline points={bpPoints} fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="vital-stream-row">
          <div className="vital-icon-box vital-icon-o2">
            {Icons.droplet}
          </div>
          <div className="vital-text-meta">
            <span className="vital-name-label">Oxygen Saturation</span>
            <span className="vital-val-num" style={{ color: '#0284C7' }}>98 <span style={{ fontSize: 10, fontWeight: 500 }}>%</span></span>
          </div>
          <div className="vital-wave-canvas-wrap">
            <svg viewBox="0 0 160 20" style={{ width: '100%', height: 20 }}>
              <polyline points={o2Points} fill="none" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="clinical-footnote" style={{ marginTop: 4 }}>
        Simulated data for demonstration purposes only.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WHAT-IF SIMULATOR OVERHAUL
   Large Hero Slope Chart + Modern Interactive Clinical Sliders
═══════════════════════════════════════════════════════════════════ */
function WhatIfModal({ open, onClose, patient, baseResult }) {
  const [simPatient, setSimPatient] = useState({ ...patient });
  const [window_, setWindow] = useState('3 months');
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setSimPatient({ ...patient });
      setSimResult(null);
      setError(null);
    }
  }, [open, patient]);

  const updateSim = (field, val) => {
    setSimPatient(prev => ({ ...prev, [field]: Number(val) }));
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const changes = {};
      ['weight', 'height', 'ap_hi', 'ap_lo', 'cholesterol', 'gluc', 'smoke', 'alco', 'active'].forEach(f => {
        if (Number(simPatient[f]) !== Number(patient[f])) {
          changes[f] = Number(simPatient[f]);
        }
      });

      const res = await fetch(`${API}/api/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseline: patient,
          changes,
          improvement_window: window_
        })
      });

      if (!res.ok) throw new Error(`Simulator returned HTTP ${res.status}`);
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      setError(err.message || 'Simulation error');
    } finally {
      setLoading(false);
    }
  };

  const currentScore = baseResult?.prediction?.risk_score ?? 82.8;
  const currentCat = baseResult?.prediction?.risk_category ?? 'High';
  const targetScore = simResult?.simulated_risk ?? 58.2;
  const targetCat = simResult?.simulated_category ?? 'Moderate';
  const diffPP = targetScore - currentScore;

  // Scale score to SVG coordinates (0% at y=150, 100% at y=25)
  const currentY = 150 - (currentScore / 100) * 125;
  const targetY = 150 - (targetScore / 100) * 125;

  return (
    <ClinicalModal
      open={open}
      onClose={onClose}
      title={<>{Icons.barChart} What-If Risk Simulator</>}
      subtitle="Explore how targeted lifestyle and therapeutic modifications impact estimated CVD risk"
      width={960}
      footer={
        <>
          <button className="btn-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-modal-apply" onClick={runSimulation} disabled={loading}>
            {loading ? 'Simulating Clinical Outcome...' : 'Apply Changes'}
          </button>
        </>
      }
    >
      <div className="whatif-modal-3col">
        {/* ── COL 1: HERO SLOPE CHART ── */}
        <div className="whatif-col-card">
          <div className="whatif-col-title">
            {Icons.heartPulse} Current vs Target Risk
          </div>

          <div className="slope-chart-hero-frame">
            <svg viewBox="0 0 260 180" style={{ width: '100%', height: 180, overflow: 'visible' }}>
              <defs>
                <linearGradient id="slopeLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
                <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10B981" floodOpacity="0.4" />
                </filter>
                <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#EF4444" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Gridlines */}
              {[100, 75, 50, 25, 0].map(pct => {
                const y = 150 - (pct / 100) * 125;
                return (
                  <g key={pct}>
                    <line x1="36" y1={y} x2="245" y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="28" y={y + 3.5} fontSize="9" fill="#94A3B8" textAnchor="end" fontFamily="'JetBrains Mono',monospace">{pct}%</text>
                  </g>
                );
              })}

              {/* Trajectory Slope Line */}
              <line
                x1="80"
                y1={currentY}
                x2="200"
                y2={targetY}
                stroke="url(#slopeLineGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Current Anchor Node (Red) */}
              <circle cx="80" cy={currentY} r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2.5" filter="url(#glowRed)" />
              <text x="80" y={currentY - 12} fontSize="12" fontWeight="800" fill="#EF4444" textAnchor="middle" fontFamily="'Outfit', sans-serif">
                {currentScore.toFixed(1)}%
              </text>
              <rect x="58" y={currentY + 10} width="44" height="15" rx="7.5" fill="#FEF2F2" stroke="#FECACA" />
              <text x="80" y={currentY + 21} fontSize="8.5" fontWeight="700" fill="#DC2626" textAnchor="middle">{currentCat}</text>
              <text x="80" y="172" fontSize="10" fontWeight="600" fill="#64748B" textAnchor="middle">Current</text>

              {/* Target Anchor Node (Green) */}
              <circle cx="200" cy={targetY} r="8" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" filter="url(#glowGreen)" />
              <text x="200" y={targetY - 13} fontSize="13" fontWeight="800" fill="#10B981" textAnchor="middle" fontFamily="'Outfit', sans-serif">
                {targetScore.toFixed(1)}%
              </text>
              <rect x="175" y={targetY + 10} width="50" height="15" rx="7.5" fill="#ECFDF5" stroke="#A7F3D0" />
              <text x="200" y={targetY + 21} fontSize="8.5" fontWeight="700" fill="#059669" textAnchor="middle">{targetCat}</text>
              <text x="200" y="172" fontSize="10" fontWeight="600" fill="#64748B" textAnchor="middle">Target ({window_})</text>
            </svg>
          </div>

          {/* Reduction Badge */}
          <div className="slope-reduction-badge">
            <div className="slope-reduction-val">
              {diffPP > 0 ? `+${diffPP.toFixed(1)}` : diffPP.toFixed(1)} percentage points
            </div>
            <div className="slope-reduction-sub">
              Estimated reduction in cardiovascular risk
            </div>
          </div>
        </div>

        {/* ── COL 2: INTERACTIVE CLINICAL SLIDERS ── */}
        <div className="whatif-col-card">
          <div className="whatif-col-title">
            {Icons.users} Modify Risk Factors
          </div>

          {/* Window Tabs */}
          <div className="improvement-window-tabs">
            {['3 months', '6 months', '12 months'].map(w => (
              <button
                key={w}
                className={`window-tab-btn ${window_ === w ? 'active' : ''}`}
                onClick={() => setWindow(w)}
              >
                {w.charAt(0).toUpperCase() + w.slice(1)}
              </button>
            ))}
          </div>

          {/* Interactive Sliders Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Systolic BP Slider */}
            <div className="clinical-slider-card">
              <div className="slider-top-label-row">
                <span className="slider-factor-name">Systolic BP</span>
                <span className="slider-val-readout">{simPatient.ap_hi} mmHg</span>
              </div>
              <input
                type="range"
                min="90"
                max="200"
                value={simPatient.ap_hi}
                onChange={e => updateSim('ap_hi', e.target.value)}
                className="clinical-range-input"
              />
              <div className="slider-quick-preset-bar">
                <span className="slider-minmax-hint">90 - 200</span>
                <button className="btn-preset-chip" onClick={() => updateSim('ap_hi', 120)}>🎯 Target: 120</button>
              </div>
            </div>

            {/* Diastolic BP Slider */}
            <div className="clinical-slider-card">
              <div className="slider-top-label-row">
                <span className="slider-factor-name">Diastolic BP</span>
                <span className="slider-val-readout">{simPatient.ap_lo} mmHg</span>
              </div>
              <input
                type="range"
                min="60"
                max="120"
                value={simPatient.ap_lo}
                onChange={e => updateSim('ap_lo', e.target.value)}
                className="clinical-range-input"
              />
              <div className="slider-quick-preset-bar">
                <span className="slider-minmax-hint">60 - 120</span>
                <button className="btn-preset-chip" onClick={() => updateSim('ap_lo', 80)}>🎯 Target: 80</button>
              </div>
            </div>

            {/* Weight Slider */}
            <div className="clinical-slider-card">
              <div className="slider-top-label-row">
                <span className="slider-factor-name">Weight & BMI</span>
                <span className="slider-val-readout">{simPatient.weight} kg (BMI {calculateBMI(simPatient.weight, simPatient.height).toFixed(1)})</span>
              </div>
              <input
                type="range"
                min="45"
                max="130"
                value={simPatient.weight}
                onChange={e => updateSim('weight', e.target.value)}
                className="clinical-range-input"
              />
              <div className="slider-quick-preset-bar">
                <span className="slider-minmax-hint">45 - 130 kg</span>
                <button className="btn-preset-chip" onClick={() => updateSim('weight', 60)}>🎯 Target: 60 kg</button>
              </div>
            </div>

            {/* Cholesterol Multi-choice */}
            <div className="clinical-slider-card">
              <div className="slider-top-label-row">
                <span className="slider-factor-name">Cholesterol Level</span>
              </div>
              <div className="factor-choice-row">
                {[
                  { val: 1, label: 'Normal' },
                  { val: 2, label: 'Above Normal' },
                  { val: 3, label: 'High' }
                ].map(c => (
                  <button
                    key={c.val}
                    className={`btn-choice-pill ${simPatient.cholesterol === c.val ? 'active' : ''}`}
                    onClick={() => updateSim('cholesterol', c.val)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lifestyle Factors Multi-choice */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div className="clinical-slider-card">
                <span className="slider-factor-name" style={{ fontSize: 10 }}>Smoking</span>
                <div className="factor-choice-row" style={{ marginTop: 2 }}>
                  <button className={`btn-choice-pill ${simPatient.smoke === 0 ? 'active' : ''}`} onClick={() => updateSim('smoke', 0)}>Non-Smoker</button>
                  <button className={`btn-choice-pill ${simPatient.smoke === 1 ? 'active' : ''}`} onClick={() => updateSim('smoke', 1)}>Smoker</button>
                </div>
              </div>

              <div className="clinical-slider-card">
                <span className="slider-factor-name" style={{ fontSize: 10 }}>Activity</span>
                <div className="factor-choice-row" style={{ marginTop: 2 }}>
                  <button className={`btn-choice-pill ${simPatient.active === 1 ? 'active' : ''}`} onClick={() => updateSim('active', 1)}>Active</button>
                  <button className={`btn-choice-pill ${simPatient.active === 0 ? 'active' : ''}`} onClick={() => updateSim('active', 0)}>Inactive</button>
                </div>
              </div>
            </div>
          </div>
          {error && <div style={{ color: '#EF4444', fontSize: 10.5, fontWeight: 600 }}>{error}</div>}
        </div>

        {/* ── COL 3: EXPECTED OUTCOME ── */}
        <div className="whatif-col-card">
          <div className="whatif-col-title">
            {Icons.clipboard} Expected Outcome
          </div>

          <div className="outcome-target-box">
            <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Simulated Risk</div>
            <div className="outcome-target-val">{targetScore.toFixed(1)}%</div>
            <span className={`gauge-risk-badge ${catCls(targetCat)}`} style={{ marginTop: 4 }}>
              {targetCat.toUpperCase()} RISK
            </span>
          </div>

          <div className="outcome-card-block outcome-insight-blue">
            <div style={{ fontSize: 16 }}>💡</div>
            <div>
              <strong>Key Clinical Insight</strong><br />
              A lower estimated risk is observed under the selected target conditions. Aim to achieve these modifiable factor improvements within {window_} and reassess CVD risk.
            </div>
          </div>

          <div className="outcome-card-block outcome-warning-amber">
            <div style={{ fontSize: 16 }}>⏱</div>
            <div>
              <strong>Important Clinical Note</strong><br />
              Target risk is an algorithmic estimate based on modified parameters. The selected timeframe is an illustrative monitoring period and does not predict the exact onset of risk transition.
            </div>
          </div>
        </div>
      </div>
    </ClinicalModal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HEADER MODALS: PATIENT RECORD, ANALYTICS, RESOURCES
   Dedicated popups to uncluster the main dashboard
═══════════════════════════════════════════════════════════════════ */
function PatientRecordModal({ open, onClose, patient, patientsList, onSelectPatient }) {
  const bmi = calculateBMI(patient.weight, patient.height);
  return (
    <ClinicalModal
      open={open}
      onClose={onClose}
      title={<>{Icons.user} Patient Clinical Record: {patient.patient_id}</>}
      subtitle="Complete demographic and baseline medical record"
      width={720}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Switch Active Patient Record:</div>
            <select
              value={patient.patient_id}
              onChange={e => {
                const found = patientsList.find(p => p.patient_id === e.target.value);
                if (found) onSelectPatient(found);
              }}
              style={{ marginTop: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600 }}
            >
              {patientsList.map(p => (
                <option key={p.patient_id} value={p.patient_id}>Patient {p.patient_id}</option>
              ))}
            </select>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: 12, fontWeight: 700 }}>
              Cohort ID: #{patient.patient_id}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Age</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{Math.round(patient.age_years)} yrs</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Gender</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{patient.gender === 1 ? 'Female' : 'Male'}</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Height / Weight</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{patient.height}cm / {patient.weight}kg</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Calculated BMI</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: bmi > 25 ? '#D97706' : '#10B981', marginTop: 2 }}>{bmi.toFixed(1)}</div>
          </div>
        </div>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Cardiovascular Intake Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
            <div><strong>Blood Pressure:</strong> {patient.ap_hi} / {patient.ap_lo} mmHg</div>
            <div><strong>Cholesterol:</strong> {patient.cholesterol === 1 ? 'Normal' : patient.cholesterol === 2 ? 'Above Normal' : 'High'}</div>
            <div><strong>Blood Glucose:</strong> {patient.gluc === 1 ? 'Normal' : patient.gluc === 2 ? 'Above Normal' : 'High'}</div>
            <div><strong>Smoking History:</strong> {patient.smoke ? 'Active Smoker' : 'Non-Smoker'}</div>
            <div><strong>Alcohol Consumption:</strong> {patient.alco ? 'Regular' : 'Non-Consumer'}</div>
            <div><strong>Physical Activity:</strong> {patient.active ? 'Regularly Active' : 'Sedentary'}</div>
          </div>
        </div>
      </div>
    </ClinicalModal>
  );
}

function AnalyticsModal({ open, onClose, modelInfo }) {
  return (
    <ClinicalModal
      open={open}
      onClose={onClose}
      title={<>{Icons.barChart} Cardiovascular Model Analytics & Validation</>}
      subtitle="Evaluation metrics from the held-out clinical validation set (68,570 patient records)"
      width={740}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.5 }}>
          During model training, multiple classifier architectures were evaluated using cross-validation. The <strong>Gradient Boosting (HistGB)</strong> classifier achieved the superior ROC-AUC score and was deployed as the primary clinical engine.
        </div>

        {modelInfo?.metrics ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #CBD5E1', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '8px' }}>Model</th>
                <th style={{ padding: '8px' }}>ROC-AUC</th>
                <th style={{ padding: '8px' }}>Accuracy</th>
                <th style={{ padding: '8px' }}>F1-Score</th>
                <th style={{ padding: '8px' }}>Precision</th>
              </tr>
            </thead>
            <tbody>
              {modelInfo.metrics.map(m => {
                const isSel = m.model === modelInfo.best_model || m.model === modelInfo.best_model_raw;
                return (
                  <tr key={m.model} style={{ borderBottom: '1px solid #E2E8F0', background: isSel ? '#EFF6FF' : 'transparent', fontWeight: isSel ? 700 : 400 }}>
                    <td style={{ padding: '8px' }}>
                      {m.model.replace('runtime unavailable', '')}
                      {isSel && <span style={{ marginLeft: 6, fontSize: 9.5, background: '#10B981', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>Selected</span>}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{(m.roc_auc * 100).toFixed(1)}%</td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{(m.accuracy * 100).toFixed(1)}%</td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{(m.f1 * 100).toFixed(1)}%</td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{(m.precision * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#64748B' }}>Loading analytics metrics...</div>
        )}
      </div>
    </ClinicalModal>
  );
}

function ResourcesModal({ open, onClose }) {
  return (
    <ClinicalModal
      open={open}
      onClose={onClose}
      title={<>{Icons.document} Clinical Practice Guidelines & Evidence Base</>}
      subtitle="Diagnostic protocols and cardiovascular intervention thresholds"
      width={720}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 11.5 }}>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 12, borderRadius: 8 }}>
          <strong style={{ color: '#1E40AF' }}>ACC / AHA Guidelines for Cardiovascular Risk Assessment</strong>
          <p style={{ marginTop: 4, color: '#1E3A8A' }}>
            Cardiovascular disease risk assessment incorporates primary modifiable risk factors (Blood Pressure, Total & HDL Cholesterol, Smoking Status, BMI) alongside age and gender baselines.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: 10, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, color: '#059669' }}>Low Risk (&lt; 35%)</div>
            <div style={{ fontSize: 10.5, color: '#065F46', marginTop: 4 }}>
              Maintain healthy diet, regular aerobic exercise (150 min/wk), and routine annual screening.
            </div>
          </div>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: 10, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, color: '#D97706' }}>Moderate Risk (35–65%)</div>
            <div style={{ fontSize: 10.5, color: '#92400E', marginTop: 4 }}>
              Target lifestyle modifications (DASH diet, weight reduction), smoking cessation, reassess in 3–6 months.
            </div>
          </div>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: 10, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, color: '#DC2626' }}>High Risk (&gt; 65%)</div>
            <div style={{ fontSize: 10.5, color: '#991B1B', marginTop: 4 }}>
              Immediate clinical consultation, pharmacotherapy consideration (statins/antihypertensives), active monitoring.
            </div>
          </div>
        </div>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 8, color: '#64748B', fontSize: 10.5 }}>
          <strong>Research Prototype Disclaimer:</strong> CardioRisk Analytics is an academic clinical decision support research tool developed for predictive risk simulation and does not replace formal physician diagnostic judgment.
        </div>
      </div>
    </ClinicalModal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN APPLICATION ROOT
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [patientsList, setPatientsList] = useState([DEFAULT_PATIENT]);
  const [patient, setPatient] = useState(DEFAULT_PATIENT);
  const [result, setResult] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assessedTime, setAssessedTime] = useState('13:52:42');
  const [assessedDate, setAssessedDate] = useState('10 Apr 2025');

  // Popups State (Active Header Navigation)
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);

  const wsRef = useRef(null);

  // Initial Data Fetch & Auto-assessment on load
  useEffect(() => {
    fetch(`${API}/api/patients`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setPatientsList(data);
          setPatient(data[0]);
          // Automatically run initial assessment so the gauge is immediately live!
          runAssessment(data[0]);
        }
      })
      .catch(() => {
        runAssessment(DEFAULT_PATIENT);
      });

    fetch(`${API}/api/models`)
      .then(r => r.json())
      .then(setModelInfo)
      .catch(() => {});
  }, []);

  // WebSocket for Live Telemetry
  const connectWebSocket = useCallback(p => {
    if (wsRef.current) wsRef.current.close();
    try {
      const ws = new WebSocket(`ws://localhost:8000/ws/patient/${p.patient_id}`);
      ws.onmessage = e => {
        const d = JSON.parse(e.data);
        setTelemetry(d);
      };
      wsRef.current = ws;
    } catch {
      // WS fallback gracefully
    }
  }, []);

  useEffect(() => {
    connectWebSocket(patient);
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [patient, connectWebSocket]);

  // Assessment Runner
  const runAssessment = async currentPatient => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPatient)
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        const now = new Date();
        setAssessedTime(now.toLocaleTimeString('en-GB', { hour12: false }));
        setAssessedDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
      }
    } catch (err) {
      console.error('Assessment API error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, val) => {
    setPatient(prev => ({ ...prev, [field]: Number(val) }));
  };

  const currentBMI = calculateBMI(patient.weight, patient.height);

  return (
    <div className="app-shell">
      {/* ════ TOP HEADER (PRISTINE WHITE HOSPITAL BAR WITH ACTIVE NAVIGATION) ════ */}
      <header className="top-header">
        <div className="header-left">
          <div className="brand-wrap">
            <div className="brand-icon-box">
              {Icons.heartPulse}
            </div>
            <div className="brand-text">
              <span className="brand-name">CardioRisk Analytics</span>
              <span className="brand-sub">Intelligent Clinical Decision Support System</span>
            </div>
          </div>

          <nav className="nav-pills" aria-label="Main Navigation">
            <button className="nav-pill active" onClick={() => {}} title="Current Dashboard View">
              {Icons.barChart} Dashboard
            </button>
            <button className="nav-pill" onClick={() => setPatientModalOpen(true)} title="View Patient Profile Record">
              {Icons.user} Patient
            </button>
            <button className="nav-pill" onClick={() => setAnalyticsModalOpen(true)} title="View Model Validation Analytics">
              {Icons.broadcast} Analytics
            </button>
            <button className="nav-pill" onClick={() => setResourcesModalOpen(true)} title="View Clinical Guidelines & Resources">
              {Icons.document} Resources
            </button>
          </nav>
        </div>

        <div className="header-right">
          <div className="system-status-indicator">
            <div className="status-led-pulse" />
            <div className="system-status-text">
              <span className="system-status-title">System Online</span>
              <span className="system-status-sub">Research Prototype</span>
            </div>
          </div>

          <div className="header-divider-v" />

          <div className="last-assessed-box">
            {Icons.calendar}
            <span>Last assessed: <strong>{assessedTime} • {assessedDate}</strong></span>
          </div>

          <div className="header-divider-v" />

          <div className="patient-id-chip" onClick={() => setPatientModalOpen(true)} title="Click to view patient profile">
            <div className="patient-avatar-circle">P</div>
            <span className="patient-chip-label">Patient {patient.patient_id}</span>
          </div>

          <div className="academic-note-tiny">
            Academic prototype only. Not a diagnostic tool.
          </div>
        </div>
      </header>

      {/* ════ MAIN CLINICAL WORKSPACE (3-COLUMN GRID) ════ */}
      <main className="clinical-workspace">
        {/* ── LEFT PANEL: PATIENT PROFILE & PROMINENT RUN ASSESSMENT ── */}
        <section className="left-column" aria-label="Patient Profile">
          <div className="clinical-card">
            <div className="card-header-row" style={{ padding: '2px 2px 6px' }}>
              <div className="card-header-titles">
                <div className="card-main-title">
                  {Icons.user} Patient Profile
                </div>
                <div className="card-sub-title">Demographic and clinical information</div>
              </div>
              <span className="card-badge-pill">{patient.patient_id}</span>
            </div>

            {/* Patient Selector */}
            <div className="patient-select-bar">
              <select
                className="patient-select-dropdown"
                value={patient.patient_id}
                onChange={e => {
                  const p = patientsList.find(item => item.patient_id === e.target.value);
                  if (p) {
                    setPatient(p);
                    runAssessment(p);
                  }
                }}
              >
                {patientsList.map(p => (
                  <option key={p.patient_id} value={p.patient_id}>
                    Patient {p.patient_id}
                  </option>
                ))}
              </select>
            </div>

            {/* 3 Demographic Chips */}
            <div className="demographic-chips">
              <div className="demo-metric-chip">
                <div className="demo-metric-chip-icon">{Icons.user}</div>
                <span className="demo-metric-chip-label">Age</span>
                <span className="demo-metric-chip-val">{Math.round(patient.age_years)} <span style={{ fontSize: 9, fontWeight: 500 }}>yrs</span></span>
              </div>
              <div className="demo-metric-chip">
                <div className="demo-metric-chip-icon">{Icons.male}</div>
                <span className="demo-metric-chip-label">Sex</span>
                <span className="demo-metric-chip-val">{patient.gender === 1 ? 'Female' : 'Male'}</span>
              </div>
              <div className="demo-metric-chip">
                <div className="demo-metric-chip-icon">{Icons.scale}</div>
                <span className="demo-metric-chip-label">BMI</span>
                <span className="demo-metric-chip-val">{currentBMI.toFixed(1)}</span>
                <span className={`demo-metric-chip-tag ${currentBMI > 25 ? 'watch' : 'normal'}`}>
                  {currentBMI < 25 ? 'Normal' : 'Watch'}
                </span>
              </div>
            </div>

            {/* Clinical Parameters Form */}
            <div className="clinical-section-label">Clinical Parameters</div>
            <div className="clinical-input-grid">
              <div className="clinical-input-group">
                <label className="clinical-field-label">Weight (kg)</label>
                <input
                  className="clinical-input-field"
                  type="number"
                  value={patient.weight}
                  onChange={e => handleFieldChange('weight', e.target.value)}
                />
              </div>
              <div className="clinical-input-group">
                <label className="clinical-field-label">Height (cm)</label>
                <input
                  className="clinical-input-field"
                  type="number"
                  value={patient.height}
                  onChange={e => handleFieldChange('height', e.target.value)}
                />
              </div>
              <div className="clinical-input-group">
                <label className="clinical-field-label">Systolic BP</label>
                <input
                  className="clinical-input-field"
                  type="number"
                  value={patient.ap_hi}
                  onChange={e => handleFieldChange('ap_hi', e.target.value)}
                />
              </div>
              <div className="clinical-input-group">
                <label className="clinical-field-label">Diastolic BP</label>
                <input
                  className="clinical-input-field"
                  type="number"
                  value={patient.ap_lo}
                  onChange={e => handleFieldChange('ap_lo', e.target.value)}
                />
              </div>
              <div className="clinical-input-group">
                <label className="clinical-field-label">Cholesterol</label>
                <select
                  className="clinical-select-field"
                  value={patient.cholesterol}
                  onChange={e => handleFieldChange('cholesterol', e.target.value)}
                >
                  <option value="1">1 - Normal</option>
                  <option value="2">2 - Above Normal</option>
                  <option value="3">3 - High</option>
                </select>
              </div>
              <div className="clinical-input-group">
                <label className="clinical-field-label">Glucose</label>
                <select
                  className="clinical-select-field"
                  value={patient.gluc}
                  onChange={e => handleFieldChange('gluc', e.target.value)}
                >
                  <option value="1">1 - Normal</option>
                  <option value="2">2 - Above Normal</option>
                  <option value="3">3 - High</option>
                </select>
              </div>
            </div>

            {/* Lifestyle Factors Interactive Tiles */}
            <div className="clinical-section-label">Lifestyle Factors</div>
            <div className="lifestyle-tiles-row">
              <div
                className="lifestyle-status-tile"
                onClick={() => handleFieldChange('smoke', patient.smoke ? 0 : 1)}
                title="Click to toggle smoking status"
              >
                <div className="lifestyle-tile-icon-box icon-box-smoking">🚬</div>
                <span className="lifestyle-tile-title">Smoking</span>
                <span className={`lifestyle-tile-val ${patient.smoke ? 'elevated' : 'normal'}`}>
                  • {patient.smoke ? 'Yes' : 'No'}
                </span>
              </div>
              <div
                className="lifestyle-status-tile"
                onClick={() => handleFieldChange('alco', patient.alco ? 0 : 1)}
                title="Click to toggle alcohol consumption"
              >
                <div className="lifestyle-tile-icon-box icon-box-alcohol">🍷</div>
                <span className="lifestyle-tile-title">Alcohol</span>
                <span className={`lifestyle-tile-val ${patient.alco ? 'warning' : 'normal'}`}>
                  • {patient.alco ? 'Yes' : 'No'}
                </span>
              </div>
              <div
                className="lifestyle-status-tile"
                onClick={() => handleFieldChange('active', patient.active ? 0 : 1)}
                title="Click to toggle physical activity"
              >
                <div className="lifestyle-tile-icon-box icon-box-activity">🏃</div>
                <span className="lifestyle-tile-title">Activity</span>
                <span className={`lifestyle-tile-val ${patient.active ? 'normal' : 'warning'}`}>
                  • {patient.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Prominent Run Assessment Button */}
            <div className="btn-run-assessment-wrap">
              <button
                className="btn-run-assessment"
                onClick={() => runAssessment(patient)}
                disabled={loading}
                id="btn-run-assessment"
              >
                {loading ? 'Analyzing Clinical Risk...' : <>{Icons.barChart} Run Assessment</>}
              </button>
              <button
                className="btn-reset-plain"
                onClick={() => {
                  setPatient({ ...DEFAULT_PATIENT });
                  runAssessment(DEFAULT_PATIENT);
                }}
              >
                Reset to Baseline
              </button>
            </div>
          </div>
        </section>

        {/* ── CENTER PANEL: ESTIMATED RISK GAUGE + SHAP + BENCHMARK ── */}
        <section className="center-column" aria-label="Risk and Clinical Analytics">
          {/* Estimated Cardiovascular Risk Card */}
          <div className="clinical-card estimated-risk-card">
            <div className="risk-card-top-row">
              <div className="card-header-titles">
                <div className="card-main-title">
                  <span style={{ color: '#EF4444', display: 'flex' }}>{Icons.heartPulse}</span> Estimated Cardiovascular Risk
                </div>
                <div className="card-sub-title">Model-based risk estimate for cardiovascular disease</div>
              </div>
            </div>

            <div className="risk-gauge-model-row">
              {/* Working Semicircular Gauge */}
              <AuthenticSemicircularGauge prediction={result?.prediction} />

              {/* Model Info Block */}
              <div className="model-info-block">
                <div className="model-info-header">
                  <div className="model-icon-box">
                    {Icons.layers}
                  </div>
                  <div>
                    <div className="model-label-tiny">Model Used</div>
                    <div className="model-name-strong">
                      {result?.prediction?.model_used ?? 'Gradient Boosting (HistGB)'}
                    </div>
                  </div>
                </div>
                <span className="model-selected-pill">Selected Model</span>
                <div className="model-description-note">
                  Model selected based on best ROC-AUC performance on test data.
                </div>
              </div>
            </div>

            {/* 4 Action Buttons */}
            <div className="gauge-action-buttons-row">
              <button
                className="btn-gauge-action"
                onClick={() => setExplanationOpen(true)}
                id="btn-explanation"
              >
                {Icons.search} Explanation
              </button>
              <button
                className="btn-gauge-action primary"
                onClick={() => setWhatIfOpen(true)}
                id="btn-whatif"
              >
                {Icons.barChart} What-If Simulator
              </button>
              <button
                className="btn-gauge-action"
                onClick={() => setTelemetryOpen(true)}
                id="btn-telemetry"
              >
                {Icons.broadcast} Live Telemetry
              </button>
              <button
                className="btn-gauge-action"
                onClick={() => setModelOpen(true)}
                id="btn-model-details"
              >
                {Icons.document} Model Details
              </button>
            </div>
          </div>

          {/* Bottom Split: SHAP Diverging Chart + Population Benchmark */}
          <div className="center-bottom-split">
            {/* SHAP Card */}
            <div className="clinical-card shap-diverging-card">
              <div className="card-header-row" style={{ padding: '0 0 4px' }}>
                <div className="card-header-titles">
                  <div className="card-main-title" style={{ fontSize: 12.5 }}>
                    {Icons.barChart} Why is the risk elevated?
                  </div>
                  <div className="card-sub-title">Top model-derived factors (SHAP values)</div>
                </div>
              </div>
              <ShapDivergingChart explanation={result?.explanation} />
            </div>

            {/* Population Benchmark Card */}
            <div className="clinical-card population-benchmark-card">
              <div className="card-header-row" style={{ padding: '0 0 4px' }}>
                <div className="card-header-titles">
                  <div className="card-main-title" style={{ fontSize: 12.5 }}>
                    {Icons.users} Patient vs Population Benchmark
                  </div>
                  <div className="card-sub-title">Comparison with general population (WHO GHO)</div>
                </div>
              </div>
              <PopulationBenchmarkChart patient={patient} />
            </div>
          </div>
        </section>

        {/* ── RIGHT PANEL: HEALTH INDICATORS + TELEMETRY ── */}
        <section className="right-column" aria-label="Health Indicators and Telemetry">
          {/* Health Indicators Card */}
          <div className="clinical-card health-indicators-card">
            <div className="card-header-row" style={{ padding: '0 0 4px' }}>
              <div className="card-header-titles">
                <div className="card-main-title" style={{ fontSize: 12.5 }}>
                  {Icons.heartPulse} Health Indicators
                </div>
                <div className="card-sub-title">Current patient measurements vs normal ranges</div>
              </div>
            </div>
            <HealthIndicatorsTable patient={patient} />
          </div>

          {/* Simulated Live Telemetry Card */}
          <div className="clinical-card live-telemetry-card">
            <TelemetryMonitorPanel telemetry={telemetry} />
          </div>
        </section>
      </main>

      {/* ════ BOTTOM ASSESSMENT SUMMARY STRIP ════ */}
      <footer className="bottom-summary-strip">
        <div className="bottom-summary-left">
          <div className="bottom-assessment-title-wrap">
            <div className="bottom-clipboard-icon">
              {Icons.clipboard}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                Assessment Summary
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                Latest risk assessment result
              </div>
            </div>
          </div>

          <div className="bottom-metrics-grid">
            <div className="bottom-metric-item">
              <span className="bottom-metric-label">Risk Percentage</span>
              <span className="bottom-metric-value red">
                {result?.prediction?.risk_score != null ? `${result.prediction.risk_score.toFixed(1)}%` : '82.8%'}
              </span>
            </div>
            <div className="bottom-metric-item">
              <span className="bottom-metric-label">Risk Category</span>
              <span className="bottom-metric-value red">
                {result?.prediction?.risk_category ?? 'High'}
              </span>
            </div>
            <div className="bottom-metric-item">
              <span className="bottom-metric-label">Model Used</span>
              <span className="bottom-metric-value" style={{ fontSize: 13, fontWeight: 600 }}>
                {result?.prediction?.model_used ?? 'Gradient Boosting (HistGB)'}
              </span>
            </div>
            <div className="bottom-metric-item">
              <span className="bottom-metric-label">Assessed At</span>
              <span className="bottom-metric-value" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)' }}>
                {assessedDate}, {assessedTime}
              </span>
            </div>
          </div>
        </div>

        <div className="bottom-brand-motto">
          <div className="bottom-motto-wave">
            {Icons.pulseWave}
          </div>
          <div>
            Better Insights. Healthier Tomorrows.<br />
            <strong>CardioRisk Analytics</strong>
          </div>
        </div>
      </footer>

      {/* ════ CLINICAL POPUP MODALS ════ */}
      {/* What-If Simulator Modal */}
      <WhatIfModal
        open={whatIfOpen}
        onClose={() => setWhatIfOpen(false)}
        patient={patient}
        baseResult={result}
      />

      {/* SHAP Explanation Modal */}
      <ClinicalModal
        open={explanationOpen}
        onClose={() => setExplanationOpen(false)}
        title="Model Explanation — SHAP Factor Analysis"
        subtitle="Feature contributions to this patient's cardiovascular risk calculation"
        width={720}
      >
        <ShapDivergingChart explanation={result?.explanation} />
      </ClinicalModal>

      {/* Live Telemetry Modal */}
      <ClinicalModal
        open={telemetryOpen}
        onClose={() => setTelemetryOpen(false)}
        title="Simulated Live Telemetry Stream"
        subtitle="Real-time vital signs stream (demonstration prototype)"
        width={560}
      >
        <TelemetryMonitorPanel telemetry={telemetry} />
      </ClinicalModal>

      {/* Model Performance Details Modal */}
      <AnalyticsModal
        open={modelOpen || analyticsModalOpen}
        onClose={() => { setModelOpen(false); setAnalyticsModalOpen(false); }}
        modelInfo={modelInfo}
      />

      {/* Patient Record Modal (from Header Nav) */}
      <PatientRecordModal
        open={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        patient={patient}
        patientsList={patientsList}
        onSelectPatient={p => {
          setPatient(p);
          runAssessment(p);
          setPatientModalOpen(false);
        }}
      />

      {/* Resources & Guidelines Modal (from Header Nav) */}
      <ResourcesModal
        open={resourcesModalOpen}
        onClose={() => setResourcesModalOpen(false)}
      />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
