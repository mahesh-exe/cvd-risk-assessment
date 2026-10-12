import React, { useState, useRef } from 'react';

/**
 * Visual Segmented Radial Cardiovascular Profile
 * Premium clinical visualization:
 * - 7 Core Biomarkers: Blood Pressure, BMI, Cholesterol, Glucose, Smoking, Alcohol, Physical Activity
 * - Smooth 300ms easing for all hover scale and glow transitions
 * - Zero flickering: Fixed path geometry + invisible dedicated hit-area wedge with pointer-events
 * - Center Hub Display: Smoothly morphs from heartbeat to active factor name, value, and status
 * - Inspection Banner: Crisp clinical factor readout with semantic status pill
 * - Cross-visualization synchronization: Seamlessly highlights matching SHAP bar and Health Indicator
 */
export default function RadialCardiovascularProfile({
  patient,
  activeHoverFactor,
  onHoverFactor,
  selectedFactor,
  onSelectFactor
}) {
  const [internalHover, setInternalHover] = useState(null);

  // Compute status for all 7 factors
  const bmi = patient?.weight && patient?.height
    ? (patient.weight / ((patient.height / 100) ** 2))
    : 22.0;

  // 1. Blood Pressure
  const bpHi = patient?.ap_hi ?? 120;
  const bpLo = patient?.ap_lo ?? 80;
  const bpStatus = bpHi >= 140 || bpLo >= 90 ? 'Elevated' : bpHi >= 125 || bpLo >= 85 ? 'Attention' : 'Normal';
  const bpLevel = bpStatus === 'Elevated' ? 3 : bpStatus === 'Attention' ? 2 : 1;

  // 2. BMI
  const bmiStatus = bmi >= 30 ? 'Elevated' : bmi >= 25 ? 'Attention' : 'Normal';
  const bmiLevel = bmiStatus === 'Elevated' ? 3 : bmiStatus === 'Attention' ? 2 : 1;

  // 3. Cholesterol
  const cholVal = patient?.cholesterol ?? 1;
  const cholStatus = cholVal === 3 ? 'Elevated' : cholVal === 2 ? 'Attention' : 'Normal';
  const cholLevel = cholVal;

  // 4. Glucose
  const glucVal = patient?.gluc ?? 1;
  const glucStatus = glucVal === 3 ? 'Elevated' : glucVal === 2 ? 'Attention' : 'Normal';
  const glucLevel = glucVal;

  // 5. Smoking
  const smokeVal = patient?.smoke ?? 0;
  const smokeStatus = smokeVal === 1 ? 'Elevated' : 'Normal';
  const smokeLevel = smokeVal === 1 ? 3 : 1;

  // 6. Alcohol
  const alcoVal = patient?.alco ?? 0;
  const alcoStatus = alcoVal === 1 ? 'Attention' : 'Normal';
  const alcoLevel = alcoVal === 1 ? 2 : 1;

  // 7. Physical Activity
  const actVal = patient?.active ?? 1;
  const actStatus = actVal === 0 ? 'Attention' : 'Normal';
  const actLevel = actVal === 0 ? 2 : 1;

  const factors = [
    { id: 'bp', name: 'Blood Pressure', short: 'BP', value: `${bpHi}/${bpLo} mmHg`, status: bpStatus, level: bpLevel, icon: '🫀', hint: 'Target: <120/80 mmHg' },
    { id: 'bmi', name: 'Body Mass Index', short: 'BMI', value: `${bmi.toFixed(1)} kg/m²`, status: bmiStatus, level: bmiLevel, icon: '⚖️', hint: 'Target: 18.5–24.9 kg/m²' },
    { id: 'chol', name: 'Cholesterol', short: 'CHOL', value: cholVal === 1 ? 'Normal' : cholVal === 2 ? 'Above Normal' : 'High', status: cholStatus, level: cholLevel, icon: '🧪', hint: 'Target: Desirable (<200)' },
    { id: 'gluc', name: 'Glucose', short: 'GLUC', value: glucVal === 1 ? 'Normal' : glucVal === 2 ? 'Above Normal' : 'High', status: glucStatus, level: glucLevel, icon: '🩸', hint: 'Target: Fasting <100' },
    { id: 'smoke', name: 'Smoking', short: 'SMK', value: smokeVal === 1 ? 'Active Smoker' : 'Non-Smoker', status: smokeStatus, level: smokeLevel, icon: '🚬', hint: 'Target: Complete Cessation' },
    { id: 'alco', name: 'Alcohol', short: 'ALC', value: alcoVal === 1 ? 'Regular Consumer' : 'Non-Consumer', status: alcoStatus, level: alcoLevel, icon: '🍷', hint: 'Target: Minimal / None' },
    { id: 'active', name: 'Physical Activity', short: 'ACT', value: actVal === 1 ? 'Regularly Active' : 'Sedentary', status: actStatus, level: actLevel, icon: '🏃', hint: 'Target: ≥150 min/wk' }
  ];

  const CX = 140;
  const CY = 125;
  const innerR = 45;
  const stepR = 19; // Level 1: 64, Level 2: 83, Level 3: 102
  const maxOuterR = innerR + 3 * stepR;

  const totalSegments = factors.length;
  const anglePerSeg = 360 / totalSegments;
  const gapDeg = 4.2;

  // Arc path generator with mathematical precision
  const makeArcPath = (startAngleDeg, endAngleDeg, rInner, rOuter) => {
    const sRad = ((startAngleDeg - 90) * Math.PI) / 180;
    const eRad = ((endAngleDeg - 90) * Math.PI) / 180;

    const x1 = CX + rInner * Math.cos(sRad);
    const y1 = CY + rInner * Math.sin(sRad);
    const x2 = CX + rOuter * Math.cos(sRad);
    const y2 = CY + rOuter * Math.sin(sRad);
    const x3 = CX + rOuter * Math.cos(eRad);
    const y3 = CY + rOuter * Math.sin(eRad);
    const x4 = CX + rInner * Math.cos(eRad);
    const y4 = CY + rInner * Math.sin(eRad);

    const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x1} ${y1} Z`;
  };

  const getStatusColor = (status) => {
    if (status === 'Elevated') {
      return {
        fill: 'rgba(239, 68, 68, 0.90)',
        stroke: '#DC2626',
        glow: 'rgba(239, 68, 68, 0.45)',
        text: '#DC2626',
        bg: '#FEF2F2'
      };
    }
    if (status === 'Attention') {
      return {
        fill: 'rgba(245, 158, 11, 0.90)',
        stroke: '#D97706',
        glow: 'rgba(245, 158, 11, 0.45)',
        text: '#D97706',
        bg: '#FFFBEB'
      };
    }
    return {
      fill: 'rgba(16, 185, 129, 0.90)',
      stroke: '#059669',
      glow: 'rgba(16, 185, 129, 0.45)',
      text: '#059669',
      bg: '#ECFDF5'
    };
  };

  // Determine which factor is active (internal hover, cross-hover, or selected)
  const activeId = internalHover?.id || activeHoverFactor || selectedFactor?.id;
  const effectiveActiveFactor = factors.find(f => f.id === activeId);

  const handleSliceEnter = (f) => {
    setInternalHover(f);
    if (onHoverFactor) onHoverFactor(f.id);
  };

  const handleSliceLeave = () => {
    setInternalHover(null);
    if (onHoverFactor) onHoverFactor(null);
  };

  return (
    <div
      className="radial-profile-interactive-container"
      onMouseLeave={handleSliceLeave}
    >
      {/* Card Header & Legend */}
      <div className="radial-profile-top-bar">
        <div className="radial-profile-title-block">
          <span className="profile-badge-pill">VISUAL CARDIOVASCULAR PROFILE</span>
          <span className="profile-sub-pill">7 Core Biomarkers</span>
        </div>
        <div className="radial-status-indicators">
          <span className="status-dot-chip green"><span className="dot-pip green" />Normal</span>
          <span className="status-dot-chip amber"><span className="dot-pip amber" />Attention</span>
          <span className="status-dot-chip red"><span className="dot-pip red" />Elevated</span>
        </div>
      </div>

      {/* SVG Canvas with zero jumping & smooth 300ms easing */}
      <div className="radial-canvas-frame">
        <svg viewBox="0 0 280 250" className="radial-profile-svg" role="img" aria-label="Cardiovascular Profile Radar">
          <defs>
            {/* Soft, tailored drop shadows for active segments */}
            <filter id="glow-elevated" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4.5" floodColor="#DC2626" floodOpacity="0.4" />
            </filter>
            <filter id="glow-attention" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4.5" floodColor="#D97706" floodOpacity="0.4" />
            </filter>
            <filter id="glow-normal" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4.5" floodColor="#059669" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Concentric Guide Gridlines */}
          <circle cx={CX} cy={CY} r={innerR + stepR} fill="none" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx={CX} cy={CY} r={innerR + 2 * stepR} fill="none" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx={CX} cy={CY} r={maxOuterR} fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />

          {/* 7 Interactive Radial Segments */}
          {factors.map((f, i) => {
            const startAngle = i * anglePerSeg + gapDeg / 2;
            const endAngle = (i + 1) * anglePerSeg - gapDeg / 2;
            const isHighlighted = f.id === effectiveActiveFactor?.id;
            const isSelected = f.id === selectedFactor?.id;
            const isOtherHighlighted = effectiveActiveFactor && !isHighlighted;

            // Stable, fixed path geometry - NEVER changes on hover to prevent jumping
            const segOuterR = innerR + f.level * stepR;
            const colors = getStatusColor(f.status);

            const bgPath = makeArcPath(startAngle, endAngle, innerR, maxOuterR);
            const activePath = makeArcPath(startAngle, endAngle, innerR, segOuterR);
            // Full wedge hit-area covering the full track plus label margin
            const hitPath = makeArcPath(startAngle - 0.5, endAngle + 0.5, innerR - 2, maxOuterR + 22);

            // Label coordinates
            const midDeg = (startAngle + endAngle) / 2;
            const midRad = ((midDeg - 90) * Math.PI) / 180;
            const labelR = maxOuterR + 15;
            const lx = CX + labelR * Math.cos(midRad);
            const ly = CY + labelR * Math.sin(midRad);

            const filterId = f.status === 'Elevated' ? 'glow-elevated' : f.status === 'Attention' ? 'glow-attention' : 'glow-normal';

            return (
              <g
                key={f.id}
                className={`radial-slice-group ${isHighlighted ? 'active' : ''} ${isSelected ? 'locked' : ''}`}
                style={{
                  transformOrigin: `${CX}px ${CY}px`,
                  transform: isHighlighted ? 'scale(1.055)' : 'scale(1)',
                  opacity: isOtherHighlighted ? 0.72 : 1,
                  filter: isHighlighted ? `url(#${filterId})` : 'none',
                  transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), filter 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (onSelectFactor) onSelectFactor(isSelected ? null : f);
                }}
              >
                {/* Background track arc */}
                <path
                  d={bgPath}
                  fill="#F1F5F9"
                  opacity={isHighlighted ? 0.45 : 0.6}
                  style={{ pointerEvents: 'none' }}
                />

                {/* Dynamic colored value wedge */}
                <path
                  d={activePath}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isHighlighted ? 2.2 : 1.2}
                  style={{
                    pointerEvents: 'none',
                    transition: 'stroke-width 280ms cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />

                {/* Perimeter Factor Label */}
                <text
                  x={lx}
                  y={ly + 4}
                  textAnchor="middle"
                  fontSize={isHighlighted ? "14" : "12.5"}
                  fontWeight={isHighlighted ? "800" : "700"}
                  fill={isHighlighted ? colors.text : "#1E293B"}
                  fontFamily="'Outfit', -apple-system, sans-serif"
                  style={{
                    pointerEvents: 'none',
                    transition: 'fill 250ms ease, font-size 250ms ease'
                  }}
                >
                  {f.short}
                </text>

                {/* Dedicated invisible hit-area wedge: guaranteed zero flicker */}
                <path
                  d={hitPath}
                  fill="transparent"
                  onMouseEnter={() => handleSliceEnter(f)}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                />
              </g>
            );
          })}

          {/* Center Clinical Hub (CX=140, CY=125, r=innerR-2) */}
          <circle
            cx={CX}
            cy={CY}
            r={innerR - 2}
            fill="#FFFFFF"
            stroke={effectiveActiveFactor ? getStatusColor(effectiveActiveFactor.status).stroke : "#E2E8F0"}
            strokeWidth={effectiveActiveFactor ? "2.5" : "2"}
            style={{
              transition: 'stroke 300ms cubic-bezier(0.16, 1, 0.3, 1), stroke-width 300ms ease'
            }}
          />
          <circle
            cx={CX}
            cy={CY}
            r={innerR - 6}
            fill={effectiveActiveFactor ? getStatusColor(effectiveActiveFactor.status).bg : "#F8FAFC"}
            style={{
              transition: 'fill 300ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />

          {/* Center Hub Content: Dynamically shows factor name/value when hovered */}
          {effectiveActiveFactor ? (
            <g
              key={effectiveActiveFactor.id}
              className="center-hub-active-content"
              style={{
                animation: 'hubFadeIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'none'
              }}
            >
              <text x={CX} y={CY - 13} textAnchor="middle" fontSize="18">
                {effectiveActiveFactor.icon}
              </text>
              <text
                x={CX}
                y={CY + 1}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="800"
                fill="#1E293B"
                fontFamily="'Outfit', sans-serif"
                letterSpacing="0.04em"
              >
                {effectiveActiveFactor.short}
              </text>
              <text
                x={CX}
                y={CY + 14}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill={getStatusColor(effectiveActiveFactor.status).text}
                fontFamily="'JetBrains Mono', monospace"
              >
                {effectiveActiveFactor.value.split(' ')[0]}
              </text>
              <text
                x={CX}
                y={CY + 25}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#475569"
              >
                {effectiveActiveFactor.status.toUpperCase()}
              </text>
            </g>
          ) : (
            <g
              className="center-hub-default-content"
              style={{
                animation: 'hubFadeIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'none'
              }}
            >
              <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" className="center-heart-icon">
                🫀
              </text>
              <text
                x={CX}
                y={CY + 12}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="800"
                fill="#1E293B"
                fontFamily="'Outfit', sans-serif"
                letterSpacing="0.06em"
              >
                PROFILE
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Dynamic Factor Inspection Readout Banner */}
      <div className={`radial-inspection-banner ${effectiveActiveFactor ? 'active' : ''}`}>
        {effectiveActiveFactor ? (
          <div className="inspection-content-row">
            <span className="inspection-icon">{effectiveActiveFactor.icon}</span>
            <div className="inspection-meta">
              <span className="inspection-title">{effectiveActiveFactor.name}:</span>
              <strong className="inspection-val">{effectiveActiveFactor.value}</strong>
            </div>
            <span className={`inspection-status-pill ${effectiveActiveFactor.status.toLowerCase()}`}>
              {effectiveActiveFactor.status}
            </span>
            <span className="inspection-hint-text">
              {effectiveActiveFactor.hint}
            </span>
          </div>
        ) : (
          <div className="inspection-placeholder">
            <span>Hover any biomarker segment to cross-inspect with SHAP & Health Indicators</span>
          </div>
        )}
      </div>
    </div>
  );
}
