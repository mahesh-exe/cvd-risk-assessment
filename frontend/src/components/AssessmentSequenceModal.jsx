import React, { useEffect, useState } from 'react';

const STEPS = [
  { id: 1, label: 'RUNNING ASSESSMENT', desc: 'Initializing clinical inference pipeline' },
  { id: 2, label: 'VALIDATING DATA', desc: 'Checking hemodynamic ranges & integrity' },
  { id: 3, label: 'ANALYSING RISK FACTORS', desc: 'Evaluating modifiable & baseline covariates' },
  { id: 4, label: 'GENERATING MODEL PREDICTION', desc: 'Executing deployed ML classifier pipeline' },
  { id: 5, label: 'GENERATING EXPLANATION', desc: 'Computing SHAP feature contributions' },
  { id: 6, label: 'ASSESSMENT READY', desc: 'Synthesizing cardiovascular risk report' }
];

/**
 * Patient Assessment Lifecycle Animation (Requirement 4)
 * Orchestrates a crisp, analytical transition representing the request lifecycle.
 * Visual sequence:
 * RUNNING ASSESSMENT -> VALIDATING DATA -> ANALYSING RISK FACTORS -> GENERATING MODEL PREDICTION -> GENERATING EXPLANATION -> ASSESSMENT READY
 */
export default function AssessmentSequenceModal({ active, onComplete }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrentStepIdx(0);
      return;
    }

    // Step pacing: ~200ms per step, total ~1.2s
    const stepDuration = 220;
    const interval = setInterval(() => {
      setCurrentStepIdx(prev => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 240);
          return prev;
        }
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [active, onComplete]);

  if (!active) return null;

  const currentStep = STEPS[currentStepIdx];
  const progressPct = ((currentStepIdx + 1) / STEPS.length) * 100;

  return (
    <div className="assessment-seq-overlay" role="dialog" aria-modal="true">
      <div className="assessment-seq-card animate-seq-in">
        {/* Top Clinical Header */}
        <div className="seq-top-header">
          <div className="seq-cardiac-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="seq-heart-svg">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              <path d="M3.5 12h3l2-4 3 8 2-5 1.5 2 2.5-1" />
            </svg>
          </div>
          <div>
            <div className="seq-title">CardioRisk Analytical Engine</div>
            <div className="seq-subtitle">Clinical Decision Support Processing</div>
          </div>
        </div>

        {/* Dynamic Step Readout (PSG Login-inspired high quality motion) */}
        <div className="seq-stage-box">
          <div className="seq-stage-counter">
            PHASE {currentStepIdx + 1} OF {STEPS.length}
          </div>
          <div className="seq-stage-label" key={currentStep.label}>
            {currentStep.label}
          </div>
          <div className="seq-stage-desc" key={currentStep.desc}>
            {currentStep.desc}
          </div>
        </div>

        {/* Fluid Progress Line */}
        <div className="seq-progress-track">
          <div
            className="seq-progress-fill"
            style={{ width: `${progressPct}%`, transition: 'width 0.22s ease-out' }}
          />
        </div>

        {/* Stepper Dots */}
        <div className="seq-dots-row">
          {STEPS.map((s, idx) => {
            const isDone = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div
                key={s.id}
                className={`seq-dot-item ${isDone ? 'done' : ''} ${isCurrent ? 'active' : ''}`}
                title={s.label}
              >
                <div className="seq-dot-circle" />
                <span className="seq-dot-num">{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
