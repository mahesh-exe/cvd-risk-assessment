import re

with open("src/components/HealthIndicatorDetailModal.jsx", "r") as f:
    code = f.read()

lucide_imports = "import { HeartPulse, Scale, Droplet, Activity, Cigarette, Wine, Footprints, Info, AlertTriangle, ShieldCheck } from 'lucide-react';\n"
code = code.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\n" + lucide_imports)


visualizations = """
// --- VISUALIZATIONS ---
const ClinicalGauge = ({ value, min, max, zones, label, unit }) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-end' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: '13px', color: '#64748B', marginLeft: '4px' }}>{unit}</span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
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
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>Blood Pressure Profile</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{apHi}<span style={{ color: '#94A3B8', fontWeight: 400 }}>/</span>{apLo}</span>
          <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '6px' }}>mmHg</span>
        </div>
      </div>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: 600, color: '#64748B' }}>
          <span>Systolic</span>
          <span style={{ color: apHi >= 140 ? '#EF4444' : apHi >= 120 ? '#F59E0B' : '#10B981' }}>{apHi >= 140 ? 'High' : apHi >= 120 ? 'Elevated' : 'Normal'}</span>
        </div>
        <div style={{ position: 'relative', height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #10B981 30%, #F59E0B 50%, #EF4444 80%)', opacity: 0.8 }}>
           <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(100, ((apHi - 90)/(180-90))*100))}%`, top: '-4px', bottom: '-4px', width: '4px', background: '#0F172A', transform: 'translateX(-50%)', borderRadius: '2px', boxShadow: '0 0 0 2px white' }} />
        </div>
      </div>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: 600, color: '#64748B' }}>
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
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {tiers.map((t, idx) => {
          const isActive = value === t.val;
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: isActive ? 1 : 0.4, transition: 'all 0.2s' }}>
              <div style={{ height: '8px', width: '100%', borderRadius: '4px', background: t.color, transform: isActive ? 'scaleY(1.5)' : 'scaleY(1)' }} />
              <span style={{ fontSize: '12px', fontWeight: isActive ? 700 : 500, color: isActive ? '#0F172A' : '#64748B', textAlign: 'center' }}>{t.label}</span>
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
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: color, display: 'flex', alignItems: 'center', gap: '4px' }}>
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
"""
code = code.replace("export default function HealthIndicatorDetailModal", visualizations + "\nexport default function HealthIndicatorDetailModal")

# Replace recorded banner with the visualization
banner_regex = r'\{\/\* Recorded Value Showcase Banner \*\/\}[\s\S]*?\{\/\* Plain-Language Clinical Explanation \*\/\}'
new_banner = """{/* Recorded Value Showcase Banner & Visualization */}
                  <motion.div variants={childVariants} className="indicator-recorded-banner" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    {renderVisualIndicator(currentId, apHi, apLo, bmi, cholVal, glucVal, smokeVal, alcoVal, actVal)}
                  </motion.div>

                  {/* Plain-Language Clinical Explanation */}"""
code = re.sub(banner_regex, new_banner, code)

with open("src/components/HealthIndicatorDetailModal.jsx", "w") as f:
    f.write(code)

