import React, { useState, useMemo } from 'react';

// Factor ID mapping for cross-visualization synchronization
const FEATURE_TO_FACTOR_ID = {
  ap_hi: 'bp',
  ap_lo: 'bp',
  weight: 'bmi',
  bmi: 'bmi',
  cholesterol: 'chol',
  gluc: 'gluc',
  smoke: 'smoke',
  alco: 'alco',
  active: 'active'
};

/**
 * SHAP Diverging Contribution Visualization (Requirements 6, 11, 12, 26)
 * - Zero flickering: React.memo + stable transitions + state-driven widths
 * - Center-zero diverging orientation: LOWER RISK ← 0 → INCREASES RISK
 * - Bars grow strictly outward from the center 0 line
 * - Cross-visualization synchronization: hovers emit factor IDs and respond to activeHoverFactor
 * - Footnote: "Model contribution, not clinical causation."
 */
function ShapDivergingChartComponent({
  explanation,
  activeHoverFactor,
  onHoverFactor
}) {
  const [internalHover, setInternalHover] = useState(null);

  // Fallback clinical features
  const allFactors = useMemo(() => {
    if (explanation) {
      return [...(explanation.modifiable || []), ...(explanation.non_modifiable || [])];
    }
    return [
      { feature: 'ap_hi', label: 'Systolic BP', value: 145, contribution: 1.400, direction: 'risk_increasing' },
      { feature: 'cholesterol', label: 'Cholesterol', value: 2, contribution: 0.133, direction: 'risk_increasing' },
      { feature: 'age_years', label: 'Age', value: 54, contribution: -0.051, direction: 'protective' },
      { feature: 'gluc', label: 'Glucose', value: 1, contribution: 0.050, direction: 'risk_increasing' },
      { feature: 'ap_lo', label: 'Diastolic BP', value: 92, contribution: 0.049, direction: 'risk_increasing' }
    ];
  }, [explanation]);

  // Sort by magnitude and take top 5
  const topFactors = useMemo(() => {
    return [...allFactors]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);
  }, [allFactors]);

  const maxAbs = useMemo(() => {
    return Math.max(...topFactors.map(f => Math.abs(f.contribution)), 0.01);
  }, [topFactors]);

  return (
    <div className="shap-diverging-container">
      {/* Center 0 Legend Header */}
      <div className="shap-diverging-axis-header">
        <div className="shap-axis-half left">
          <span className="shap-axis-arrow">←</span>
          <span className="shap-axis-text">LOWERS RISK</span>
        </div>
        <div className="shap-axis-center-zero">0</div>
        <div className="shap-axis-half right">
          <span className="shap-axis-text">INCREASES RISK</span>
          <span className="shap-axis-arrow">→</span>
        </div>
      </div>

      {/* Diverging Bars Stack */}
      <div className="shap-bars-diverging-list">
        {topFactors.map((factor) => {
          const isRisk = factor.contribution > 0;
          const absVal = Math.abs(factor.contribution);
          const pct = Math.min(100, Math.max(6, Math.round((absVal / maxAbs) * 94)));
          const sign = isRisk ? '+' : '';
          const valStr = `${sign}${factor.contribution.toFixed(3)}`;

          const mappedFactorId = FEATURE_TO_FACTOR_ID[factor.feature];
          const isCrossHighlighted = activeHoverFactor && mappedFactorId === activeHoverFactor;
          const isRowHovered = internalHover?.feature === factor.feature || isCrossHighlighted;

          return (
            <div
              key={factor.feature}
              className={`shap-diverging-row ${isRowHovered ? 'hovered' : ''}`}
              onMouseEnter={() => {
                setInternalHover(factor);
                if (onHoverFactor && mappedFactorId) onHoverFactor(mappedFactorId);
              }}
              onMouseLeave={() => {
                setInternalHover(null);
                if (onHoverFactor) onHoverFactor(null);
              }}
            >
              {/* Feature Label Left */}
              <div className="shap-row-label" title={factor.label}>
                <span className="shap-label-text">{factor.label}</span>
                {factor.value != null && (
                  <span className="shap-label-val-hint">
                    {factor.value}{factor.feature === 'ap_hi' || factor.feature === 'ap_lo' ? ' mmHg' : ''}
                  </span>
                )}
              </div>

              {/* Bilateral Diverging Track (Grows from center line) */}
              <div className="shap-bilateral-track">
                {/* Left Track (Protective / Lowers Risk) */}
                <div className="shap-half-track left">
                  {!isRisk && (
                    <div
                      className="shap-diverging-bar-fill green"
                      style={{
                        width: `${pct}%`,
                        transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
                        boxShadow: isRowHovered ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
                      }}
                    />
                  )}
                </div>

                {/* Fixed Center 0 Line */}
                <div className="shap-zero-divider" />

                {/* Right Track (Increases Risk) */}
                <div className="shap-half-track right">
                  {isRisk && (
                    <div
                      className="shap-diverging-bar-fill red"
                      style={{
                        width: `${pct}%`,
                        transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
                        boxShadow: isRowHovered ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Numerical Score Right */}
              <div className={`shap-row-score-col ${isRisk ? 'red' : 'green'}`}>
                {valStr}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover Inspection Popover */}
      {internalHover && (
        <div className="shap-hover-details-popover">
          <div className="shap-popover-header">
            <strong>{internalHover.label}</strong>
            <span className={`shap-badge-tiny ${internalHover.contribution > 0 ? 'red' : 'green'}`}>
              {internalHover.contribution > 0 ? 'Increases Risk' : 'Lowers Risk'}
            </span>
          </div>
          <div className="shap-popover-meta">
            <div>Contribution: <strong>{internalHover.contribution > 0 ? '+' : ''}{internalHover.contribution.toFixed(4)}</strong></div>
            <div>Direction: <strong>{internalHover.contribution > 0 ? 'Increases estimated risk' : 'Lower estimated risk'}</strong></div>
          </div>
        </div>
      )}

      {/* Mandatory Non-causation Footnote */}
      <div className="clinical-footnote" style={{ marginTop: 'auto', paddingTop: 4 }}>
        Model contribution, not clinical causation.
      </div>
    </div>
  );
}

export default React.memo(ShapDivergingChartComponent);
