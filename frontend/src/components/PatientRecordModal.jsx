import React, { useEffect } from 'react';

function calculateBMI(weight, height) {
  if (!weight || !height) return 22.0;
  return weight / ((height / 100) ** 2);
}

/**
 * Patient Record Modal
 * Complete demographic and clinical profile modal with progressive reveal.
 */
export default function PatientRecordModal({ open, onClose, patient, patientsList, onSelectPatient }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const bmi = calculateBMI(patient.weight, patient.height);

  return (
    <div className="clinical-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="patient-modal-card animate-modal-scale" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="patient-modal-header">
          <div>
            <div className="patient-modal-title">
              <span className="patient-title-icon">👤</span>
              <span>Patient Clinical Dossier: {patient.patient_id}</span>
            </div>
            <div className="patient-modal-sub">
              Baseline physiological measurements and longitudinal intake record
            </div>
          </div>
          <button className="whatif-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {/* Patient Switcher Row */}
        <div className="patient-cohort-bar">
          <div className="cohort-select-wrap">
            <span className="cohort-label">Select Patient from Validation Cohort:</span>
            <select
              className="cohort-dropdown"
              value={patient.patient_id}
              onChange={e => {
                const found = patientsList.find(p => p.patient_id === e.target.value);
                if (found) onSelectPatient(found);
              }}
            >
              {patientsList.map(p => (
                <option key={p.patient_id} value={p.patient_id}>
                  Patient {p.patient_id} ({Math.round(p.age_years)}y, {p.gender === 1 ? 'Female' : 'Male'}, BP {p.ap_hi}/{p.ap_lo})
                </option>
              ))}
            </select>
          </div>
          <div className="cohort-badge">Cohort Verified Record</div>
        </div>

        {/* 4 Physiological Tiles */}
        <div className="dossier-tiles-grid">
          <div className="dossier-tile">
            <span className="tile-eyebrow">AGE</span>
            <strong className="tile-val">{Math.round(patient.age_years)} <span className="tile-unit">years</span></strong>
          </div>
          <div className="dossier-tile">
            <span className="tile-eyebrow">SEX</span>
            <strong className="tile-val">{patient.gender === 1 ? 'Female' : 'Male'}</strong>
          </div>
          <div className="dossier-tile">
            <span className="tile-eyebrow">HEIGHT & WEIGHT</span>
            <strong className="tile-val">{patient.height}cm / {patient.weight}kg</strong>
          </div>
          <div className="dossier-tile">
            <span className="tile-eyebrow">BODY MASS INDEX</span>
            <strong className={`tile-val ${bmi >= 25 ? 'amber' : 'green'}`}>{bmi.toFixed(1)} <span className="tile-unit">kg/m²</span></strong>
          </div>
        </div>

        {/* Clinical Parameters Detail Grid */}
        <div className="dossier-details-block">
          <div className="details-block-heading">Intake Measurements & Risk Factors</div>
          <div className="details-parameters-grid">
            <div className="param-item">
              <span className="param-lbl">Blood Pressure:</span>
              <strong className="param-val">{patient.ap_hi} / {patient.ap_lo} mmHg</strong>
            </div>
            <div className="param-item">
              <span className="param-lbl">Total Cholesterol:</span>
              <strong className="param-val">{patient.cholesterol === 1 ? '1 - Normal' : patient.cholesterol === 2 ? '2 - Above Normal' : '3 - High'}</strong>
            </div>
            <div className="param-item">
              <span className="param-lbl">Fasting Glucose:</span>
              <strong className="param-val">{patient.gluc === 1 ? '1 - Normal' : patient.gluc === 2 ? '2 - Above Normal' : '3 - High'}</strong>
            </div>
            <div className="param-item">
              <span className="param-lbl">Smoking Status:</span>
              <strong className={`param-val ${patient.smoke ? 'red' : 'green'}`}>{patient.smoke ? 'Active Smoker' : 'Non-Smoker'}</strong>
            </div>
            <div className="param-item">
              <span className="param-lbl">Alcohol Intake:</span>
              <strong className="param-val">{patient.alco ? 'Regular Consumer' : 'Non-Consumer'}</strong>
            </div>
            <div className="param-item">
              <span className="param-lbl">Physical Activity:</span>
              <strong className={`param-val ${patient.active ? 'green' : 'amber'}`}>{patient.active ? 'Regularly Active' : 'Sedentary'}</strong>
            </div>
          </div>
        </div>

        <div className="patient-modal-footer">
          <button className="btn-whatif-cancel" onClick={onClose}>Close Dossier</button>
        </div>
      </div>
    </div>
  );
}
