import React, { useEffect, useMemo, useRef } from 'react';

/**
 * HealthIndicatorDetailModal
 *
 * Detailed Clinical Breakdown & Visualization Modal for Health Indicators:
 * - 7 Indicators: Blood Pressure, BMI, Cholesterol, Glucose, Smoking, Alcohol, Physical Activity
 * - Visual scales, thresholds, and categories reflecting authentic dataset capabilities
 * - Separate systolic and diastolic scales for Blood Pressure
 * - Calculated BMI with formula and WHO category bands
 * - Discrete categorical tiles for Cholesterol & Glucose (no fabricated lab numbers)
 * - Binary state cards for Smoking, Alcohol, and Physical Activity (no fabricated doses/minutes)
 * - Plain-language clinical explanation
 * - SHAP feature contribution readout labeled "Model contribution, not clinical causation."
 * - Shortcut to What-If simulator for modifiable factors
 * - Full keyboard accessibility (Escape to close, focus management) and responsive layout
 */

const WHATIF_SUPPORTED_FACTORS = new Set(['bp', 'bmi', 'chol', 'smoke', 'active']);

const INDICATOR_METADATA = {
  bp: {
    id: 'bp',
    name: 'Blood Pressure',
    shortName: 'BP',
    category: 'Vascular Hemodynamics',
    unit: 'mmHg',
    icon: '🫀',
    explanation: 'Blood pressure measures the lateral hydrostatic force exerted by circulating blood against systemic arterial walls during ventricular contraction (systolic) and resting diastole (diastolic). Elevated arterial pressures increase ventricular afterload and accelerate vascular endothelial remodeling.'
  },
  bmi: {
    id: 'bmi',
    name: 'Body Mass Index (BMI)',
    shortName: 'BMI',
    category: 'Anthropometric Adiposity',
    unit: 'kg/m²',
    icon: '⚖️',
    explanation: 'Body Mass Index (BMI) is a standardized anthropometric ratio comparing total body mass to height squared. While it does not differentiate visceral from subcutaneous adipose distribution, elevated BMI strongly correlates with increased metabolic demand, systemic inflammation, and vascular workload.'
  },
  chol: {
    id: 'chol',
    name: 'Total Cholesterol',
    shortName: 'Cholesterol',
    category: 'Lipid Homeostasis',
    unit: 'Categorical Tier',
    icon: '🩸',
    explanation: 'Circulating serum cholesterol is required for steroid hormone synthesis and cellular membrane integrity. Excessive circulating low-density atherogenic lipoproteins infiltrate the vascular intima, initiating foam cell transformation and progressive arterial plaque accumulation.'
  },
  gluc: {
    id: 'gluc',
    name: 'Fasting Glucose',
    shortName: 'Glucose',
    category: 'Glycemic Regulation',
    unit: 'Categorical Tier',
    icon: '🔬',
    explanation: 'Fasting blood glucose reflects systemic glycemic homeostasis regulated by pancreatic insulin secretion and hepatic gluconeogenesis. Chronically elevated glucose promotes non-enzymatic protein glycation, endothelial dysfunction, and vascular stiffening.'
  },
  smoke: {
    id: 'smoke',
    name: 'Smoking Status',
    shortName: 'Smoking',
    category: 'Toxicological Exposure',
    unit: 'Binary Status',
    icon: '🚬',
    explanation: 'Tobacco combustion generates toxic reactive oxidant species, carbon monoxide, and nicotine. Inhaled toxins damage endothelial nitric oxide synthase, impair endothelium-dependent vasodilation, accelerate arterial plaque destabilization, and promote platelet aggregation.'
  },
  alco: {
    id: 'alco',
    name: 'Alcohol Consumption',
    shortName: 'Alcohol',
    category: 'Behavioral Exposure',
    unit: 'Binary Status',
    icon: '🍷',
    explanation: 'Alcohol intake exerts multifaceted effects on vascular autonomic tone, the renin-angiotensin system, and cardiac myocyte function. Regular or excessive consumption is clinically associated with sustained blood pressure elevation and secondary cardiomyopathy.'
  },
  active: {
    id: 'active',
    name: 'Physical Activity',
    shortName: 'Activity',
    category: 'Cardiorespiratory Lifestyle',
    unit: 'Binary Status',
    icon: '🏃',
    explanation: 'Habitual physical activity stimulates vascular endothelial shear stress, upregulating nitric oxide bioavailability and reducing resting arterial stiffness. A sedentary lifestyle is associated with reduced cardiorespiratory fitness, insulin resistance, and impaired autonomic vascular control.'
  }
};

const INDICATOR_LIST = ['bp', 'bmi', 'chol', 'gluc', 'smoke', 'alco', 'active'];

export default function HealthIndicatorDetailModal({
  indicatorId,
  open,
  onClose,
  patient,
  result,
  onOpenWhatIf,
  onSelectIndicator
}) {
  const closeButtonRef = useRef(null);

  // Keyboard Escape listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus close button on open
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open, indicatorId]);

  // Extract matching SHAP contributions from result.explanation (must be before conditional return)
  const shapContributions = useMemo(() => {
    if (!open || !indicatorId || !result?.explanation) return [];
    const all = [
      ...(result.explanation.modifiable || []),
      ...(result.explanation.non_modifiable || [])
    ];

    if (indicatorId === 'bp') {
      return all.filter(f => f.feature === 'ap_hi' || f.feature === 'ap_lo');
    }
    if (indicatorId === 'bmi') {
      return all.filter(f => f.feature === 'bmi' || f.feature === 'weight');
    }
    if (indicatorId === 'chol') {
      return all.filter(f => f.feature === 'cholesterol');
    }
    if (indicatorId === 'gluc') {
      return all.filter(f => f.feature === 'gluc');
    }
    if (indicatorId === 'smoke') {
      return all.filter(f => f.feature === 'smoke');
    }
    if (indicatorId === 'alco') {
      return all.filter(f => f.feature === 'alco');
    }
    if (indicatorId === 'active') {
      return all.filter(f => f.feature === 'active');
    }
    return [];
  }, [open, indicatorId, result]);

  if (!open || !indicatorId) return null;

  const currentId = indicatorId;
  const meta = INDICATOR_METADATA[currentId] || INDICATOR_METADATA.bp;

  // Extract patient metrics
  const apHi = patient?.ap_hi ?? 120;
  const apLo = patient?.ap_lo ?? 80;
  const weight = patient?.weight ?? 70;
  const height = patient?.height ?? 170;
  const bmi = weight && height ? weight / ((height / 100) ** 2) : 22.0;
  const cholVal = patient?.cholesterol ?? 1;
  const glucVal = patient?.gluc ?? 1;
  const smokeVal = patient?.smoke ?? 0;
  const alcoVal = patient?.alco ?? 0;
  const actVal = patient?.active ?? 1;

  // Clamp utility
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // Compute indicator-specific status pill & display values
  let currentValText = '';
  let statusTier = 'normal';
  let statusText = 'Normal';

  if (currentId === 'bp') {
    currentValText = `${apHi} / ${apLo} mmHg`;
    if (apHi >= 140 || apLo >= 90) {
      statusTier = 'elevated';
      statusText = 'Elevated (Hypertension)';
    } else if (apHi >= 120 || apLo >= 80) {
      statusTier = 'attention';
      statusText = 'Watch / Elevated';
    } else {
      statusTier = 'normal';
      statusText = 'Normal / Optimal';
    }
  } else if (currentId === 'bmi') {
    currentValText = `${bmi.toFixed(1)} kg/m²`;
    if (bmi >= 30) {
      statusTier = 'elevated';
      statusText = 'Obese (≥30.0)';
    } else if (bmi >= 25) {
      statusTier = 'attention';
      statusText = 'Overweight (25–29.9)';
    } else if (bmi < 18.5) {
      statusTier = 'attention';
      statusText = 'Underweight (<18.5)';
    } else {
      statusTier = 'normal';
      statusText = 'Normal Weight (18.5–24.9)';
    }
  } else if (currentId === 'chol') {
    currentValText = cholVal === 1 ? 'Normal' : cholVal === 2 ? 'Above Normal' : 'High';
    statusTier = cholVal === 1 ? 'normal' : cholVal === 2 ? 'attention' : 'elevated';
    statusText = cholVal === 1 ? 'Normal (Tier 1)' : cholVal === 2 ? 'Above Normal (Tier 2)' : 'High (Tier 3)';
  } else if (currentId === 'gluc') {
    currentValText = glucVal === 1 ? 'Normal' : glucVal === 2 ? 'Above Normal' : 'High';
    statusTier = glucVal === 1 ? 'normal' : glucVal === 2 ? 'attention' : 'elevated';
    statusText = glucVal === 1 ? 'Normal (Tier 1)' : glucVal === 2 ? 'Above Normal (Tier 2)' : 'High (Tier 3)';
  } else if (currentId === 'smoke') {
    currentValText = smokeVal === 1 ? 'Active Smoker' : 'Non-Smoker';
    statusTier = smokeVal === 1 ? 'elevated' : 'normal';
    statusText = smokeVal === 1 ? 'Active Smoker (Recorded)' : 'Non-Smoker';
  } else if (currentId === 'alco') {
    currentValText = alcoVal === 1 ? 'Alcohol Consumer' : 'Non-Consumer';
    statusTier = alcoVal === 1 ? 'attention' : 'normal';
    statusText = alcoVal === 1 ? 'Consumer (Recorded)' : 'Non-Consumer';
  } else if (currentId === 'active') {
    currentValText = actVal === 1 ? 'Regularly Active' : 'Sedentary / Inactive';
    statusTier = actVal === 1 ? 'normal' : 'attention';
    statusText = actVal === 1 ? 'Regularly Active' : 'Sedentary / Inactive';
  }

  const isWhatIfSupported = WHATIF_SUPPORTED_FACTORS.has(currentId);

  return (
    <div
      className="clinical-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="indicator-modal-title"
    >
      <div
        className="indicator-detail-modal-card animate-modal-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="indicator-modal-header">
          <div className="indicator-header-main">
            <span className="indicator-header-icon" aria-hidden="true">{meta.icon}</span>
            <div>
              <div className="indicator-header-title-row">
                <h2 id="indicator-modal-title" className="indicator-modal-title">
                  {meta.name}
                </h2>
                <span className={`bullet-status-pill ${statusTier}`}>
                  {statusText}
                </span>
              </div>
              <div className="indicator-modal-subtitle">
                <span>{meta.category}</span>
                <span className="dot-sep">•</span>
                <span>Patient {patient?.patient_id || 'DEMO-001'}</span>
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            className="indicator-modal-close-btn"
            onClick={onClose}
            aria-label="Close indicator details"
          >
            ✕
          </button>
        </div>

        {/* Quick Indicator Navigation Tabs */}
        <div className="indicator-tabs-strip" role="tablist" aria-label="Select Health Indicator">
          {INDICATOR_LIST.map((id) => {
            const item = INDICATOR_METADATA[id];
            const isActive = id === currentId;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                className={`indicator-tab-pill ${isActive ? 'active' : ''}`}
                onClick={() => onSelectIndicator && onSelectIndicator(id)}
              >
                <span className="tab-pill-icon">{item.icon}</span>
                <span className="tab-pill-text">{item.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="indicator-modal-body">
          {/* Recorded Value Showcase Banner */}
          <div className="indicator-recorded-banner">
            <div className="recorded-metric-cell">
              <span className="recorded-label">Recorded Patient Value</span>
              <strong className="recorded-value">{currentValText}</strong>
            </div>
            <div className="recorded-metric-cell">
              <span className="recorded-label">Measurement Type</span>
              <span className="recorded-unit-badge">{meta.unit}</span>
            </div>
            <div className="recorded-metric-cell">
              <span className="recorded-label">Clinical Status</span>
              <span className={`recorded-status-badge ${statusTier}`}>
                <span className="status-dot" />
                {statusText}
              </span>
            </div>
          </div>

          {/* VISUALIZATION SECTION: STRICTLY USES REAL PROJECT DATA */}
          <div className="indicator-viz-panel">
            <div className="viz-panel-header">
              <span className="viz-panel-title">Clinical Scale & Threshold Analysis</span>
              <span className="viz-panel-tag">Evidence-Based Clinical Ranges</span>
            </div>

            {/* 1. Blood Pressure: Separate Systolic & Diastolic Labeled Scales */}
            {currentId === 'bp' && (
              <div className="bp-scales-container">
                {/* Systolic Scale */}
                <div className="scale-block">
                  <div className="scale-title-row">
                    <span className="scale-name">Systolic Blood Pressure (ap_hi)</span>
                    <strong className={`scale-reading ${apHi >= 140 ? 'red' : apHi >= 120 ? 'amber' : 'green'}`}>
                      {apHi} mmHg
                    </strong>
                  </div>
                  <div className="labeled-bullet-track">
                    <div className="bullet-zones-bar">
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '33.33%', backgroundColor: '#10B981' }}
                        title="Normal (<120 mmHg)"
                      />
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '22.22%', backgroundColor: '#F59E0B' }}
                        title="Elevated / Watch (120–139 mmHg)"
                      />
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '44.45%', backgroundColor: '#EF4444' }}
                        title="High / Hypertension (≥140 mmHg)"
                      />
                    </div>
                    {/* Marker pin */}
                    <div
                      className={`bullet-marker-pin ${apHi >= 140 ? 'elevated' : apHi >= 120 ? 'attention' : 'normal'}`}
                      style={{ left: `${clamp(((apHi - 90) / 90) * 100, 3, 97)}%` }}
                    >
                      <div className="marker-core-dot" />
                      <div className="marker-callout-bubble">{apHi}</div>
                    </div>
                  </div>
                  {/* Ticks and Zone Labels */}
                  <div className="scale-ticks-grid">
                    <span className="tick-node">90</span>
                    <span className="tick-node bold-node" style={{ left: '33.33%' }}>120</span>
                    <span className="tick-node bold-node" style={{ left: '55.55%' }}>140</span>
                    <span className="tick-node" style={{ left: '100%', transform: 'translateX(-100%)' }}>180 mmHg</span>
                  </div>
                  <div className="scale-zone-labels-strip">
                    <span className="zone-pill green">Normal (&lt;120)</span>
                    <span className="zone-pill amber">Watch (120–139)</span>
                    <span className="zone-pill red">High (≥140)</span>
                  </div>
                </div>

                {/* Diastolic Scale */}
                <div className="scale-block">
                  <div className="scale-title-row">
                    <span className="scale-name">Diastolic Blood Pressure (ap_lo)</span>
                    <strong className={`scale-reading ${apLo >= 90 ? 'red' : apLo >= 80 ? 'amber' : 'green'}`}>
                      {apLo} mmHg
                    </strong>
                  </div>
                  <div className="labeled-bullet-track">
                    <div className="bullet-zones-bar">
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '40.0%', backgroundColor: '#10B981' }}
                        title="Normal (<80 mmHg)"
                      />
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '20.0%', backgroundColor: '#F59E0B' }}
                        title="Elevated / Watch (80–89 mmHg)"
                      />
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '40.0%', backgroundColor: '#EF4444' }}
                        title="High / Hypertension (≥90 mmHg)"
                      />
                    </div>
                    {/* Marker pin */}
                    <div
                      className={`bullet-marker-pin ${apLo >= 90 ? 'elevated' : apLo >= 80 ? 'attention' : 'normal'}`}
                      style={{ left: `${clamp(((apLo - 60) / 50) * 100, 3, 97)}%` }}
                    >
                      <div className="marker-core-dot" />
                      <div className="marker-callout-bubble">{apLo}</div>
                    </div>
                  </div>
                  <div className="scale-ticks-grid">
                    <span className="tick-node">60</span>
                    <span className="tick-node bold-node" style={{ left: '40%' }}>80</span>
                    <span className="tick-node bold-node" style={{ left: '60%' }}>90</span>
                    <span className="tick-node" style={{ left: '100%', transform: 'translateX(-100%)' }}>110 mmHg</span>
                  </div>
                  <div className="scale-zone-labels-strip">
                    <span className="zone-pill green">Normal (&lt;80)</span>
                    <span className="zone-pill amber">Watch (80–89)</span>
                    <span className="zone-pill red">High (≥90)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BMI: Calculated BMI and Category Thresholds */}
            {currentId === 'bmi' && (
              <div className="bmi-scale-container">
                <div className="bmi-formula-card">
                  <div className="formula-row">
                    <span className="formula-label">Calculation:</span>
                    <code className="formula-code">BMI = weight (kg) ÷ [height (m)]²</code>
                  </div>
                  <div className="patient-formula-values">
                    <span>Recorded Weight: <strong>{weight} kg</strong></span>
                    <span className="dot-sep">•</span>
                    <span>Recorded Height: <strong>{height} cm</strong> ({((height || 170) / 100).toFixed(2)} m)</span>
                    <span className="dot-sep">•</span>
                    <span>Result: <strong>{bmi.toFixed(1)} kg/m²</strong></span>
                  </div>
                </div>

                <div className="scale-block">
                  <div className="labeled-bullet-track">
                    <div className="bullet-zones-bar">
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '14%', backgroundColor: '#64748B' }}
                        title="Underweight (<18.5)"
                      />
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '26%', backgroundColor: '#10B981' }}
                        title="Normal Weight (18.5–24.9)"
                      />
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '20%', backgroundColor: '#F59E0B' }}
                        title="Overweight (25–29.9)"
                      />
                      <div
                        className="bullet-zone-segment"
                        style={{ width: '40%', backgroundColor: '#EF4444' }}
                        title="Obese (≥30.0)"
                      />
                    </div>
                    {/* Marker pin */}
                    <div
                      className={`bullet-marker-pin ${statusTier}`}
                      style={{ left: `${clamp(((bmi - 15) / 25) * 100, 3, 97)}%` }}
                    >
                      <div className="marker-core-dot" />
                      <div className="marker-callout-bubble">{bmi.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="scale-ticks-grid">
                    <span className="tick-node">15</span>
                    <span className="tick-node" style={{ left: '14%' }}>18.5</span>
                    <span className="tick-node" style={{ left: '40%' }}>25.0</span>
                    <span className="tick-node" style={{ left: '60%' }}>30.0</span>
                    <span className="tick-node" style={{ left: '100%', transform: 'translateX(-100%)' }}>40 kg/m²</span>
                  </div>
                  <div className="scale-zone-labels-strip four-zones">
                    <span className="zone-pill slate">&lt;18.5 Underweight</span>
                    <span className="zone-pill green">18.5–24.9 Normal</span>
                    <span className="zone-pill amber">25–29.9 Overweight</span>
                    <span className="zone-pill red">≥30 Obese</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Cholesterol: Discrete Category Tiers (No fake continuous mg/dL) */}
            {currentId === 'chol' && (
              <div className="discrete-categories-container">
                <div className="discrete-cards-grid">
                  <div className={`discrete-tier-card ${cholVal === 1 ? 'selected active-green' : 'dimmed'}`}>
                    <div className="tier-top-row">
                      <span className="tier-num-pill">Category 1</span>
                      {cholVal === 1 && <span className="active-check-badge">✓ Recorded State</span>}
                    </div>
                    <div className="tier-title green">Normal</div>
                    <p className="tier-description">
                      Within normal clinical lipid parameters. Represents standard baseline cholesterol balance.
                    </p>
                    <div className="tier-ref-hint">Epidemiological ref: Desirable (&lt;200 mg/dL equiv)</div>
                  </div>

                  <div className={`discrete-tier-card ${cholVal === 2 ? 'selected active-amber' : 'dimmed'}`}>
                    <div className="tier-top-row">
                      <span className="tier-num-pill">Category 2</span>
                      {cholVal === 2 && <span className="active-check-badge">✓ Recorded State</span>}
                    </div>
                    <div className="tier-title amber">Above Normal</div>
                    <p className="tier-description">
                      Moderately elevated circulating lipids. Clinically recommended for dietary and lifestyle monitoring.
                    </p>
                    <div className="tier-ref-hint">Epidemiological ref: Borderline high (200–239 mg/dL equiv)</div>
                  </div>

                  <div className={`discrete-tier-card ${cholVal === 3 ? 'selected active-red' : 'dimmed'}`}>
                    <div className="tier-top-row">
                      <span className="tier-num-pill">Category 3</span>
                      {cholVal === 3 && <span className="active-check-badge">✓ Recorded State</span>}
                    </div>
                    <div className="tier-title red">High</div>
                    <p className="tier-description">
                      Substantially elevated cholesterol tier. Associated with increased arterial plaque formation.
                    </p>
                    <div className="tier-ref-hint">Epidemiological ref: High risk (≥240 mg/dL equiv)</div>
                  </div>
                </div>
                <div className="discrete-dataset-notice">
                  ℹ️ <strong>Standardized Categorical Record:</strong> The clinical dataset classifies cholesterol into discrete clinical tiers (1, 2, or 3). Continuous laboratory serum concentrations (mg/dL) are not present in this record.
                </div>
              </div>
            )}

            {/* 4. Glucose: Discrete Category Tiers (No fake continuous mg/dL) */}
            {currentId === 'gluc' && (
              <div className="discrete-categories-container">
                <div className="discrete-cards-grid">
                  <div className={`discrete-tier-card ${glucVal === 1 ? 'selected active-green' : 'dimmed'}`}>
                    <div className="tier-top-row">
                      <span className="tier-num-pill">Category 1</span>
                      {glucVal === 1 && <span className="active-check-badge">✓ Recorded State</span>}
                    </div>
                    <div className="tier-title green">Normal</div>
                    <p className="tier-description">
                      Standard fasting glucose regulation within expected homeostatic range.
                    </p>
                    <div className="tier-ref-hint">Epidemiological ref: Normal fasting (&lt;100 mg/dL equiv)</div>
                  </div>

                  <div className={`discrete-tier-card ${glucVal === 2 ? 'selected active-amber' : 'dimmed'}`}>
                    <div className="tier-top-row">
                      <span className="tier-num-pill">Category 2</span>
                      {glucVal === 2 && <span className="active-check-badge">✓ Recorded State</span>}
                    </div>
                    <div className="tier-title amber">Above Normal</div>
                    <p className="tier-description">
                      Impaired fasting glucose tier indicating early metabolic or insulin regulation alteration.
                    </p>
                    <div className="tier-ref-hint">Epidemiological ref: Impaired fasting (100–125 mg/dL equiv)</div>
                  </div>

                  <div className={`discrete-tier-card ${glucVal === 3 ? 'selected active-red' : 'dimmed'}`}>
                    <div className="tier-top-row">
                      <span className="tier-num-pill">Category 3</span>
                      {glucVal === 3 && <span className="active-check-badge">✓ Recorded State</span>}
                    </div>
                    <div className="tier-title red">High</div>
                    <p className="tier-description">
                      Elevated glycemic category. Associated with accelerated microvascular and macrovascular risk.
                    </p>
                    <div className="tier-ref-hint">Epidemiological ref: Elevated fasting (≥126 mg/dL equiv)</div>
                  </div>
                </div>
                <div className="discrete-dataset-notice">
                  ℹ️ <strong>Standardized Categorical Record:</strong> Fasting glucose is recorded as discrete standardized tiers (1, 2, or 3) in this dataset. Exact serum mg/dL or HbA1c values are not part of the patient record.
                </div>
              </div>
            )}

            {/* 5. Smoking: Discrete Recorded State (No fake pack-years) */}
            {currentId === 'smoke' && (
              <div className="discrete-binary-container">
                <div className="binary-cards-grid">
                  <div className={`binary-state-card ${smokeVal === 0 ? 'selected active-green' : 'dimmed'}`}>
                    <div className="binary-icon">🚭</div>
                    <div className="binary-title green">Non-Smoker (0)</div>
                    <div className="binary-desc">No active tobacco smoking recorded for this patient.</div>
                    {smokeVal === 0 && <span className="active-check-badge">✓ Recorded Patient State</span>}
                  </div>

                  <div className={`binary-state-card ${smokeVal === 1 ? 'selected active-red' : 'dimmed'}`}>
                    <div className="binary-icon">🚬</div>
                    <div className="binary-title red">Active Smoker (1)</div>
                    <div className="binary-desc">Patient recorded as an active tobacco smoker.</div>
                    {smokeVal === 1 && <span className="active-check-badge">✓ Recorded Patient State</span>}
                  </div>
                </div>
                <div className="discrete-dataset-notice">
                  ℹ️ <strong>Binary Classification:</strong> Tobacco usage is documented strictly as a binary indicator (0 = Non-Smoker, 1 = Active Smoker). Specific dose metrics (cigarettes per day, pack-years, or years of cessation) are not captured in the dataset.
                </div>
              </div>
            )}

            {/* 6. Alcohol: Discrete Recorded State (No fake drink counts) */}
            {currentId === 'alco' && (
              <div className="discrete-binary-container">
                <div className="binary-cards-grid">
                  <div className={`binary-state-card ${alcoVal === 0 ? 'selected active-green' : 'dimmed'}`}>
                    <div className="binary-icon">💧</div>
                    <div className="binary-title green">Non-Consumer (0)</div>
                    <div className="binary-desc">Patient recorded as a non-consumer of alcohol.</div>
                    {alcoVal === 0 && <span className="active-check-badge">✓ Recorded Patient State</span>}
                  </div>

                  <div className={`binary-state-card ${alcoVal === 1 ? 'selected active-amber' : 'dimmed'}`}>
                    <div className="binary-icon">🍷</div>
                    <div className="binary-title amber">Alcohol Consumer (1)</div>
                    <div className="binary-desc">Patient recorded as an alcohol consumer.</div>
                    {alcoVal === 1 && <span className="active-check-badge">✓ Recorded Patient State</span>}
                  </div>
                </div>
                <div className="discrete-dataset-notice">
                  ℹ️ <strong>Binary Classification:</strong> Alcohol consumption is recorded strictly as a binary indicator (0 = Non-Consumer, 1 = Regular Consumer). Consumption frequency, volume, or standard units per week are not captured in the dataset.
                </div>
              </div>
            )}

            {/* 7. Physical Activity: Discrete Recorded State (No fake minutes/week) */}
            {currentId === 'active' && (
              <div className="discrete-binary-container">
                <div className="binary-cards-grid">
                  <div className={`binary-state-card ${actVal === 1 ? 'selected active-green' : 'dimmed'}`}>
                    <div className="binary-icon">🏃</div>
                    <div className="binary-title green">Regularly Active (1)</div>
                    <div className="binary-desc">Patient engages in regular physical activity.</div>
                    {actVal === 1 && <span className="active-check-badge">✓ Recorded Patient State</span>}
                  </div>

                  <div className={`binary-state-card ${actVal === 0 ? 'selected active-amber' : 'dimmed'}`}>
                    <div className="binary-icon">🛋️</div>
                    <div className="binary-title amber">Sedentary / Inactive (0)</div>
                    <div className="binary-desc">Patient does not report regular physical activity.</div>
                    {actVal === 0 && <span className="active-check-badge">✓ Recorded Patient State</span>}
                  </div>
                </div>
                <div className="discrete-dataset-notice">
                  ℹ️ <strong>Binary Classification:</strong> Physical activity is recorded as a binary clinical state (1 = Active, 0 = Inactive). Specific workout duration, minutes per week, or MET-hours are not recorded in the dataset.
                </div>
              </div>
            )}
          </div>

          {/* Plain-Language Clinical Explanation */}
          <div className="indicator-explanation-card">
            <div className="expl-card-title">
              <span className="expl-icon">💡</span>
              <span>Clinical Context & Significance</span>
            </div>
            <p className="expl-text">{meta.explanation}</p>
          </div>

          {/* SHAP Feature Contribution Readout */}
          <div className="indicator-shap-card">
            <div className="shap-card-header">
              <div>
                <span className="shap-header-title">Model Feature Contribution (SHAP Analysis)</span>
                <span className="shap-header-subtitle">Estimated risk association computed by model tree explainer</span>
              </div>
              <span className="shap-method-pill">{result?.explanation?.method || 'SHAP Explainer'}</span>
            </div>

            {shapContributions.length > 0 ? (
              <div className="shap-contrib-rows">
                {shapContributions.map((contrib) => {
                  const isRisk = contrib.contribution > 0;
                  const sign = isRisk ? '+' : '';
                  return (
                    <div key={contrib.feature} className="shap-contrib-item">
                      <div className="shap-feature-meta">
                        <strong className="shap-feature-label">{contrib.label}</strong>
                        <span className="shap-feature-value">
                          Value: {contrib.value}
                        </span>
                      </div>
                      <div className="shap-contrib-bar-wrap">
                        <div className={`shap-mini-bar ${isRisk ? 'red' : 'green'}`} />
                      </div>
                      <div className={`shap-contrib-val ${isRisk ? 'red' : 'green'}`}>
                        {sign}{contrib.contribution.toFixed(4)}
                        <span className="shap-dir-tag">
                          {isRisk ? 'Increases Risk' : 'Lowers Risk'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="shap-no-direct-note">
                <span>Contribution is within the baseline distribution or negligible in the current model decision path for this patient.</span>
              </div>
            )}

            {/* MANDATORY EXPLICIT CAUSATION DISCLAIMER */}
            <div className="shap-causation-disclaimer">
              <span className="disclaimer-badge">Mandatory Notice</span>
              <strong>Model contribution, not clinical causation.</strong>
              <span>
                Feature importance values reflect statistical patterns learned by the machine-learning classifier from the training cohort. They do not imply a direct biological cause-and-effect relationship for this individual patient.
              </span>
            </div>
          </div>

          {/* What-If Simulator Shortcut (Only when indicator can be changed there) */}
          <div className="indicator-whatif-shortcut-card">
            <div className="whatif-shortcut-info">
              <div className="shortcut-title">
                <span>🔄</span>
                <span>Interactive What-If Scenario Exploration</span>
              </div>
              <div className="shortcut-desc">
                {isWhatIfSupported
                  ? `Simulate how modifying ${meta.shortName.toLowerCase()} alongside other modifiable factors affects estimated cardiovascular risk.`
                  : `${meta.name} is fixed in the patient record and not configured as an adjustable factor in the current What-If simulation.`}
              </div>
            </div>
            {isWhatIfSupported ? (
              <button
                type="button"
                className="btn-open-whatif-shortcut"
                onClick={() => {
                  if (onOpenWhatIf) {
                    onOpenWhatIf(currentId);
                  }
                }}
              >
                <span>Simulate in What-If Tool</span>
                <span className="btn-arrow">→</span>
              </button>
            ) : (
              <span className="non-modifiable-tag">Fixed Clinical Parameter</span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="indicator-modal-footer">
          <span className="clinical-guidance-note">
            Clinical Decision Support System • Informational prototype only • Does not substitute for physician diagnosis.
          </span>
          <button
            type="button"
            className="btn-modal-close-action"
            onClick={onClose}
          >
            Close Detail View
          </button>
        </div>
      </div>
    </div>
  );
}
