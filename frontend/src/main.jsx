import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

import Header from './components/Header.jsx';
import AuthenticClinicalGauge from './components/AuthenticClinicalGauge.jsx';
import RadialCardiovascularProfile from './components/RadialCardiovascularProfile.jsx';
import ShapDivergingChart from './components/ShapDivergingChart.jsx';
import HealthBulletIndicators from './components/HealthBulletIndicators.jsx';
import BenchmarkDumbbellChart from './components/BenchmarkDumbbellChart.jsx';
import LiveTelemetryStream from './components/LiveTelemetryStream.jsx';
import WhatIfSimulatorModal from './components/WhatIfSimulatorModal.jsx';
import ModelAnalyticsModal from './components/ModelAnalyticsModal.jsx';
import AssessmentSequenceModal from './components/AssessmentSequenceModal.jsx';
import PatientRecordModal from './components/PatientRecordModal.jsx';
import ClinicalGuidelinesModal from './components/ClinicalGuidelinesModal.jsx';
import NewPatientModal from './components/NewPatientModal.jsx';
import HealthIndicatorDetailModal from './components/HealthIndicatorDetailModal.jsx';

const API = 'http://localhost:8000';

const DEFAULT_PATIENT = {
  patient_id: 'DEMO-001',
  age_years: 54,
  gender: 2, // 2: Male, 1: Female
  height: 168,
  weight: 78,
  ap_hi: 145,
  ap_lo: 92,
  cholesterol: 2,
  gluc: 1,
  smoke: 0,
  alco: 0,
  active: 1
};

export default function App() {
  const [patientsList, setPatientsList] = useState([DEFAULT_PATIENT]);
  const [patient, setPatient] = useState(DEFAULT_PATIENT);
  const [result, setResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isSwitchingPatient, setIsSwitchingPatient] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [assessedTime, setAssessedTime] = useState('13:52:42');
  const [assessedDate, setAssessedDate] = useState('10 Apr 2025');

  // Cross-visualization factor synchronization (Requirements 8, 26)
  const [activeHoverFactor, setActiveHoverFactor] = useState(null);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);

  // Modals state
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [guidelinesModalOpen, setGuidelinesModalOpen] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  // Staged assessment result buffer
  const pendingResultRef = useRef(null);

  // Fetch initial cohort & initial assessment
  useEffect(() => {
    fetch(`${API}/api/patients`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setPatientsList(data);
          setPatient(data[0]);
          runDirectAssessment(data[0]);
        } else {
          runDirectAssessment(DEFAULT_PATIENT);
        }
      })
      .catch(() => {
        runDirectAssessment(DEFAULT_PATIENT);
      });

    fetch(`${API}/api/models`)
      .then(r => r.json())
      .then(setModelInfo)
      .catch(() => {});
  }, []);

  // Direct assessment without full animation modal (for initial load / patient switch)
  const runDirectAssessment = async (p) => {
    try {
      const res = await fetch(`${API}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        const now = new Date();
        setAssessedTime(now.toLocaleTimeString('en-GB', { hour12: false }));
        setAssessedDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
      }
    } catch (err) {
      console.error('Direct assessment error:', err);
    }
  };

  // Requirement 4 & 25: User-initiated Assessment with Analytical Sequence
  const handleRunAssessmentClick = async () => {
    setIsAssessing(true);

    try {
      const res = await fetch(`${API}/api/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      if (res.ok) {
        const data = await res.json();
        pendingResultRef.current = data;
      }
    } catch (err) {
      console.error('Assessment API error:', err);
    }
  };

  const handleAssessmentSequenceComplete = () => {
    setIsAssessing(false);
    if (pendingResultRef.current) {
      setResult(pendingResultRef.current);
      pendingResultRef.current = null;
      const now = new Date();
      setAssessedTime(now.toLocaleTimeString('en-GB', { hour12: false }));
      setAssessedDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    }
  };

  const handleFieldChange = (field, val) => {
    setPatient(prev => ({ ...prev, [field]: Number(val) }));
  };

  // Requirement 27: Controlled patient transition
  const handleSelectPatient = (p) => {
    setIsSwitchingPatient(true);
    setTimeout(() => {
      setPatient(p);
      runDirectAssessment(p);
      setTimeout(() => {
        setIsSwitchingPatient(false);
      }, 180);
    }, 120);
  };

  const handleApplyWhatIfScenario = (simulatedPatient) => {
    setPatient(simulatedPatient);
    runDirectAssessment(simulatedPatient);
  };

  const handleNewPatientAssessed = (newPatient, assessmentData) => {
    setPatientsList(prev => [newPatient, ...prev.filter(p => p.patient_id !== newPatient.patient_id)]);
    setPatient(newPatient);
    setResult(assessmentData);
    const now = new Date();
    setAssessedTime(now.toLocaleTimeString('en-GB', { hour12: false }));
    setAssessedDate(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  };

  return (
    <div className="app-workstation-shell">
      {/* ── TOP PRISTINE CLINICAL HEADER ── */}
      <Header
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        patient={patient}
        patientsList={patientsList}
        onSelectPatient={handleSelectPatient}
        assessedTime={assessedTime}
        assessedDate={assessedDate}
        onOpenPatientModal={() => setPatientModalOpen(true)}
        onOpenAnalyticsModal={() => setModelModalOpen(true)}
        onOpenGuidelinesModal={() => setGuidelinesModalOpen(true)}
        onOpenNewPatientModal={() => setNewPatientOpen(true)}
      />

      {/* ── SINGLE-SCREEN CLINICAL ANALYTICAL WORKSPACE (ZERO SCROLL) ── */}
      <main className={`clinical-analytics-workspace ${isSwitchingPatient ? 'patient-transitioning' : ''}`} role="main">
        {/* ════ LEFT COLUMN: PATIENT PROFILE & LARGE VISUAL PROFILE (Requirements 7, 8, 9, 26) ════ */}
        <section className="workstation-column col-left" aria-label="Patient Profile and Clinical Controls">
          <div className="clinical-card-panel panel-patient">
            {/* Header with Patient Selector */}
            <div className="panel-header-bar">
              <div className="panel-title-group">
                <span className="panel-main-title">Patient Profile</span>
                <span className="panel-sub-title">Demographic & Intake State</span>
              </div>
              <div className="panel-header-controls-group">
                <select
                  className="patient-quick-dropdown"
                  value={patient.patient_id}
                  onChange={e => {
                    const p = patientsList.find(item => item.patient_id === e.target.value);
                    if (p) handleSelectPatient(p);
                  }}
                >
                  {patientsList.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>
                      Patient {p.patient_id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-quick-new-patient"
                  onClick={() => setNewPatientOpen(true)}
                  id="btn-quick-new-patient"
                  title="Add new patient record and run clinical assessment"
                >
                  + New
                </button>
              </div>
            </div>

            {/* Major Visual Anchor: Segmented Radial Cardiovascular Health Profile (Requirements 7, 8, 9) */}
            <div className="panel-radial-profile-section">
              <RadialCardiovascularProfile
                patient={patient}
                activeHoverFactor={activeHoverFactor}
                onHoverFactor={setActiveHoverFactor}
                selectedFactor={selectedFactor}
                onSelectFactor={setSelectedFactor}
              />
            </div>

            {/* Quick Modifiable Inputs Grid - Perfectly Aligned 6-Parameter System */}
            <div className="panel-inputs-section">
              <div className="section-mini-eyebrow">
                <span>CLINICAL PARAMETERS</span>
                <span className="eyebrow-hint">Editable Intake Values</span>
              </div>

              <div className="quick-inputs-grid">
                {/* 1. Systolic BP */}
                <div className={`quick-input-item ${activeHoverFactor === 'bp' ? 'cross-highlighted' : ''}`}>
                  <div className="input-label-row">
                    <span className="input-field-name">Systolic BP</span>
                    <span className="input-unit-tag">mmHg</span>
                  </div>
                  <input
                    type="number"
                    value={patient.ap_hi}
                    onChange={e => handleFieldChange('ap_hi', e.target.value)}
                    title="Systolic Blood Pressure (mmHg)"
                  />
                </div>

                {/* 2. Diastolic BP */}
                <div className={`quick-input-item ${activeHoverFactor === 'bp' ? 'cross-highlighted' : ''}`}>
                  <div className="input-label-row">
                    <span className="input-field-name">Diastolic BP</span>
                    <span className="input-unit-tag">mmHg</span>
                  </div>
                  <input
                    type="number"
                    value={patient.ap_lo}
                    onChange={e => handleFieldChange('ap_lo', e.target.value)}
                    title="Diastolic Blood Pressure (mmHg)"
                  />
                </div>

                {/* 3. Weight */}
                <div className={`quick-input-item ${activeHoverFactor === 'bmi' ? 'cross-highlighted' : ''}`}>
                  <div className="input-label-row">
                    <span className="input-field-name">Weight</span>
                    <span className="input-unit-tag">kg</span>
                  </div>
                  <input
                    type="number"
                    value={patient.weight}
                    onChange={e => handleFieldChange('weight', e.target.value)}
                    title="Patient Weight (kg)"
                  />
                </div>

                {/* 4. Height */}
                <div className={`quick-input-item ${activeHoverFactor === 'bmi' ? 'cross-highlighted' : ''}`}>
                  <div className="input-label-row">
                    <span className="input-field-name">Height</span>
                    <span className="input-unit-tag">cm</span>
                  </div>
                  <input
                    type="number"
                    value={patient.height}
                    onChange={e => handleFieldChange('height', e.target.value)}
                    title="Patient Height (cm)"
                  />
                </div>

                {/* 5. Cholesterol */}
                <div className={`quick-input-item ${activeHoverFactor === 'chol' ? 'cross-highlighted' : ''}`}>
                  <div className="input-label-row">
                    <span className="input-field-name">Cholesterol</span>
                    <span className="input-unit-tag">Total</span>
                  </div>
                  <select
                    value={patient.cholesterol}
                    onChange={e => handleFieldChange('cholesterol', e.target.value)}
                    title="Total Cholesterol Category"
                  >
                    <option value="1">1 - Normal</option>
                    <option value="2">2 - Above</option>
                    <option value="3">3 - High</option>
                  </select>
                </div>

                {/* 6. Fasting Glucose */}
                <div className={`quick-input-item ${activeHoverFactor === 'gluc' ? 'cross-highlighted' : ''}`}>
                  <div className="input-label-row">
                    <span className="input-field-name">Glucose</span>
                    <span className="input-unit-tag">Fasting</span>
                  </div>
                  <select
                    value={patient.gluc}
                    onChange={e => handleFieldChange('gluc', e.target.value)}
                    title="Fasting Glucose Category"
                  >
                    <option value="1">1 - Normal</option>
                    <option value="2">2 - Above</option>
                    <option value="3">3 - High</option>
                  </select>
                </div>
              </div>

              {/* Lifestyle Interactive Status Pills */}
              <div className="lifestyle-section-block">
                <div className="lifestyle-mini-label">LIFESTYLE FACTORS</div>
                <div className="lifestyle-pills-row">
                  <button
                    type="button"
                    className={`lifestyle-pill-toggle ${patient.smoke ? 'active red' : ''} ${activeHoverFactor === 'smoke' ? 'cross-highlighted' : ''}`}
                    onClick={() => handleFieldChange('smoke', patient.smoke ? 0 : 1)}
                    title="Toggle smoking status"
                  >
                    <span className="pill-icon">🚬</span>
                    <span className="pill-txt">{patient.smoke ? 'Smoker' : 'Non-Smoker'}</span>
                  </button>

                  <button
                    type="button"
                    className={`lifestyle-pill-toggle ${patient.alco ? 'active amber' : ''} ${activeHoverFactor === 'alco' ? 'cross-highlighted' : ''}`}
                    onClick={() => handleFieldChange('alco', patient.alco ? 0 : 1)}
                    title="Toggle alcohol consumption"
                  >
                    <span className="pill-icon">🍷</span>
                    <span className="pill-txt">{patient.alco ? 'Alcohol: Yes' : 'Alcohol: No'}</span>
                  </button>

                  <button
                    type="button"
                    className={`lifestyle-pill-toggle ${patient.active ? 'active green' : ''} ${activeHoverFactor === 'active' ? 'cross-highlighted' : ''}`}
                    onClick={() => handleFieldChange('active', patient.active ? 0 : 1)}
                    title="Toggle physical activity"
                  >
                    <span className="pill-icon">🏃</span>
                    <span className="pill-txt">{patient.active ? 'Active' : 'Sedentary'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Assessment Trigger Action Bar */}
            <div className="panel-actions-section">
              <button
                className="btn-run-clinical-assessment"
                onClick={handleRunAssessmentClick}
                disabled={isAssessing}
                id="btn-run-assessment"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" className="btn-icon">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>{isAssessing ? 'Analysing Patient Data...' : 'Run Assessment'}</span>
              </button>

              <button
                className="btn-reset-clinical"
                onClick={() => {
                  setPatient({ ...DEFAULT_PATIENT });
                  runDirectAssessment(DEFAULT_PATIENT);
                }}
              >
                Reset to Baseline
              </button>
            </div>
          </div>
        </section>

        {/* ════ CENTER COLUMN: RISK GAUGE, SHAP DIVERGING, WHO POPULATION BENCHMARK ════ */}
        <section className="workstation-column col-center" aria-label="Risk Prediction and Explainability">
          {/* Top: Estimated Cardiovascular Risk Card */}
          <div className="clinical-card-panel panel-risk-gauge">
            <div className="panel-header-bar">
              <div className="panel-title-group">
                <span className="panel-main-title">Estimated Cardiovascular Risk</span>
                <span className="panel-sub-title">Supervised Machine Learning Inference</span>
              </div>
            </div>

            {/* Gauge centred, action buttons directly below */}
            <div className="risk-gauge-centered-layout">
              <div className="gauge-viewport-box">
                <AuthenticClinicalGauge
                  prediction={result?.prediction}
                  isAssessing={isAssessing}
                />
              </div>

              {/* Action buttons sit directly beneath the gauge */}
              <div className="gauge-action-buttons-row">
                <button
                  className="btn-action-tool"
                  onClick={() => setWhatIfOpen(true)}
                  id="btn-whatif-trigger"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                  <span>What-If Simulator</span>
                </button>

                <button
                  className="btn-action-tool secondary"
                  onClick={() => setModelModalOpen(true)}
                  id="btn-model-trigger"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  </svg>
                  <span>Model Validation</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Split: SHAP Diverging + WHO Population Reference */}
          <div className="center-split-row">
            {/* Left: SHAP Diverging Contribution Visualization (Requirements 6, 11, 12, 26) */}
            <div className="clinical-card-panel panel-shap">
              <div className="panel-header-bar compact">
                <div className="panel-title-group">
                  <span className="panel-main-title">Why is the Risk Elevated?</span>
                  <span className="panel-sub-title">SHAP Factor Contribution Analysis</span>
                </div>
              </div>
              <div className="panel-inner-body">
                <ShapDivergingChart
                  explanation={result?.explanation}
                  activeHoverFactor={activeHoverFactor}
                  onHoverFactor={setActiveHoverFactor}
                />
              </div>
            </div>

            {/* Right: WHO Population Reference Dumbbell Visualization (Requirements 13, 14, 15) */}
            <div className="clinical-card-panel panel-benchmark">
              <div className="panel-header-bar compact">
                <div className="panel-title-group">
                  <span className="panel-main-title">WHO Population Reference</span>
                  <span className="panel-sub-title">Global Health Observatory (GHO) Telemetry</span>
                </div>
              </div>
              <div className="panel-inner-body">
                <BenchmarkDumbbellChart patient={patient} />
              </div>
            </div>
          </div>
        </section>

        {/* ════ RIGHT COLUMN: HEALTH INDICATORS & LIVE TELEMETRY ════ */}
        <section className="workstation-column col-right" aria-label="Health Indicators and Live Telemetry">
          {/* Top: Compact Health Bullet Indicators (Requirements 8, 23, 26) */}
          <div className="clinical-card-panel panel-bullet-indicators">
            <div className="panel-header-bar compact">
              <div className="panel-title-group">
                <span className="panel-main-title">Health Indicators</span>
                <span className="panel-sub-title">Clinical Range & Threshold Charts</span>
              </div>
              <span className="panel-badge-pill">7 Indicators</span>
            </div>
            <div className="panel-inner-body bullet-body">
              <HealthBulletIndicators
                patient={patient}
                activeHoverFactor={activeHoverFactor}
                onHoverFactor={setActiveHoverFactor}
                onSelectIndicator={(factorId) => setSelectedIndicator(factorId)}
              />
            </div>
          </div>

          {/* Bottom: Simulated Live Telemetry (Requirements 10, 24, 34 - Isolated WebSocket) */}
          <div className="clinical-card-panel panel-telemetry">
            <LiveTelemetryStream
              patientId={patient.patient_id}
            />
          </div>
        </section>
      </main>

      {/* ── BOTTOM ASSESSMENT SUMMARY BAR ── */}
      <footer className="workstation-bottom-bar" role="contentinfo">
        <div className="bottom-summary-left">
          <div className="summary-clipboard-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </div>
          <div className="summary-title-col">
            <span className="summary-main-lbl">Latest Assessment Summary</span>
            <span className="summary-sub-lbl">Patient {patient.patient_id} • Cohort Active</span>
          </div>

          <div className="summary-metrics-strip">
            <div className="summary-stat-cell">
              <span className="stat-label">Estimated Risk</span>
              <strong className={`stat-val ${result?.prediction?.risk_score >= 65 ? 'red' : result?.prediction?.risk_score >= 35 ? 'amber' : 'green'}`}>
                {result?.prediction?.risk_score != null ? `${result.prediction.risk_score.toFixed(1)}%` : '82.8%'}
              </strong>
            </div>
            <div className="summary-stat-cell">
              <span className="stat-label">Risk Category</span>
              <strong className={`stat-val ${result?.prediction?.risk_category === 'High' ? 'red' : result?.prediction?.risk_category === 'Moderate' ? 'amber' : 'green'}`}>
                {result?.prediction?.risk_category ?? 'High'}
              </strong>
            </div>
            <div className="summary-stat-cell">
              <span className="stat-label">Assessment Status</span>
              <span className="stat-val green">Complete</span>
            </div>
            <div className="summary-stat-cell">
              <span className="stat-label">Assessed At</span>
              <span className="stat-time-val">{assessedTime} • {assessedDate}</span>
            </div>
          </div>
        </div>

        <div className="bottom-summary-right">
          <div className="summary-motto-pulse">
            <svg viewBox="0 0 48 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="0,8 12,8 16,2 20,14 24,5 28,10 32,8 48,8" />
            </svg>
          </div>
          <span className="summary-motto-text">
            CardioRisk Analytics • Intelligent Clinical Decision Support
          </span>
        </div>
      </footer>

      {/* ── MODALS ── */}
      {/* 1. What-If Risk Simulator Modal (Requirements 16-21) */}
      <WhatIfSimulatorModal
        open={whatIfOpen}
        onClose={() => setWhatIfOpen(false)}
        patient={patient}
        baseResult={result}
        activeHoverFactor={activeHoverFactor}
        onApplyChanges={handleApplyWhatIfScenario}
      />

      {/* 2. Model Analytics & Validation Modal (Requirements 17 & 18) */}
      <ModelAnalyticsModal
        open={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        modelInfo={modelInfo}
      />

      {/* 3. Patient Record Dossier Modal */}
      <PatientRecordModal
        open={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        patient={patient}
        patientsList={patientsList}
        onSelectPatient={handleSelectPatient}
      />

      {/* 4. Clinical Guidelines Modal */}
      <ClinicalGuidelinesModal
        open={guidelinesModalOpen}
        onClose={() => setGuidelinesModalOpen(false)}
      />

      {/* 5. Patient Assessment Lifecycle Animation Sequence (Requirements 4, 25) */}
      <AssessmentSequenceModal
        active={isAssessing}
        onComplete={handleAssessmentSequenceComplete}
      />

      {/* 6. New Patient Intake & Assessment Modal (Requirement 2) */}
      <NewPatientModal
        open={newPatientOpen}
        onClose={() => setNewPatientOpen(false)}
        onPatientAssessed={handleNewPatientAssessed}
      />

      {/* 7. Health Indicator Detailed Visualization Modal */}
      <HealthIndicatorDetailModal
        indicatorId={selectedIndicator}
        open={Boolean(selectedIndicator)}
        onClose={() => setSelectedIndicator(null)}
        patient={patient}
        result={result}
        onOpenWhatIf={(factorId) => {
          setSelectedIndicator(null);
          setActiveHoverFactor(factorId);
          setWhatIfOpen(true);
        }}
        onSelectIndicator={(factorId) => setSelectedIndicator(factorId)}
      />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
