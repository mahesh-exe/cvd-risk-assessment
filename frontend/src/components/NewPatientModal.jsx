import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

const PRESETS = [
  {
    label: 'Standard Demographic',
    desc: 'Average risk profile (Male 50y, BP 128/82, Normative Labs)',
    data: {
      age_years: 50,
      gender: 2,
      height: 172,
      weight: 76,
      ap_hi: 128,
      ap_lo: 82,
      cholesterol: 1,
      gluc: 1,
      smoke: 0,
      alco: 0,
      active: 1
    }
  },
  {
    label: 'Hypertensive & Dyslipidemic',
    desc: 'Stage 2 Hypertension + High Cholesterol (Female 58y, BP 155/96)',
    data: {
      age_years: 58,
      gender: 1,
      height: 162,
      weight: 84,
      ap_hi: 155,
      ap_lo: 96,
      cholesterol: 3,
      gluc: 2,
      smoke: 1,
      alco: 0,
      active: 0
    }
  },
  {
    label: 'Cardiometabolic Risk',
    desc: 'Diabetic & Obese Smoker (Male 62y, BP 162/100, High Glucose)',
    data: {
      age_years: 62,
      gender: 2,
      height: 175,
      weight: 96,
      ap_hi: 162,
      ap_lo: 100,
      cholesterol: 3,
      gluc: 3,
      smoke: 1,
      alco: 1,
      active: 0
    }
  }
];

export default function NewPatientModal({
  open,
  onClose,
  onPatientAssessed
}) {
  const [formData, setFormData] = useState({
    patient_id: '',
    age_years: 52,
    gender: 2, // 2: Male, 1: Female
    height: 170,
    weight: 78,
    ap_hi: 142,
    ap_lo: 90,
    cholesterol: 2, // 1: Normal, 2: Above Normal, 3: High
    gluc: 1,        // 1: Normal, 2: Above Normal, 3: High
    smoke: 0,       // 0: No, 1: Yes
    alco: 0,        // 0: No, 1: Yes
    active: 1       // 0: Inactive, 1: Active
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ESC key listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Generate random clinical ID when modal opens if blank
  useEffect(() => {
    if (open) {
      setErrorMessage('');
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setFormData(prev => ({
        ...prev,
        patient_id: prev.patient_id || `P-${randNum}`
      }));
    }
  }, [open]);

  if (!open) return null;

  const bmi = formData.weight && formData.height
    ? (formData.weight / ((formData.height / 100) ** 2))
    : 22.0;

  const bmiClass = bmi >= 30 ? 'Obese' : bmi >= 25 ? 'Overweight' : bmi >= 18.5 ? 'Normal' : 'Underweight';

  const handleChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof prev[field] === 'number' ? Number(val) : val
    }));
  };

  const handleApplyPreset = (presetData) => {
    setFormData(prev => ({
      ...prev,
      ...presetData
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    // Validation
    const cleanPatient = {
      patient_id: formData.patient_id.trim() || `P-${Math.floor(1000 + Math.random() * 9000)}`,
      age_years: Math.max(18, Math.min(100, Number(formData.age_years))),
      gender: Number(formData.gender) === 1 ? 1 : 2,
      height: Math.max(120, Math.min(220, Number(formData.height))),
      weight: Math.max(35, Math.min(220, Number(formData.weight))),
      ap_hi: Math.max(80, Math.min(250, Number(formData.ap_hi))),
      ap_lo: Math.max(40, Math.min(150, Number(formData.ap_lo))),
      cholesterol: Number(formData.cholesterol),
      gluc: Number(formData.gluc),
      smoke: Number(formData.smoke) ? 1 : 0,
      alco: Number(formData.alco) ? 1 : 0,
      active: Number(formData.active) ? 1 : 0
    };

    try {
      // 1. Run actual inference via backend /api/assessment
      const assessRes = await fetch(`${API}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPatient)
      });

      if (!assessRes.ok) {
        throw new Error(`Inference engine error (HTTP ${assessRes.status})`);
      }

      const assessmentResult = await assessRes.json();

      // 2. Also register in backend patients list
      try {
        await fetch(`${API}/api/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPatient)
        });
      } catch (err) {
        // Non-critical if cohort add fails
      }

      // 3. Dispatch to main workstation
      if (onPatientAssessed) {
        onPatientAssessed(cleanPatient, assessmentResult);
      }
      onClose();
    } catch (err) {
      console.error('Failed to run clinical assessment on new patient:', err);
      setErrorMessage(err.message || 'Error executing clinical assessment. Check server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clinical-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="new-patient-modal-card animate-modal-scale" onClick={e => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="new-patient-modal-header">
          <div className="header-icon-title-group">
            <div className="modal-header-badge">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div>
              <div className="new-patient-title">
                <span>New Patient Clinical Intake</span>
                <span className="live-engine-tag">HistGradientBoosting Classifier</span>
              </div>
              <p className="new-patient-subtitle">
                Enter physiological and laboratory measurements to compute model risk, SHAP factors, and biomarker profile.
              </p>
            </div>
          </div>
          <button className="whatif-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {/* Quick Clinical Presets Strip */}
        <div className="presets-banner-strip">
          <span className="presets-label">QUICK CLINICAL PRESETS:</span>
          <div className="presets-buttons-row">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn-preset-chip"
                onClick={() => handleApplyPreset(p.data)}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="modal-error-banner">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="new-patient-form">
          <div className="patient-form-grid">
            {/* ── SECTION 1: DEMOGRAPHICS & ANTHROPOMETRICS ── */}
            <div className="form-column-section">
              <div className="form-section-header">
                <span className="section-step-num">1</span>
                <div>
                  <h4 className="section-title">Demographics & Anthropometrics</h4>
                  <span className="section-sub">Baseline patient physical attributes</span>
                </div>
              </div>

              {/* Patient ID */}
              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Patient Identifier / MRN</span>
                  <span className="field-hint">Auto-generated or custom</span>
                </label>
                <div className="input-with-action">
                  <input
                    type="text"
                    className="form-text-input"
                    value={formData.patient_id}
                    onChange={e => handleChange('patient_id', e.target.value)}
                    placeholder="e.g. P-4821"
                    required
                  />
                  <button
                    type="button"
                    className="btn-input-secondary"
                    onClick={() => handleChange('patient_id', `P-${Math.floor(1000 + Math.random() * 9000)}`)}
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Age & Gender Row */}
              <div className="form-field-row">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Age</span>
                    <span className="field-unit">years</span>
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    className="form-text-input"
                    value={formData.age_years}
                    onChange={e => handleChange('age_years', e.target.value)}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Biological Sex</span>
                  </label>
                  <div className="segmented-selector">
                    <button
                      type="button"
                      className={`seg-btn ${formData.gender === 2 ? 'active' : ''}`}
                      onClick={() => handleChange('gender', 2)}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      className={`seg-btn ${formData.gender === 1 ? 'active' : ''}`}
                      onClick={() => handleChange('gender', 1)}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>

              {/* Height & Weight Row */}
              <div className="form-field-row">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Height</span>
                    <span className="field-unit">cm</span>
                  </label>
                  <input
                    type="number"
                    min="120"
                    max="220"
                    className="form-text-input"
                    value={formData.height}
                    onChange={e => handleChange('height', e.target.value)}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Weight</span>
                    <span className="field-unit">kg</span>
                  </label>
                  <input
                    type="number"
                    min="35"
                    max="220"
                    className="form-text-input"
                    value={formData.weight}
                    onChange={e => handleChange('weight', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Dynamic BMI Indicator Card */}
              <div className="computed-bmi-card">
                <div className="bmi-card-left">
                  <span className="bmi-eyebrow">COMPUTED BODY MASS INDEX</span>
                  <div className="bmi-val-strip">
                    <strong className="bmi-number">{bmi.toFixed(1)}</strong>
                    <span className="bmi-unit">kg/m²</span>
                  </div>
                </div>
                <div className={`bmi-status-tag ${bmiClass.toLowerCase()}`}>
                  {bmiClass.toUpperCase()}
                </div>
              </div>
            </div>

            {/* ── SECTION 2: HEMODYNAMICS & METABOLIC BIOMARKERS ── */}
            <div className="form-column-section">
              <div className="form-section-header">
                <span className="section-step-num">2</span>
                <div>
                  <h4 className="section-title">Hemodynamics & Metabolic Labs</h4>
                  <span className="section-sub">Blood pressure and laboratory indicators</span>
                </div>
              </div>

              {/* Systolic & Diastolic BP */}
              <div className="form-field-row">
                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Systolic BP</span>
                    <span className="field-unit">mmHg</span>
                  </label>
                  <input
                    type="number"
                    min="80"
                    max="250"
                    className="form-text-input bold"
                    value={formData.ap_hi}
                    onChange={e => handleChange('ap_hi', e.target.value)}
                    required
                  />
                  <span className="field-sub-note">{formData.ap_hi >= 140 ? 'Stage 2 HTN' : formData.ap_hi >= 130 ? 'Stage 1 HTN' : formData.ap_hi >= 120 ? 'Elevated' : 'Normal'}</span>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">
                    <span>Diastolic BP</span>
                    <span className="field-unit">mmHg</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="150"
                    className="form-text-input bold"
                    value={formData.ap_lo}
                    onChange={e => handleChange('ap_lo', e.target.value)}
                    required
                  />
                  <span className="field-sub-note">{formData.ap_lo >= 90 ? 'Stage 2 HTN' : formData.ap_lo >= 80 ? 'Stage 1 HTN' : 'Normal'}</span>
                </div>
              </div>

              {/* Total Cholesterol Category */}
              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Total Cholesterol</span>
                  <span className="field-hint">Clinical standard categorical tier</span>
                </label>
                <div className="tri-selector-grid">
                  <button
                    type="button"
                    className={`tri-sel-btn ${formData.cholesterol === 1 ? 'active green' : ''}`}
                    onClick={() => handleChange('cholesterol', 1)}
                  >
                    <span className="tri-level">1 - Normal</span>
                    <span className="tri-desc">&lt; 200 mg/dL</span>
                  </button>
                  <button
                    type="button"
                    className={`tri-sel-btn ${formData.cholesterol === 2 ? 'active amber' : ''}`}
                    onClick={() => handleChange('cholesterol', 2)}
                  >
                    <span className="tri-level">2 - Above Normal</span>
                    <span className="tri-desc">200–239 mg/dL</span>
                  </button>
                  <button
                    type="button"
                    className={`tri-sel-btn ${formData.cholesterol === 3 ? 'active red' : ''}`}
                    onClick={() => handleChange('cholesterol', 3)}
                  >
                    <span className="tri-level">3 - High</span>
                    <span className="tri-desc">≥ 240 mg/dL</span>
                  </button>
                </div>
              </div>

              {/* Fasting Glucose Category */}
              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Fasting Glucose</span>
                  <span className="field-hint">Serum glucose categorization</span>
                </label>
                <div className="tri-selector-grid">
                  <button
                    type="button"
                    className={`tri-sel-btn ${formData.gluc === 1 ? 'active green' : ''}`}
                    onClick={() => handleChange('gluc', 1)}
                  >
                    <span className="tri-level">1 - Normal</span>
                    <span className="tri-desc">&lt; 100 mg/dL</span>
                  </button>
                  <button
                    type="button"
                    className={`tri-sel-btn ${formData.gluc === 2 ? 'active amber' : ''}`}
                    onClick={() => handleChange('gluc', 2)}
                  >
                    <span className="tri-level">2 - Above Normal</span>
                    <span className="tri-desc">100–125 mg/dL</span>
                  </button>
                  <button
                    type="button"
                    className={`tri-sel-btn ${formData.gluc === 3 ? 'active red' : ''}`}
                    onClick={() => handleChange('gluc', 3)}
                  >
                    <span className="tri-level">3 - High</span>
                    <span className="tri-desc">≥ 126 mg/dL</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── SECTION 3: LIFESTYLE & BEHAVIORAL COVARIATES ── */}
            <div className="form-column-section">
              <div className="form-section-header">
                <span className="section-step-num">3</span>
                <div>
                  <h4 className="section-title">Modifiable Behavioral Factors</h4>
                  <span className="section-sub">Habitual risk and lifestyle indicators</span>
                </div>
              </div>

              {/* Smoking Status */}
              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Tobacco Smoking</span>
                  <span className="field-hint">Active or recent cigarette use</span>
                </label>
                <div className="lifestyle-duo-buttons">
                  <button
                    type="button"
                    className={`lifestyle-btn ${formData.smoke === 0 ? 'active green' : ''}`}
                    onClick={() => handleChange('smoke', 0)}
                  >
                    <span className="ls-icon">🌿</span>
                    <div className="ls-text">
                      <strong className="ls-title">Non-Smoker</strong>
                      <span className="ls-sub">No tobacco consumption</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`lifestyle-btn ${formData.smoke === 1 ? 'active red' : ''}`}
                    onClick={() => handleChange('smoke', 1)}
                  >
                    <span className="ls-icon">🚬</span>
                    <div className="ls-text">
                      <strong className="ls-title">Active Smoker</strong>
                      <span className="ls-sub">Regular tobacco use</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Alcohol Consumption */}
              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Alcohol Intake</span>
                  <span className="field-hint">Habitual alcohol consumption</span>
                </label>
                <div className="lifestyle-duo-buttons">
                  <button
                    type="button"
                    className={`lifestyle-btn ${formData.alco === 0 ? 'active green' : ''}`}
                    onClick={() => handleChange('alco', 0)}
                  >
                    <span className="ls-icon">💧</span>
                    <div className="ls-text">
                      <strong className="ls-title">Non-Consumer</strong>
                      <span className="ls-sub">Minimal / no alcohol</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`lifestyle-btn ${formData.alco === 1 ? 'active amber' : ''}`}
                    onClick={() => handleChange('alco', 1)}
                  >
                    <span className="ls-icon">🍷</span>
                    <div className="ls-text">
                      <strong className="ls-title">Regular Consumer</strong>
                      <span className="ls-sub">Regular alcohol intake</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Physical Activity */}
              <div className="form-field-group">
                <label className="form-field-label">
                  <span>Physical Activity</span>
                  <span className="field-hint">≥150 min moderate exercise weekly</span>
                </label>
                <div className="lifestyle-duo-buttons">
                  <button
                    type="button"
                    className={`lifestyle-btn ${formData.active === 1 ? 'active green' : ''}`}
                    onClick={() => handleChange('active', 1)}
                  >
                    <span className="ls-icon">🏃</span>
                    <div className="ls-text">
                      <strong className="ls-title">Regularly Active</strong>
                      <span className="ls-sub">Meets activity thresholds</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`lifestyle-btn ${formData.active === 0 ? 'active amber' : ''}`}
                    onClick={() => handleChange('active', 0)}
                  >
                    <span className="ls-icon">🛋️</span>
                    <div className="ls-text">
                      <strong className="ls-title">Sedentary</strong>
                      <span className="ls-sub">Insufficient regular activity</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="new-patient-modal-footer">
            <div className="footer-meta-text">
              <span>All 11 factors are passed directly to the deployed HistGradientBoosting pipeline. No fabricated scores.</span>
            </div>
            <div className="footer-actions-group">
              <button
                type="button"
                className="btn-whatif-cancel"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-run-assessment-primary"
                disabled={isSubmitting}
                id="btn-modal-run-assessment"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" className="btn-icon">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>{isSubmitting ? 'Evaluating Machine Learning Pipeline...' : 'Run Assessment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
