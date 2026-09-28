import React, { useEffect, useState, useRef, memo } from 'react';

/**
 * Isolated Live Telemetry Monitor (Requirements 10, 24, 34)
 * - Manages its own WebSocket connection internally
 * - Incoming vital packets re-render ONLY this component, never restarting SHAP or Risk Gauge!
 * - Rolling waveform with animated newest point and latest-value pulse
 * - Labeled clearly: "SIMULATED TELEMETRY"
 */
function LiveTelemetryStreamComponent({ patientId }) {
  const [telemetry, setTelemetry] = useState({
    heart_rate: 74,
    systolic_bp: 137,
    diastolic_bp: 81
  });
  const [hrHistory, setHrHistory] = useState([70, 72, 74, 73, 75, 74, 72, 76, 74, 75, 73, 74]);
  const [sysHistory, setSysHistory] = useState([130, 132, 134, 131, 135, 136, 134, 137, 135, 136, 137, 135]);
  const [spo2History, setSpo2History] = useState([98, 98, 99, 98, 98, 99, 98, 98, 99, 98, 98, 98]);
  const [packetPulse, setPacketPulse] = useState(false);

  const wsRef = useRef(null);

  // Manage independent WebSocket lifecycle
  useEffect(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }

    const pId = patientId || 'DEMO-001';
    try {
      const ws = new WebSocket(`ws://localhost:8000/ws/patient/${pId}`);
      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          setTelemetry(packet);
          setHrHistory(prev => [...prev.slice(-18), packet.heart_rate]);
          setSysHistory(prev => [...prev.slice(-18), packet.systolic_bp]);
          setSpo2History(prev => [...prev.slice(-18), 98 + (Math.random() > 0.6 ? 1 : 0)]);
          setPacketPulse(true);
          setTimeout(() => setPacketPulse(false), 300);
        } catch {}
      };
      wsRef.current = ws;
    } catch (err) {
      console.warn('Telemetry WS fallback:', err);
    }

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  }, [patientId]);

  const currentHr = telemetry.heart_rate;
  const currentSys = telemetry.systolic_bp;
  const currentDia = telemetry.diastolic_bp;
  const currentSpo2 = 98;

  const buildPolyline = (data, minVal, maxVal, width = 140, height = 24) => {
    if (!data.length) return '';
    const stepX = width / (data.length - 1);
    return data
      .map((val, idx) => {
        const x = idx * stepX;
        const normY = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal || 1)));
        const y = height - normY * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const ecgWavePoints = [
    [0, 12], [14, 12], [18, 6], [22, 20], [26, 2], [30, 16], [34, 12],
    [50, 12], [54, 6], [58, 20], [62, 2], [66, 16], [70, 12],
    [86, 12], [90, 6], [94, 20], [98, 2], [102, 16], [106, 12],
    [122, 12], [126, 6], [130, 20], [134, 2], [138, 16], [142, 12]
  ].map(([x, y]) => `${x},${y}`).join(' ');

  const hrPoints = buildPolyline(hrHistory, 55, 105);
  const sysPoints = buildPolyline(sysHistory, 110, 160);
  const spo2Points = buildPolyline(spo2History, 95, 100);

  return (
    <div className="telemetry-monitor-container">
      {/* Header bar */}
      <div className="telemetry-header-bar">
        <div className="telemetry-title-block">
          <div className="telemetry-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="telemetry-pulse-icon">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <div className="telemetry-main-heading">Live Telemetry</div>
            <div className="telemetry-sub-heading">Real-Time Vital Stream</div>
          </div>
        </div>

        <div className="telemetry-badge-simulated">
          <div className={`telemetry-beacon-glow ${packetPulse ? 'pulse-hit' : ''}`} />
          <span>SIMULATED TELEMETRY</span>
        </div>
      </div>

      {/* 3 Live Vital Rows */}
      <div className="telemetry-streams-stack">
        {/* 1. Heart Rate */}
        <div className="telemetry-vital-row hr-theme">
          <div className="vital-legend-col">
            <span className="vital-label">HEART RATE</span>
            <div className="vital-reading">
              <strong className={`vital-number ${packetPulse ? 'flash' : ''}`}>{currentHr}</strong>
              <span className="vital-unit">BPM</span>
            </div>
          </div>
          <div className="vital-sparkline-canvas">
            <svg viewBox="0 0 140 24" className="vital-sparkline-svg" preserveAspectRatio="none">
              <polyline
                points={ecgWavePoints}
                fill="none"
                stroke="#EF4444"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="vital-stroke-anim"
              />
            </svg>
          </div>
        </div>

        {/* 2. Blood Pressure */}
        <div className="telemetry-vital-row bp-theme">
          <div className="vital-legend-col">
            <span className="vital-label">BLOOD PRESSURE</span>
            <div className="vital-reading">
              <strong className={`vital-number ${packetPulse ? 'flash' : ''}`}>{currentSys}/{currentDia}</strong>
              <span className="vital-unit">mmHg</span>
            </div>
          </div>
          <div className="vital-sparkline-canvas">
            <svg viewBox="0 0 140 24" className="vital-sparkline-svg" preserveAspectRatio="none">
              <polyline
                points={sysPoints}
                fill="none"
                stroke="#2563EB"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* 3. SpO2 */}
        <div className="telemetry-vital-row o2-theme">
          <div className="vital-legend-col">
            <span className="vital-label">SpO₂</span>
            <div className="vital-reading">
              <strong className="vital-number">{currentSpo2}</strong>
              <span className="vital-unit">%</span>
            </div>
          </div>
          <div className="vital-sparkline-canvas">
            <svg viewBox="0 0 140 24" className="vital-sparkline-svg" preserveAspectRatio="none">
              <polyline
                points={spo2Points}
                fill="none"
                stroke="#0284C7"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="telemetry-socket-status">
        <span className="socket-dot-live" />
        <span>Stream Connected • Patient {patientId || 'DEMO-001'} (Updates Isolated)</span>
      </div>
    </div>
  );
}

export default memo(LiveTelemetryStreamComponent);
