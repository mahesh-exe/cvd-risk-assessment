import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, Scale, Droplet, Activity, Cigarette, Wine, Footprints, Info, AlertTriangle, ShieldCheck } from 'lucide-react';


const WHATIF_SUPPORTED_FACTORS = new Set(['bp', 'bmi', 'chol', 'smoke', 'active']);

const INDICATOR_METADATA = {
  bp: { id: 'bp', name: 'Blood Pressure', shortName: 'BP', category: 'Vascular Hemodynamics', unit: 'mmHg', icon: '🫀', explanation: 'Blood pressure measures the lateral hydrostatic force exerted by circulating blood against systemic arterial walls during ventricular contraction (systolic) and resting diastole (diastolic). Elevated arterial pressures increase ventricular afterload and accelerate vascular endothelial remodeling.' },
  bmi: { id: 'bmi', name: 'Body Mass Index (BMI)', shortName: 'BMI', category: 'Anthropometric Adiposity', unit: 'kg/m²', icon: '⚖️', explanation: 'Body Mass Index (BMI) is a standardized anthropometric ratio comparing total body mass to height squared. While it does not differentiate visceral from subcutaneous adipose distribution, elevated BMI strongly correlates with increased metabolic demand, systemic inflammation, and vascular workload.' },
  chol: { id: 'chol', name: 'Total Cholesterol', shortName: 'Cholesterol', category: 'Lipid Homeostasis', unit: 'Categorical Tier', icon: '🩸', explanation: 'Circulating serum cholesterol is required for steroid hormone synthesis and cellular membrane integrity. Excessive circulating low-density atherogenic lipoproteins infiltrate the vascular intima, initiating foam cell transformation and progressive arterial plaque accumulation.' },
  gluc: { id: 'gluc', name: 'Fasting Glucose', shortName: 'Glucose', category: 'Glycemic Regulation', unit: 'Categorical Tier', icon: '🔬', explanation: 'Fasting blood glucose reflects systemic glycemic homeostasis regulated by pancreatic insulin secretion and hepatic gluconeogenesis. Chronically elevated glucose promotes non-enzymatic protein glycation, endothelial dysfunction, and vascular stiffening.' },
  smoke: { id: 'smoke', name: 'Smoking Status', shortName: 'Smoking', category: 'Toxicological Exposure', unit: 'Binary Status', icon: '🚬', explanation: 'Tobacco combustion generates toxic reactive oxidant species, carbon monoxide, and nicotine. Inhaled toxins damage endothelial nitric oxide synthase, impair endothelium-dependent vasodilation, accelerate arterial plaque destabilization, and promote platelet aggregation.' },
  alco: { id: 'alco', name: 'Alcohol Consumption', shortName: 'Alcohol', category: 'Behavioral Exposure', unit: 'Binary Status', icon: '🍷', explanation: 'Alcohol intake exerts multifaceted effects on vascular autonomic tone, the renin-angiotensin system, and cardiac myocyte function. Regular or excessive consumption is clinically associated with sustained blood pressure elevation and secondary cardiomyopathy.' },
  active: { id: 'active', name: 'Physical Activity', shortName: 'Activity', category: 'Cardiorespiratory Lifestyle', unit: 'Binary Status', icon: '🏃', explanation: 'Habitual physical activity stimulates vascular endothelial shear stress, upregulating nitric oxide bioavailability and reducing resting arterial stiffness. A sedentary lifestyle is associated with reduced cardiorespiratory fitness, insulin resistance, and impaired autonomic vascular control.' }
};

const INDICATOR_LIST = ['bp', 'bmi', 'chol', 'gluc', 'smoke', 'alco', 'active'];

// --- ANIMATION VARIANTS ---
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 15 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.98, y: -5, transition: { duration: 0.2, ease: 'easeIn' } }
};

const contentVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut', staggerChildren: 0.08, delayChildren: 0.1 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.25, ease: 'easeIn' } }
};

const childVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
};



// --- VISUALIZATIONS ---
const ClinicalGauge = ({ value, min, max, zones, label, unit }) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-end' }}>
        <span style={{ fontSize: '15.5px', fontWeight: 700, color: '#475569' }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: '14.5px', color: '#475569', marginLeft: '4px' }}>{unit}</span>
        </div>
      </div>
      <div style={{ position: 'relative', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#E2E8F0', display: 'flex' }}>
        {zones.map((z, i) => (
          <div key={i} style={{ width: `${z.width}%`, background: z.color, opacity: 0.7 }} />
        ))}
        <div 
          style={{ 
            position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, 
            width: '4px', background: '#0F172A', transform: 'translateX(-50%)', 
            borderRadius: '2px', boxShadow: '0 0 0 2px white' 
          }} 
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

const BPGauge = ({ apHi, apLo }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartPulse size={20} color="#EF4444" />
          <span style={{ fontSize: '16.5px', fontWeight: 700, color: '#1E293B' }}>Blood Pressure Profile</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{apHi}<span style={{ color: '#64748B', fontWeight: 400 }}>/</span>{apLo}</span>
          <span style={{ fontSize: '13.5px', color: '#475569', marginLeft: '6px' }}>mmHg</span>
        </div>
      </div>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px', fontWeight: 700, color: '#475569' }}>
          <span>Systolic</span>
          <span style={{ color: apHi >= 140 ? '#EF4444' : apHi >= 120 ? '#F59E0B' : '#10B981' }}>{apHi >= 140 ? 'High' : apHi >= 120 ? 'Elevated' : 'Normal'}</span>
        </div>
        <div style={{ position: 'relative', height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #10B981 30%, #F59E0B 50%, #EF4444 80%)', opacity: 0.8 }}>
           <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(100, ((apHi - 90)/(180-90))*100))}%`, top: '-4px', bottom: '-4px', width: '4px', background: '#0F172A', transform: 'translateX(-50%)', borderRadius: '2px', boxShadow: '0 0 0 2px white' }} />
        </div>
      </div>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px', fontWeight: 700, color: '#475569' }}>
          <span>Diastolic</span>
          <span style={{ color: apLo >= 90 ? '#EF4444' : apLo >= 80 ? '#F59E0B' : '#10B981' }}>{apLo >= 90 ? 'High' : apLo >= 80 ? 'Elevated' : 'Normal'}</span>
        </div>
        <div style={{ position: 'relative', height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #10B981 40%, #F59E0B 60%, #EF4444 80%)', opacity: 0.8 }}>
           <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(100, ((apLo - 60)/(120-60))*100))}%`, top: '-4px', bottom: '-4px', width: '4px', background: '#0F172A', transform: 'translateX(-50%)', borderRadius: '2px', boxShadow: '0 0 0 2px white' }} />
        </div>
      </div>
    </div>
  );
};

const TierIndicator = ({ value, label, tiers }) => {
  return (
    <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '15.5px', fontWeight: 700, color: '#475569' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {tiers.map((t, idx) => {
          const isActive = value === t.val;
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: isActive ? 1 : 0.4, transition: 'all 0.2s' }}>
              <div style={{ height: '8px', width: '100%', borderRadius: '4px', background: t.color, transform: isActive ? 'scaleY(1.5)' : 'scaleY(1)' }} />
              <span style={{ fontSize: '13.5px', fontWeight: isActive ? 700 : 500, color: isActive ? '#0F172A' : '#475569', textAlign: 'center' }}>{t.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  );
};

const BinaryStatusViz = ({ isActive, activeLabel, inactiveLabel, activeIcon, inactiveIcon, isRiskFactor }) => {
  const Icon = isActive ? activeIcon : inactiveIcon;
  const color = isActive ? (isRiskFactor ? '#EF4444' : '#10B981') : (isRiskFactor ? '#10B981' : '#F59E0B');
  const bg = isActive ? (isRiskFactor ? '#FEF2F2' : '#ECFDF5') : (isRiskFactor ? '#ECFDF5' : '#FFFBEB');
  const label = isActive ? activeLabel : inactiveLabel;
  const statusMsg = isActive 
    ? (isRiskFactor ? "Elevated Risk Factor Present" : "Protective Factor Present")
    : (isRiskFactor ? "Risk Factor Absent" : "Suboptimal Protective Factor");

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: bg, borderRadius: '8px', border: `1px solid ${color}40`, marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '28px', background: `${color}20`, color: color }}>
        <Icon size={28} />
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '14.5px', fontWeight: 700, color: color, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isRiskFactor && isActive ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
          {statusMsg}
        </div>
      </div>
    </div>
  );
};

const renderVisualIndicator = (id, apHi, apLo, bmi, cholVal, glucVal, smokeVal, alcoVal, actVal) => {
  switch (id) {
    case 'bp':
      return <BPGauge apHi={apHi} apLo={apLo} />;
    case 'bmi':
      return <ClinicalGauge value={bmi.toFixed(1)} min={15} max={40} label="Body Mass Index (BMI)" unit="kg/m²" zones={[
        {width: (18.5-15)/(40-15)*100, color: '#3B82F6'}, 
        {width: (25-18.5)/(40-15)*100, color: '#10B981'},
        {width: (30-25)/(40-15)*100, color: '#F59E0B'},
        {width: (40-30)/(40-15)*100, color: '#EF4444'}
      ]} />;
    case 'chol':
      return <TierIndicator value={cholVal} label="Total Cholesterol Level" tiers={[
        {val: 1, label: 'Normal', color: '#10B981'},
        {val: 2, label: 'Above Normal', color: '#F59E0B'},
        {val: 3, label: 'High', color: '#EF4444'}
      ]} />;
    case 'gluc':
      return <TierIndicator value={glucVal} label="Fasting Glucose Level" tiers={[
        {val: 1, label: 'Normal', color: '#10B981'},
        {val: 2, label: 'Above Normal', color: '#F59E0B'},
        {val: 3, label: 'High', color: '#EF4444'}
      ]} />;
    case 'smoke':
      return <BinaryStatusViz isActive={smokeVal === 1} activeLabel="Active Smoker" inactiveLabel="Non-Smoker" activeIcon={Cigarette} inactiveIcon={ShieldCheck} isRiskFactor={true} />;
    case 'alco':
      return <BinaryStatusViz isActive={alcoVal === 1} activeLabel="Regular Consumer" inactiveLabel="Non-Consumer" activeIcon={Wine} inactiveIcon={ShieldCheck} isRiskFactor={true} />;
    case 'active':
      return <BinaryStatusViz isActive={actVal === 1} activeLabel="Regularly Active" inactiveLabel="Sedentary" activeIcon={Activity} inactiveIcon={Footprints} isRiskFactor={false} />;
    default:
      return null;
  }
};
// ----------------------

export default function HealthIndicatorDetailModal({
  indicatorId, open, onClose, patient, result, onOpenWhatIf, onSelectIndicator
}) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open && closeButtonRef.current) closeButtonRef.current.focus();
  }, [open, indicatorId]);

  const shapContributions = useMemo(() => {
    if (!open || !indicatorId || !result?.explanation) return [];
    const all = [...(result.explanation.modifiable || []), ...(result.explanation.non_modifiable || [])];
    if (indicatorId === 'bp') return all.filter(f => f.feature === 'ap_hi' || f.feature === 'ap_lo');
    if (indicatorId === 'bmi') return all.filter(f => f.feature === 'bmi' || f.feature === 'weight');
    if (indicatorId === 'chol') return all.filter(f => f.feature === 'cholesterol');
    if (indicatorId === 'gluc') return all.filter(f => f.feature === 'gluc');
    if (indicatorId === 'smoke') return all.filter(f => f.feature === 'smoke');
    if (indicatorId === 'alco') return all.filter(f => f.feature === 'alco');
    if (indicatorId === 'active') return all.filter(f => f.feature === 'active');
    return [];
  }, [open, indicatorId, result]);

  const currentId = indicatorId;
  const meta = INDICATOR_METADATA[currentId] || INDICATOR_METADATA.bp;

  const apHi = patient?.ap_hi ?? 120;
  const apLo = patient?.ap_lo ?? 80;
  const weight = patient?.weight ?? 70;
  const height = patient?.height ?? 170;
  const bmi = weight && height ? weight / ((height / 100) ** 2) : 22.0;
  const cholVal = patient?.cholesterol ?? 1;
  const glucVal = patient?.gluc ?? 1;
  const smokeVal = patient?.smoke ?? 0;
  const alcoVal = patient?.alco ?? 0;
  const actVal = patient?.active ?? 1;

  let currentValText = '';
  let statusTier = 'normal';
  let statusText = 'Normal';

  if (currentId === 'bp') {
    currentValText = `${apHi} / ${apLo} mmHg`;
    if (apHi >= 140 || apLo >= 90) { statusTier = 'elevated'; statusText = 'Elevated (Hypertension)'; }
    else if (apHi >= 120 || apLo >= 80) { statusTier = 'attention'; statusText = 'Watch / Elevated'; }
    else { statusTier = 'normal'; statusText = 'Normal / Optimal'; }
  } else if (currentId === 'bmi') {
    currentValText = `${bmi.toFixed(1)} kg/m²`;
    if (bmi >= 30) { statusTier = 'elevated'; statusText = 'Obese (≥30.0)'; }
    else if (bmi >= 25) { statusTier = 'attention'; statusText = 'Overweight (25–29.9)'; }
    else if (bmi < 18.5) { statusTier = 'attention'; statusText = 'Underweight (<18.5)'; }
    else { statusTier = 'normal'; statusText = 'Normal Weight (18.5–24.9)'; }
  } else if (currentId === 'chol') {
    currentValText = cholVal === 1 ? 'Normal' : cholVal === 2 ? 'Above Normal' : 'High';
    statusTier = cholVal === 1 ? 'normal' : cholVal === 2 ? 'attention' : 'elevated';
    statusText = cholVal === 1 ? 'Normal (Tier 1)' : cholVal === 2 ? 'Above Normal (Tier 2)' : 'High (Tier 3)';
  } else if (currentId === 'gluc') {
    currentValText = glucVal === 1 ? 'Normal' : glucVal === 2 ? 'Above Normal' : 'High';
    statusTier = glucVal === 1 ? 'normal' : glucVal === 2 ? 'attention' : 'elevated';
    statusText = glucVal === 1 ? 'Normal (Tier 1)' : glucVal === 2 ? 'Above Normal (Tier 2)' : 'High (Tier 3)';
  } else if (currentId === 'smoke') {
    currentValText = smokeVal === 1 ? 'Active Smoker' : 'Non-Smoker';
    statusTier = smokeVal === 1 ? 'elevated' : 'normal';
    statusText = smokeVal === 1 ? 'Active Smoker (Recorded)' : 'Non-Smoker';
  } else if (currentId === 'alco') {
    currentValText = alcoVal === 1 ? 'Alcohol Consumer' : 'Non-Consumer';
    statusTier = alcoVal === 1 ? 'attention' : 'normal';
    statusText = alcoVal === 1 ? 'Consumer (Recorded)' : 'Non-Consumer';
  } else if (currentId === 'active') {
    currentValText = actVal === 1 ? 'Regularly Active' : 'Sedentary / Inactive';
    statusTier = actVal === 1 ? 'normal' : 'attention';
    statusText = actVal === 1 ? 'Regularly Active' : 'Sedentary / Inactive';
  }

  const isWhatIfSupported = WHATIF_SUPPORTED_FACTORS.has(currentId);

  return (
    <AnimatePresence>
      {open && indicatorId && (
        <motion.div
          className="clinical-modal-overlay"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="indicator-modal-title"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          key="modal-overlay"
        >
          <motion.div
            className="indicator-detail-modal-card"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            {/* Top Header Bar */}
            <div className="indicator-modal-header">
              <div className="indicator-header-main">
                <motion.span 
                  className="indicator-header-icon" 
                  aria-hidden="true"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  key={`icon-${currentId}`}
                >
                  {meta.icon}
                </motion.span>
                <div>
                  <div className="indicator-header-title-row">
                    <h2 id="indicator-modal-title" className="indicator-modal-title">
                      {meta.name}
                    </h2>
                    <motion.span 
                      className={`bullet-status-pill ${statusTier}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      key={`status-${currentId}`}
                    >
                      {statusText}
                    </motion.span>
                  </div>
                  <div className="indicator-modal-subtitle">
                    <span>{meta.category}</span>
                    <span className="dot-sep">•</span>
                    <span>Patient {patient?.patient_id || 'DEMO-001'}</span>
                  </div>
                </div>
              </div>
              <button ref={closeButtonRef} className="indicator-modal-close-btn" onClick={onClose} aria-label="Close indicator details">✕</button>
            </div>

            {/* Quick Indicator Navigation Tabs */}
            <div className="indicator-tabs-strip" role="tablist" aria-label="Select Health Indicator">
              {INDICATOR_LIST.map((id) => {
                const item = INDICATOR_METADATA[id];
                const isActive = id === currentId;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={isActive}
                    className={`indicator-tab-pill ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectIndicator && onSelectIndicator(id)}
                    style={{ position: 'relative' }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', zIndex: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="tab-pill-icon" style={{ position: 'relative', zIndex: 1 }}>{item.icon}</span>
                    <span className="tab-pill-text" style={{ position: 'relative', zIndex: 1 }}>{item.shortName}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Scrollable Body - Animate internal transitions when switching tabs */}
            <div className="indicator-modal-body" style={{ overflowX: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentId}
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  


                  {/* Recorded Value Showcase Banner & Visualization */}
                  <motion.div variants={childVariants} className="indicator-recorded-banner" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    {renderVisualIndicator(currentId, apHi, apLo, bmi, cholVal, glucVal, smokeVal, alcoVal, actVal)}
                  </motion.div>

                  {/* Plain-Language Clinical Explanation */}
                  <motion.div variants={childVariants} className="indicator-explanation-card">
                    <div className="expl-card-title">
                      <span className="expl-icon">💡</span>
                      <span>Clinical Context & Significance</span>
                    </div>
                    <p className="expl-text">{meta.explanation}</p>
                  </motion.div>

                  {/* SHAP Feature Contribution Readout */}
                  <motion.div variants={childVariants} className="indicator-shap-card">
                    <div className="shap-card-header">
                      <div>
                        <span className="shap-header-title">Model Feature Contribution (SHAP Analysis)</span>
                        <span className="shap-header-subtitle">Estimated risk association computed by model tree explainer</span>
                      </div>
                      <span className="shap-method-pill">{result?.explanation?.method || 'SHAP Explainer'}</span>
                    </div>

                    {shapContributions.length > 0 ? (
                      <div className="shap-contrib-rows">
                        {shapContributions.map((contrib, idx) => {
                          const isRisk = contrib.contribution > 0;
                          const sign = isRisk ? '+' : '';
                          return (
                            <motion.div 
                              key={contrib.feature} 
                              className="shap-contrib-item"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + (idx * 0.1) }}
                            >
                              <div className="shap-feature-meta">
                                <strong className="shap-feature-label">{contrib.label}</strong>
                                <span className="shap-feature-value">Value: {contrib.value}</span>
                              </div>
                              <div className="shap-contrib-bar-wrap">
                                <motion.div 
                                  className={`shap-mini-bar ${isRisk ? 'red' : 'green'}`} 
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  style={{ transformOrigin: 'left' }}
                                  transition={{ duration: 0.6, delay: 0.4 + (idx * 0.1), ease: "easeOut" }}
                                />
                              </div>
                              <div className={`shap-contrib-val ${isRisk ? 'red' : 'green'}`}>
                                {sign}{contrib.contribution.toFixed(4)}
                                <span className="shap-dir-tag">
                                  {isRisk ? 'Increases Risk' : 'Lowers Risk'}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="shap-no-direct-note">
                        <span>Contribution is within the baseline distribution or negligible in the current model decision path for this patient.</span>
                      </div>
                    )}

                    <div className="shap-causation-disclaimer">
                      <span className="disclaimer-badge">Mandatory Notice</span>
                      <strong>Model contribution, not clinical causation.</strong>
                      <span>
                        Feature importance values reflect statistical patterns learned by the machine-learning classifier from the training cohort. They do not imply a direct biological cause-and-effect relationship for this individual patient.
                      </span>
                    </div>
                  </motion.div>

                  {/* What-If Simulator Shortcut */}
                  <motion.div variants={childVariants} className="indicator-whatif-shortcut-card">
                    <div className="whatif-shortcut-info">
                      <div className="shortcut-title">
                        <span>🔄</span>
                        <span>Interactive What-If Scenario Exploration</span>
                      </div>
                      <div className="shortcut-desc">
                        {isWhatIfSupported
                          ? `Simulate how modifying ${meta.shortName.toLowerCase()} alongside other modifiable factors affects estimated cardiovascular risk.`
                          : `${meta.name} is fixed in the patient record and not configured as an adjustable factor in the current What-If simulation.`}
                      </div>
                    </div>
                    {isWhatIfSupported ? (
                      <button type="button" className="btn-open-whatif-shortcut" onClick={() => { if (onOpenWhatIf) onOpenWhatIf(currentId); }}>
                        <span>Simulate in What-If Tool</span>
                        <span className="btn-arrow">→</span>
                      </button>
                    ) : (
                      <span className="non-modifiable-tag">Fixed Clinical Parameter</span>
                    )}
                  </motion.div>

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Modal Footer */}
            <div className="indicator-modal-footer">
              <span className="clinical-guidance-note">
                Clinical Decision Support System • Informational prototype only • Does not substitute for physician diagnosis.
              </span>
              <button type="button" className="btn-modal-close-action" onClick={onClose}>
                Close Detail View
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
