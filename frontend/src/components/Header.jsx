import React from 'react';

/**
 * Top Clinical Header Bar
 * Clean, clinical, pristine aesthetic with interactive navigation and live status beacon.
 */
export default function Header({
  activeNav,
  setActiveNav,
  patient,
  patientsList,
  onSelectPatient,
  assessedTime,
  assessedDate,
  onOpenPatientModal,
  onOpenAnalyticsModal,
  onOpenGuidelinesModal,
  onOpenNewPatientModal
}) {
  return (
    <header className="top-clinical-header">
      {/* Brand & Main Nav */}
      <div className="header-brand-group">
        <div className="brand-badge-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="brand-cardio-icon">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            <path d="M3.5 12h3l2-4 3 8 2-5 1.5 2 2.5-1" />
          </svg>
        </div>
        <div className="brand-text-col">
          <span className="brand-title">CardioRisk Analytics</span>
          <span className="brand-subtitle">Intelligent Clinical Decision Support System</span>
        </div>

        {/* Analytical Navigation Pills */}
        <nav className="header-nav-pills" aria-label="Main Navigation">
          <button
            className={`nav-pill-btn ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <span className="pill-dot" />
            <span>Dashboard</span>
          </button>
          <button
            className="nav-pill-btn"
            onClick={onOpenPatientModal}
          >
            <span>Patient Record</span>
          </button>
          <button
            className="nav-pill-btn"
            onClick={onOpenAnalyticsModal}
          >
            <span>Model Validation</span>
          </button>
          <button
            className="nav-pill-btn"
            onClick={onOpenGuidelinesModal}
          >
            <span>Clinical Guidelines</span>
          </button>
        </nav>
      </div>

      {/* Right Side Status & Patient Switcher */}
      <div className="header-status-group">
        {/* Live System Beacon */}
        <div className="system-live-pill" title="Backend service healthy and receiving telemetry">
          <span className="live-pulsing-dot" />
          <div className="live-text-col">
            <span className="live-title">System Online</span>
            <span className="live-sub">Inference Engine v0.2</span>
          </div>
        </div>

        <div className="header-v-divider" />

        {/* Last Assessed Timestamp */}
        <div className="last-assessed-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="calendar-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="assessed-text">
            Assessed: <strong>{assessedTime}</strong> • {assessedDate}
          </span>
        </div>

        <div className="header-v-divider" />

        {/* Quick New Patient Intake Button (Requirement 2) */}
        <button
          className="btn-new-patient-header"
          onClick={onOpenNewPatientModal}
          id="btn-header-new-patient"
          title="Add and clinically assess a new patient record"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Patient</span>
        </button>

        <div className="header-v-divider" />

        {/* Quick Patient Switcher Chip */}
        <div className="patient-active-chip" onClick={onOpenPatientModal} title="Click to view complete patient record">
          <div className="patient-avatar-letter">P</div>
          <span className="patient-id-text">Patient {patient?.patient_id || 'P-1001'}</span>
          <span className="patient-cohort-tag">Cohort</span>
        </div>
      </div>
    </header>
  );
}
