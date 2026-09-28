import React, { useEffect } from 'react';

/**
 * Clinical Guidelines & Protocols Modal
 */
export default function ClinicalGuidelinesModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="clinical-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="guidelines-modal-card animate-modal-scale" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="patient-modal-header">
          <div>
            <div className="patient-modal-title">
              <span className="patient-title-icon">📑</span>
              <span>Clinical Practice Guidelines & Evidence Base</span>
            </div>
            <div className="patient-modal-sub">
              Cardiovascular risk stratification and multi-factor intervention guidelines
            </div>
          </div>
          <button className="whatif-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {/* Content */}
        <div className="guidelines-body-stack">
          {/* ACC / AHA Card */}
          <div className="guideline-card blue">
            <div className="card-top-title">ACC / AHA Guidelines on Cardiovascular Prevention</div>
            <p className="card-desc">
              Clinical decision support protocols integrate primary modifiable risk factors (Blood Pressure, Lipids, Glycemia, Tobacco, BMI) alongside age and gender baseline demographics to estimate global atherosclerotic cardiovascular disease probability.
            </p>
          </div>

          {/* 3 Risk Tiers */}
          <div className="guideline-tiers-row">
            <div className="tier-card green">
              <div className="tier-title">Low Risk (&lt; 35%)</div>
              <p className="tier-text">
                Lifestyle optimization, Mediterranean or DASH dietary pattern, ≥150 min/wk moderate aerobic activity, routine biennial assessment.
              </p>
            </div>
            <div className="tier-card amber">
              <div className="tier-title">Moderate Risk (35% – 65%)</div>
              <p className="tier-text">
                Targeted therapeutic lifestyle changes (strict sodium restriction, weight management), smoking cessation, reassessment in 3–6 months.
              </p>
            </div>
            <div className="tier-card red">
              <div className="tier-title">High Risk (&gt; 65%)</div>
              <p className="tier-text">
                Immediate physician evaluation, guideline-directed pharmacotherapy (statins, antihypertensives), active clinical surveillance.
              </p>
            </div>
          </div>

          {/* Research Prototype Note */}
          <div className="guideline-prototype-notice">
            <strong>Clinical Research Prototype Notice:</strong> CardioRisk Analytics is developed as an interactive clinical analytics research workstation. Algorithmic outputs are non-promissory risk probability estimations and do not substitute for comprehensive physician diagnostic evaluation.
          </div>
        </div>

        <div className="patient-modal-footer">
          <button className="btn-whatif-cancel" onClick={onClose}>Close Guidelines</button>
        </div>
      </div>
    </div>
  );
}
