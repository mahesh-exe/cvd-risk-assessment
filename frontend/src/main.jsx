import React, { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = 'http://localhost:8000';
const DEMO_PATIENT = { patient_id: 'DEMO-001', age_years: 54, gender: 2, height: 168, weight: 78, ap_hi: 145, ap_lo: 92, cholesterol: 2, gluc: 1, smoke: 0, alco: 0, active: 1 };

function Gauge({ score, category, model_used }) {
  const c = 2 * Math.PI * 56;
  return (
    <div className="risk-main">
      <div className="gauge">
        <svg viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="56" className="track" />
          <circle cx="70" cy="70" r="56" className={'arc ' + category.toLowerCase()} style={{ strokeDasharray: c, strokeDashoffset: c * (1 - score / 100) }} />
        </svg>
        <div className="gauge-center">
          <b>{score.toFixed(1)}%</b>
          <span>{category}</span>
        </div>
      </div>
      <div>
        <p className="eyebrow">Assessed Risk</p>
        <h3 style={{fontSize: '16px', margin: '4px 0 8px', color: '#1A2733'}}>Model: {model_used}</h3>
        <p className="sub">The predicted probability of cardiovascular disease occurrence is {score.toFixed(1)}%, placing this patient in the {category} risk category.</p>
        
        {score >= 35 && (
          <ul className="attention-list">
            <li>Clinical attention recommended based on actionable risk drivers.</li>
          </ul>
        )}
      </div>
    </div>
  );
}

function ShapDivergingChart({ data }) {
  const allFactors = [...(data?.modifiable || []), ...(data?.non_modifiable || [])];
  const maxAbs = Math.max(...allFactors.map(x => Math.abs(x.contribution)), 0.01);

  const renderSection = (factors, title, muted = false) => (
    <div className={`shap-section ${muted ? 'muted' : ''}`}>
      <div className="shap-section-title">{title}</div>
      {factors.map(x => {
        const width = (Math.abs(x.contribution) / maxAbs) * 100;
        const isRisk = x.direction === 'risk_increasing';
        return (
          <div className="shap-row" key={x.feature}>
            <div className="shap-label">
              <span>{x.label} <small style={{color: '#94A6B8', marginLeft: '4px'}}>({x.value})</small></span>
              <span className="shap-val">{(x.contribution > 0 ? '+' : '')}{x.contribution.toFixed(2)}</span>
            </div>
            <div className="shap-bar-area">
              {isRisk ? (
                <div style={{width: '50%', display: 'flex', justifyContent: 'flex-start'}}>
                  <div className="shap-bar risk" style={{width: `${width}%`}}></div>
                </div>
              ) : (
                <div style={{width: '50%', display: 'flex', justifyContent: 'flex-end'}}>
                  <div className="shap-bar protective" style={{width: `${width}%`}}></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="shap-container">
      <div className="shap-axis">
        <div className="neg">← Protective</div>
        <div className="pos">Risk Increase →</div>
      </div>
      <div className="shap-zero-line"></div>
      
      {renderSection(data?.modifiable || [], "Actionable Modifiable Factors")}
      {renderSection(data?.non_modifiable || [], "Baseline Non-Modifiable Factors", true)}
    </div>
  );
}

function HealthProfile({ patient, indicators }) {
  return (
    <div className="health-metrics">
      <div className={`health-chip ${(patient.ap_hi > 120 || patient.ap_lo > 80) ? 'attn' : ''}`}>
        <small>Blood Pressure</small>
        <b>{indicators.blood_pressure}</b>
      </div>
      <div className={`health-chip ${indicators.bmi > 25 ? 'attn' : ''}`}>
        <small>BMI</small>
        <b>{indicators.bmi.toFixed(1)}</b>
      </div>
      <div className={`health-chip ${patient.cholesterol > 1 ? 'attn' : ''}`}>
        <small>Cholesterol</small>
        <b>{indicators.cholesterol}</b>
      </div>
      <div className={`health-chip ${patient.gluc > 1 ? 'attn' : ''}`}>
        <small>Glucose</small>
        <b>{indicators.glucose}</b>
      </div>
      <div className={`health-chip ${patient.smoke === 1 ? 'attn' : ''}`}>
        <small>Smoking</small>
        <b>{indicators.smoking}</b>
      </div>
      <div className="health-chip">
        <small>Physical Activity</small>
        <b>{patient.active === 1 ? 'Yes' : 'No'}</b>
      </div>
    </div>
  );
}

function Sparkline({ data }) {
  if (data.length < 2) return <svg className="sparkline"></svg>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = 100 / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${30 - ((v - min) / range * 30)}`).join(' ');
  
  return (
    <svg className="sparkline" viewBox="0 -5 100 40" preserveAspectRatio="none">
      <polyline points={points} />
    </svg>
  );
}

function App() {
  const [patientsList, setPatientsList] = useState([DEMO_PATIENT]);
  const [patient, setPatient] = useState(DEMO_PATIENT);
  const [result, setResult] = useState();
  
  // What-If state
  const [simPatient, setSimPatient] = useState(DEMO_PATIENT);
  const [simResult, setSimResult] = useState();
  
  // Telemetry state
  const [telemetry, setTelemetry] = useState();
  const [hrHistory, setHrHistory] = useState([]);
  
  const [who, setWho] = useState();
  const [modelInfo, setModelInfo] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(API + '/api/patients').then(r => r.json()).then(data => {
      if (data && data.length > 0) {
        setPatientsList(data);
        setPatient(data[0]);
        setSimPatient(data[0]);
      }
    }).catch(e => console.error("Patients fetch failed", e));
    
    fetch(API + '/api/who/benchmark').then(r => r.json()).then(setWho).catch(() => {});
    fetch(API + '/api/models').then(r => r.json()).then(setModelInfo).catch(() => {});
  }, []);

  const assess = async (p) => {
    setLoading(true);
    try {
      let r = await fetch(API + '/api/assessment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      let data = await r.json();
      setResult(data);
      setSimResult(null); // Clear previous simulation when base changes
      setSimPatient(p); // Reset simulator to current baseline
      
      // Connect to websocket for the newly assessed patient
      let ws = new WebSocket(`ws://localhost:8000/ws/patient/${p.patient_id}`);
      ws.onmessage = e => {
        const d = JSON.parse(e.data);
        setTelemetry(d);
        setHrHistory(prev => [...prev.slice(-19), d.heart_rate]); // keep last 20 points
      };
      return () => ws.close();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient) assess(patient);
  }, [patient.patient_id]); // Trigger assessment when patient ID changes

  const handlePatientSelect = (e) => {
    const selected = patientsList.find(p => p.patient_id === e.target.value);
    if (selected) setPatient(selected);
  };

  const changeBase = (k, v) => setPatient(p => ({ ...p, [k]: Number(v) }));
  const changeSim = (k, v) => setSimPatient(p => ({ ...p, [k]: Number(v) }));

  const runWhatIf = async () => {
    try {
      let r = await fetch(API + '/api/what-if', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          baseline: patient, 
          changes: Object.fromEntries(Object.entries(simPatient).filter(([k, v]) => patient[k] !== v && k !== 'patient_id')) 
        })
      });
      let d = await r.json();
      setSimResult(d);
    } catch (e) {
      console.error(e);
    }
  };

  // Compute what changed
  const changedFactors = Object.keys(simPatient).filter(k => simPatient[k] !== patient[k] && k !== 'patient_id');

  return (
    <main>
      <header className="app-header">
        <div className="title-area">
          <p className="eyebrow">Cardiovascular Disease Risk Assessment</p>
          <h1>Intelligent Clinical Decision Support</h1>
        </div>
        <span className="badge">Academic Prototype</span>
      </header>

      <div className="clinical-grid">
        {/* Left Sidebar (4 cols) */}
        <aside className="col-4">
          <div className="panel">
            <h2>Patient Context</h2>
            <select className="patient-select" value={patient.patient_id} onChange={handlePatientSelect}>
              {patientsList.map(p => <option key={p.patient_id} value={p.patient_id}>Patient {p.patient_id}</option>)}
            </select>
            
            <div className="patient-summary">
              <div className="summary-item" style={{flex: 1}}>
                <span>Age</span>
                <b>{patient.age_years.toFixed(0)} yrs</b>
              </div>
              <div className="summary-item" style={{flex: 1}}>
                <span>Sex</span>
                <b>{patient.gender === 1 ? 'Female' : 'Male'}</b>
              </div>
              <div className="summary-item" style={{flex: 1}}>
                <span>Source</span>
                <b>Clinical Records</b>
              </div>
            </div>

            <div className="form-grid" style={{marginTop: '16px'}}>
              <label>Weight (kg)<input type="number" value={patient.weight} onChange={e => changeBase('weight', e.target.value)} /></label>
              <label>Height (cm)<input type="number" value={patient.height} onChange={e => changeBase('height', e.target.value)} /></label>
              
              <label className="full">Systolic BP<input type="number" value={patient.ap_hi} onChange={e => changeBase('ap_hi', e.target.value)} /></label>
              <label className="full">Diastolic BP<input type="number" value={patient.ap_lo} onChange={e => changeBase('ap_lo', e.target.value)} /></label>
              
              <label className="full">Cholesterol
                <select value={patient.cholesterol} onChange={e => changeBase('cholesterol', e.target.value)}>
                  <option value="1">Normal</option><option value="2">Above normal</option><option value="3">High</option>
                </select>
              </label>
              
              <label className="full">Glucose
                <select value={patient.gluc} onChange={e => changeBase('gluc', e.target.value)}>
                  <option value="1">Normal</option><option value="2">Above normal</option><option value="3">High</option>
                </select>
              </label>
              
              <label className="check"><input type="checkbox" checked={!!patient.smoke} onChange={e => changeBase('smoke', +e.target.checked)} /> Smoker</label>
              <label className="check"><input type="checkbox" checked={!!patient.active} onChange={e => changeBase('active', +e.target.checked)} /> Active</label>
            </div>
            
            <button className="primary" onClick={() => assess(patient)} disabled={loading}>
              {loading ? 'Processing...' : 'Run New Assessment'}
            </button>
          </div>

          <div className="panel" style={{marginTop: '16px'}}>
            <h2>Simulated Live Telemetry</h2>
            <div className="telemetry-status">
              <div><span className="status-dot"></span> <b>Connected</b> (Update 3s)</div>
              <span>ID: {patient.patient_id}</span>
            </div>
            
            {telemetry ? (
              <div className="telemetry-data">
                <div>
                  <div className="tel-val">{telemetry.systolic_bp} / {telemetry.diastolic_bp}</div>
                  <div className="tel-label">Blood Pressure (mmHg)</div>
                  
                  <div className="tel-val" style={{marginTop: '8px'}}>{telemetry.heart_rate}</div>
                  <div className="tel-label">Heart Rate (bpm)</div>
                </div>
                <div>
                  <Sparkline data={hrHistory} />
                  <div className="tel-label" style={{textAlign: 'right'}}>HR Trend</div>
                </div>
              </div>
            ) : (
              <p className="sub">Awaiting telemetry frames...</p>
            )}
          </div>
        </aside>

        {/* Main Content (8 cols) */}
        <div className="col-8">
          {result && (
            <div className="clinical-grid">
              
              <div className="col-12 panel">
                <h2>Primary Risk Assessment</h2>
                <Gauge score={result.prediction.risk_score} category={result.prediction.risk_category} model_used={result.prediction.model_used} />
              </div>

              <div className="col-6 panel">
                <h2>Explainable Risk Drivers</h2>
                <p className="sub" style={{marginBottom: '16px'}}>Method: {result.explanation.method}</p>
                <ShapDivergingChart data={result.explanation} />
              </div>

              <div className="col-6 panel">
                <h2>Cardiovascular Health Profile</h2>
                <HealthProfile patient={patient} indicators={result.indicators} />
              </div>

              <div className="col-12 panel">
                <h2>Projected Scenario (What-If Simulator)</h2>
                <div className="clinical-grid" style={{gap: '24px'}}>
                  <div className="col-5">
                    <p className="sub" style={{marginBottom: '12px'}}>Adjust modifiable factors below:</p>
                    <div className="sim-controls">
                      <label>Systolic BP <input type="number" value={simPatient.ap_hi} onChange={e => changeSim('ap_hi', e.target.value)} /></label>
                      <label>Weight (kg) <input type="number" value={simPatient.weight} onChange={e => changeSim('weight', e.target.value)} /></label>
                      <label>Cholesterol 
                        <select value={simPatient.cholesterol} onChange={e => changeSim('cholesterol', e.target.value)} style={{width: '90px'}}>
                          <option value="1">Normal</option><option value="2">Above</option><option value="3">High</option>
                        </select>
                      </label>
                      <label>Active 
                        <select value={simPatient.active} onChange={e => changeSim('active', e.target.value)} style={{width: '90px'}}>
                          <option value="1">Yes</option><option value="0">No</option>
                        </select>
                      </label>
                    </div>
                    <button className="primary" onClick={runWhatIf} disabled={changedFactors.length === 0}>
                      Recalculate Projected Risk
                    </button>
                  </div>
                  
                  <div className="col-7">
                    <div className="sim-comparison">
                      <div className="sim-box">
                        <span>Current Assessed</span>
                        <b>{result.prediction.risk_score.toFixed(1)}%</b>
                      </div>
                      <div style={{color: '#94A6B8'}}>→</div>
                      <div className="sim-box">
                        <span>Projected</span>
                        <b>{simResult ? simResult.simulated.risk_score.toFixed(1) : '-'}%</b>
                      </div>
                      
                      {simResult && (
                        <div style={{gridColumn: '1 / -1', marginTop: '8px'}}>
                          <div className={`sim-diff ${simResult.difference_points > 0 ? 'inc' : simResult.difference_points < 0 ? 'dec' : ''}`}>
                            {simResult.difference_points > 0 ? '+' : ''}{simResult.difference_points.toFixed(1)} percentage points
                          </div>
                          <div className="changed-factors">
                            Changed: {changedFactors.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 panel">
                <h2>Population Context & Evaluation</h2>
                <div className="clinical-grid">
                  <div className="col-6">
                    <div className="muted-box">
                      <strong>WHO GHO Benchmark:</strong>
                      <br />
                      {who?.message || 'Status unavailable'}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="muted-box">
                      <details>
                        <summary style={{cursor: 'pointer', fontWeight: 600}}>Model Evaluation (ROC-AUC)</summary>
                        <div style={{marginTop: '8px', display: 'grid', gap: '4px'}}>
                          {modelInfo?.metrics.map(m => (
                            <div key={m.model} style={{display: 'flex', justifyContent: 'space-between'}}>
                              <span>{m.model}</span>
                              <strong>{(m.roc_auc * 100).toFixed(1)}%</strong>
                            </div>
                          ))}
                          <small style={{marginTop: '8px'}}>Selected via highest hold-out ROC-AUC.</small>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
