import React from 'react';

/**
 * Health Indicators as Interactive Clinical Range Charts
 * Features:
 * - 7 Clinical Biomarkers matched 1:1 with Visual Profile
 * - Current value readout
 * - Clinical status pill
 * - Colored threshold zones (normal, watch, elevated)
 * - Animated marker that smoothly slides when patient data changes
 * - Cross-visualization synchronization: hovers emit factor ID ('bp', 'bmi', 'chol', 'gluc', 'smoke', 'alco', 'active')
 * - Smooth 300ms cubic-bezier transitions for highlights and glows
 */
export default function HealthBulletIndicators({
  patient,
  activeHoverFactor,
  onHoverFactor,
  onSelectIndicator
}) {
  const bmi = patient?.weight && patient?.height
    ? (patient.weight / ((patient.height / 100) ** 2))
    : 22.0;

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // 1. Blood Pressure (ap_hi range 90 to 180)
  const apHi = patient?.ap_hi ?? 120;
  const apLo = patient?.ap_lo ?? 80;
  const bpPct = clamp(((apHi - 90) / (180 - 90)) * 100, 5, 95);
  const bpStatus = apHi >= 140 || apLo >= 90 ? 'Elevated' : apHi >= 125 || apLo >= 85 ? 'Attention' : 'Normal';

  // 2. BMI (range 15 to 40)
  const bmiPct = clamp(((bmi - 15) / (40 - 15)) * 100, 5, 95);
  const bmiStatus = bmi >= 30 ? 'Elevated' : bmi >= 25 ? 'Attention' : 'Normal';

  // 3. Cholesterol (1: Normal, 2: Above Normal, 3: High)
  const cholVal = patient?.cholesterol ?? 1;
  const cholPct = cholVal === 1 ? 20 : cholVal === 2 ? 55 : 85;
  const cholStatus = cholVal === 1 ? 'Normal' : cholVal === 2 ? 'Attention' : 'Elevated';
  const cholText = cholVal === 1 ? 'Normal' : cholVal === 2 ? 'Above Normal' : 'High';

  // 4. Glucose (1: Normal, 2: Above Normal, 3: High)
  const glucVal = patient?.gluc ?? 1;
  const glucPct = glucVal === 1 ? 20 : glucVal === 2 ? 55 : 85;
  const glucStatus = glucVal === 1 ? 'Normal' : glucVal === 2 ? 'Attention' : 'Elevated';
  const glucText = glucVal === 1 ? 'Normal' : glucVal === 2 ? 'Above Normal' : 'High';

  // 5. Smoking
  const smokeVal = patient?.smoke ?? 0;
  const smokePct = smokeVal === 1 ? 85 : 20;
  const smokeStatus = smokeVal === 1 ? 'Elevated' : 'Normal';

  // 6. Alcohol
  const alcoVal = patient?.alco ?? 0;
  const alcoPct = alcoVal === 1 ? 80 : 20;
  const alcoStatus = alcoVal === 1 ? 'Attention' : 'Normal';
  const alcoText = alcoVal === 1 ? 'Regular Consumer' : 'Non-Consumer';

  // 7. Physical Activity
  const actVal = patient?.active ?? 1;
  const actPct = actVal === 1 ? 20 : 80;
  const actStatus = actVal === 1 ? 'Normal' : 'Attention';

  const indicators = [
    {
      id: 'bp',
      name: 'Blood Pressure',
      value: `${apHi} / ${apLo} mmHg`,
      status: bpStatus,
      pinPct: bpPct,
      zones: [
        { label: 'Normal <120', width: 33.3, color: '#10B981' },
        { label: 'Watch 120-139', width: 22.2, color: '#F59E0B' },
        { label: 'High ≥140', width: 44.5, color: '#EF4444' }
      ],
      ticks: ['90', '120', '140', '180']
    },
    {
      id: 'bmi',
      name: 'Body Mass Index',
      value: `${bmi.toFixed(1)} kg/m²`,
      status: bmiStatus,
      pinPct: bmiPct,
      zones: [
        { label: 'Normal 18.5-24.9', width: 39.6, color: '#10B981' },
        { label: 'Overweight 25-29.9', width: 20, color: '#F59E0B' },
        { label: 'Obese ≥30', width: 40.4, color: '#EF4444' }
      ],
      ticks: ['15', '18.5', '25', '30', '40']
    },
    {
      id: 'chol',
      name: 'Cholesterol Level',
      value: cholText,
      status: cholStatus,
      pinPct: cholPct,
      zones: [
        { label: 'Normal', width: 33.3, color: '#10B981' },
        { label: 'Above Normal', width: 33.3, color: '#F59E0B' },
        { label: 'High', width: 33.4, color: '#EF4444' }
      ],
      ticks: ['Normal', 'Above', 'High']
    },
    {
      id: 'gluc',
      name: 'Fasting Glucose',
      value: glucText,
      status: glucStatus,
      pinPct: glucPct,
      zones: [
        { label: 'Normal', width: 33.3, color: '#10B981' },
        { label: 'Above Normal', width: 33.3, color: '#F59E0B' },
        { label: 'High', width: 33.4, color: '#EF4444' }
      ],
      ticks: ['Normal', 'Above', 'High']
    },
    {
      id: 'smoke',
      name: 'Smoking Status',
      value: smokeVal === 1 ? 'Active Smoker' : 'Non-Smoker',
      status: smokeStatus,
      pinPct: smokePct,
      zones: [
        { label: 'Non-Smoker', width: 50, color: '#10B981' },
        { label: 'Smoker', width: 50, color: '#EF4444' }
      ],
      ticks: ['Non-Smoker', 'Active Smoker']
    },
    {
      id: 'alco',
      name: 'Alcohol Consumption',
      value: alcoText,
      status: alcoStatus,
      pinPct: alcoPct,
      zones: [
        { label: 'Non-Consumer', width: 50, color: '#10B981' },
        { label: 'Consumer', width: 50, color: '#F59E0B' }
      ],
      ticks: ['Non-Consumer', 'Regular Consumer']
    },
    {
      id: 'active',
      name: 'Physical Activity',
      value: actVal === 1 ? 'Regularly Active' : 'Sedentary',
      status: actStatus,
      pinPct: actPct,
      zones: [
        { label: 'Active', width: 50, color: '#10B981' },
        { label: 'Sedentary', width: 50, color: '#F59E0B' }
      ],
      ticks: ['Active', 'Sedentary']
    }
  ];

  return (
    <div className="bullet-indicators-container">
      {indicators.map(item => {
        const isCrossActive = activeHoverFactor === item.id;
        const statusClass = item.status === 'Elevated' ? 'elevated' : item.status === 'Attention' ? 'attention' : 'normal';

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-label={`View clinical details and scale for ${item.name}`}
            className={`bullet-indicator-row ${isCrossActive ? 'cross-highlighted' : ''}`}
            onClick={() => { if (onSelectIndicator) onSelectIndicator(item.id); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onSelectIndicator) onSelectIndicator(item.id);
              }
            }}
            onMouseEnter={() => { if (onHoverFactor) onHoverFactor(item.id); }}
            onMouseLeave={() => { if (onHoverFactor) onHoverFactor(null); }}
          >
            {/* Header: Name, Current Value, Status Badge */}
            <div className="bullet-header">
              <span className="bullet-name">{item.name}</span>
              <div className="bullet-meta">
                <strong className="bullet-value">{item.value}</strong>
                <span className={`bullet-status-pill ${statusClass}`}>
                  {item.status}
                </span>
                <span className="bullet-expand-arrow" aria-hidden="true" title="Open detailed visualization">›</span>
              </div>
            </div>

            {/* Bullet Range Bar Canvas */}
            <div className="bullet-range-track">
              {/* Segmented color bands */}
              <div className="bullet-zones-bar">
                {item.zones.map((zone, zIdx) => (
                  <div
                    key={zIdx}
                    className="bullet-zone-segment"
                    style={{
                      width: `${zone.width}%`,
                      backgroundColor: zone.color,
                      opacity: isCrossActive ? 0.5 : 0.28,
                      transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    title={zone.label}
                  />
                ))}
              </div>

              {/* Smooth Gliding Marker Pin */}
              <div
                className={`bullet-marker-pin ${statusClass} ${isCrossActive ? 'active-pulse' : ''}`}
                style={{
                  left: `${item.pinPct}%`,
                  transition: 'left 0.7s cubic-bezier(0.34, 1.4, 0.64, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div className="marker-core-dot" />
              </div>
            </div>

            {/* Subtle Ticks Bar */}
            <div className="bullet-ticks-row">
              {item.ticks.map((t, idx) => (
                <span key={idx} className="bullet-tick-text">{t}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
