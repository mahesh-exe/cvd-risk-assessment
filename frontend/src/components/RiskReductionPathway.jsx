import React from 'react';

/**
 * Clinical Risk Reduction Pathway Component
 *
 * Implements the designated vertical clinical decision support sequence:
 * CURRENT RISK (score + category)
 *        ↓
 * TARGET SCENARIO (projected score + delta)
 *        ↓
 * RISK REDUCTION WINDOW (clinician recommended interval)
 *
 * WHY?
 * [Identified modifiable clinical contributors]
 *
 * ACTION
 * [Actionable guidance & scheduled reassessment]
 */
export default function RiskReductionPathway({
  currentScore = 53.4,
  currentCategory = 'Moderate',
  targetScore = 38.2,
  targetCategory = 'Moderate',
  windowText = '≈ 1–3 MONTHS',
  whyText = 'Blood pressure and physical activity are currently important modifiable contributors.',
  actionText = 'Begin risk-factor improvement now and reassess within the suggested window.',
  diffPP = null,
  onOpenWhatIf = null,
  isCard = false
}) {
  const calculatedDiff = diffPP !== null ? diffPP : (targetScore - currentScore);
  const isReduction = calculatedDiff <= 0;

  const currentCatLower = (currentCategory || 'moderate').toLowerCase();
  const targetCatLower = (targetCategory || 'moderate').toLowerCase();

  return (
    <div className={`clinical-pathway-container ${isCard ? 'as-card' : ''}`}>
      {/* ── 3-STEP VERTICAL FLOW SEQUENCE ── */}
      <div className="pathway-vertical-cascade">
        {/* Step 1: CURRENT RISK */}
        <div className="pathway-vstep-card step-current">
          <div className="vstep-eyebrow">CURRENT RISK</div>
          <div className="vstep-metric-row">
            <span className="vstep-score-num">{Number(currentScore).toFixed(1)}%</span>
            <span className={`vstep-category-pill ${currentCatLower}`}>
              {currentCategory.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Down Arrow 1 */}
        <div className="pathway-vstep-arrow" aria-hidden="true">
          <div className="arrow-line-vertical" />
          <div className="arrow-head-icon">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.8">
              <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Step 2: TARGET SCENARIO */}
        <div className="pathway-vstep-card step-target">
          <div className="vstep-eyebrow">TARGET SCENARIO</div>
          <div className="vstep-metric-row">
            <span className="vstep-score-num target-green">{Number(targetScore).toFixed(1)}%</span>
            {calculatedDiff !== 0 && (
              <span className={`vstep-delta-badge ${isReduction ? 'reduction' : 'increase'}`}>
                {isReduction ? calculatedDiff.toFixed(1) : `+${calculatedDiff.toFixed(1)}`}%
              </span>
            )}
          </div>
        </div>

        {/* Down Arrow 2 */}
        <div className="pathway-vstep-arrow" aria-hidden="true">
          <div className="arrow-line-vertical" />
          <div className="arrow-head-icon">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.8">
              <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Step 3: RISK REDUCTION WINDOW */}
        <div className="pathway-vstep-card step-window">
          <div className="vstep-eyebrow">RISK REDUCTION WINDOW</div>
          <div className="vstep-window-content">
            <span className="vstep-window-badge">{windowText}</span>
          </div>
        </div>
      </div>

      {/* ── CLINICAL REASONING: WHY? ── */}
      <div className="pathway-reasoning-card card-why">
        <div className="reasoning-header">
          <span className="reasoning-badge-why">WHY?</span>
        </div>
        <p className="reasoning-text-content">
          {whyText}
        </p>
      </div>

      {/* ── CLINICAL REASONING: ACTION ── */}
      <div className="pathway-reasoning-card card-action">
        <div className="reasoning-header">
          <span className="reasoning-badge-action">ACTION</span>
        </div>
        <p className="reasoning-text-content">
          {actionText}
        </p>
      </div>

      {/* Optional action button if rendered on dashboard */}
      {onOpenWhatIf && (
        <button
          type="button"
          className="btn-pathway-open-simulator"
          onClick={onOpenWhatIf}
        >
          <span>Open Interactive What-If Simulator</span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
