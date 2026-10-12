import re

with open("src/components/ModelTestingModal.jsx", "r") as f:
    code = f.read()

# Replace state
code = code.replace(
    "const [results, setResults] = useState(null);",
    """const [selectedModel, setSelectedModel] = useState('XGBoost');
  const [result, setResult] = useState(null);
  const [modelMetrics, setModelMetrics] = useState([]);"""
)

# Add useEffect for metrics
metrics_effect = """
  useEffect(() => {
    if (open && modelMetrics.length === 0) {
      fetch(`${API}/api/models`)
        .then(res => res.json())
        .then(data => {
          if (data.metrics) setModelMetrics(data.metrics);
        })
        .catch(err => console.error("Failed to load model metrics", err));
    }
  }, [open, modelMetrics.length]);
"""
code = code.replace("  // Sync local input from patient prop whenever modal opens", metrics_effect + "\n  // Sync local input from patient prop whenever modal opens")

# Fix animReady effect
code = code.replace(
    "if (results) {",
    "if (result) {"
).replace(
    "}, [results]);",
    "}, [result]);"
)

# handleModelSelect
handle_model_select = """
  const handleModelSelect = (name) => {
    setSelectedModel(name);
    setResult(null);
    setError(null);
    setHasRun(false);
  };
"""

# replace handleRunAll with handleRunModel
handle_run_model = """
  const handleRunModel = useCallback(async () => {
    if (!inputData) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setHasRun(true);
    try {
      const res = await fetch(`${API}/api/model-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, patient: inputData }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unable to test this model. Please verify that the trained model is available.');
    } finally {
      setLoading(false);
    }
  }, [inputData, selectedModel]);
"""
code = re.sub(r'const handleRunAll = useCallback.*?\}, \[inputData\]\);', handle_model_select + handle_run_model, code, flags=re.DOTALL)

# fix handleClose
code = code.replace("setResults(null);", "setResult(null);")

# fix sortedResults -> sortedMetrics
sorted_metrics = """
  const sortedMetrics = modelMetrics.length > 0
    ? MODEL_ORDER.map(name => modelMetrics.find(m => m.model === name) || { model: name, is_deployed: name === 'XGBoost' })
    : MODEL_ORDER.map(name => ({ model: name, is_deployed: name === 'XGBoost' }));
"""
code = re.sub(r'const sortedResults = results.*?\[\];', sorted_metrics, code, flags=re.DOTALL)

# Add model selection UI to Left Panel
model_selection_ui = """
              {/* Model Selection */}
              <div className="mt-model-selection" style={{ marginBottom: '24px' }}>
                <div className="mt-panel-section-title">SELECT MODEL TO TEST</div>
                <div className="mt-model-select-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {MODEL_ORDER.map(name => {
                    const meta = MODEL_META[name];
                    const isSelected = selectedModel === name;
                    return (
                      <div 
                        key={name}
                        onClick={() => handleModelSelect(name)}
                        style={{
                          border: isSelected ? `2px solid ${meta.color}` : '1px solid var(--border-light)',
                          background: isSelected ? meta.colorBg : 'var(--bg-card)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ marginTop: '2px', color: isSelected ? meta.color : 'var(--text-muted)' }}>
                           {isSelected ? '●' : '○'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                            <span style={{ marginRight: '6px' }}>{meta.icon}</span> {name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {meta.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
"""
code = code.replace('{/* Numeric inputs */}', model_selection_ui + '\n              {/* Numeric inputs */}')

# Replace Run Button
run_btn = """
              {/* Action: Run Selected */}
              <button
                className="mt-run-btn"
                onClick={handleRunModel}
                disabled={loading}
                id="btn-model-testing-run"
                style={{ background: MODEL_META[selectedModel]?.color || 'var(--color-primary)' }}
              >
                {loading ? (
                  <>
                    <span className="mt-spinner" />
                    Testing {selectedModel}...
                  </>
                ) : (
                  <>
                    ▶ Run Selected Model
                  </>
                )}
              </button>
"""
code = re.sub(r'\{/\* Action: Run All \*/\}.*?</button>', run_btn, code, flags=re.DOTALL)

# Remove architecture diagram
code = re.sub(r'\{/\* Architecture diagram \*/\}.*?</div>\s*</div>\s*</div>', '</div>\n          </div>', code, flags=re.DOTALL)

# Replace Right Panel
right_panel = """
          {/* ══ RIGHT PANEL: Results ════════════════════════════════════════ */}
          <div className="mt-right-panel">

            {/* — Pre-run placeholder — */}
            {!result && !loading && !error && (
              <div className="mt-empty-state">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{MODEL_META[selectedModel]?.icon}</div>
                <p style={{ fontSize: '18px', fontWeight: 600 }}>{selectedModel}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-blue)', fontWeight: 700, margin: '8px 0' }}>READY TO TEST</p>
                <p style={{ fontSize: '13px', opacity: 0.7 }}>Configure patient parameters on the left<br />then click <strong>Run Selected Model</strong>.</p>
              </div>
            )}

            {/* — Loading — */}
            {loading && (
              <div className="mt-loading-state">
                <div className="mt-loading-spinner-lg" />
                <p style={{ fontWeight: 700, letterSpacing: '0.05em', fontSize: '12px', color: 'var(--text-muted)' }}>TESTING MODEL</p>
                <p className="mt-loading-sub" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: '8px 0' }}>{selectedModel}</p>
                <p style={{ fontSize: '13px', opacity: 0.7 }}>Loading prediction...</p>
              </div>
            )}

            {/* — Error — */}
            {error && (
              <div className="mt-error-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <strong>Error</strong>
                  <p style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>{error}</p>
                </div>
              </div>
            )}

            {/* — Model Card — */}
            {result && !loading && (
              <>
                <div className="mt-results-section-title" style={{ marginBottom: '16px' }}>
                  Current Patient Test Result
                </div>

                <div className="mt-model-cards-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '400px', margin: '0 auto 32px' }}>
                  {(() => {
                    const item = result;
                    const meta = MODEL_META[item.model] || {};
                    const pred = item.prediction;
                    const perf = item.performance_metrics || {};

                    return (
                      <div
                        className={`mt-model-card ${item.is_deployed ? 'deployed' : ''} ${animReady ? 'anim-in' : ''}`}
                        style={{
                          '--model-color': meta.color,
                          '--model-color-bg': meta.colorBg,
                          '--model-color-border': meta.colorBorder,
                          transitionDelay: `0ms`,
                        }}
                      >
                        {/* Card header */}
                        <div className="mt-card-header">
                          <div className="mt-card-header-left">
                            <span className="mt-card-icon" style={{ color: meta.color }}>{meta.icon}</span>
                            <div>
                              <div className="mt-card-model-name" style={{ fontSize: '16px' }}>{item.model_display || item.model}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>MODEL UNDER TEST</div>
                            </div>
                          </div>
                          {pred && (
                            <div className="mt-card-risk-number" style={{ color: meta.color, fontSize: '24px' }}>
                              {pred.risk_score.toFixed(1)}%
                            </div>
                          )}
                        </div>

                        {/* Risk category */}
                        <div className="mt-card-risk-row">
                          <RiskBadge category={pred?.risk_category} />
                          <span className="mt-card-prob-label">
                            Probability: {pred?.risk_probability?.toFixed(4)}
                          </span>
                        </div>

                        {/* Risk bar */}
                        <div className="mt-card-risk-bar-wrap">
                          <div className="mt-card-risk-bar-track">
                            <div
                              className="mt-card-risk-bar-fill"
                              style={{
                                width: animReady ? `${Math.min(100, pred?.risk_score || 0)}%` : '0%',
                                background: meta.color,
                                transitionDelay: `200ms`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Performance metrics inside card */}
                        <div className="mt-card-metrics" style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                          <div className="mt-card-metric-row">
                            <span className="mt-card-metric-label">Accuracy</span>
                            <MetricBar value={perf.accuracy} color={meta.color} />
                            <span className="mt-card-metric-val">{perf.accuracy != null ? `${(perf.accuracy * 100).toFixed(1)}%` : '—'}</span>
                          </div>
                          <div className="mt-card-metric-row">
                            <span className="mt-card-metric-label">ROC-AUC</span>
                            <MetricBar value={perf.roc_auc} color={meta.color} />
                            <span className="mt-card-metric-val">{perf.roc_auc != null ? `${(perf.roc_auc * 100).toFixed(2)}%` : '—'}</span>
                          </div>
                          <div className="mt-card-metric-row">
                            <span className="mt-card-metric-label">F1</span>
                            <MetricBar value={perf.f1} color={meta.color} />
                            <span className="mt-card-metric-val">{perf.f1 != null ? `${(perf.f1 * 100).toFixed(1)}%` : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ── Full Metrics Comparison Table ── */}
                <div className="mt-comparison-section">
                  <div className="mt-comparison-title">
                    Model Performance Evaluation (Test Partition)
                  </div>

                  {/* Metric selector */}
                  <div className="mt-metric-tabs">
                    {metricTabs.map(tab => (
                      <button
                        key={tab.key}
                        className={`mt-metric-tab ${activeMetric === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveMetric(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div className="mt-bar-chart">
                    {sortedMetrics.map((item, idx) => {
                      const meta = MODEL_META[item.model] || {};
                      const val = (item[activeMetric] || 0) * 100;
                      const maxVal = 85;
                      const barW = animReady ? Math.min(98, (val / maxVal) * 94) : 0;
                      return (
                        <div key={item.model} className={`mt-bar-row ${item.is_deployed ? 'deployed' : ''}`}>
                          <div className="mt-bar-label">
                            <span style={{ color: meta.color }}>{meta.icon}</span>
                            <span className="mt-bar-model-name">{item.model}</span>
                            {item.is_deployed && <span className="mt-bar-deployed-dot" style={{ background: meta.color }} />}
                          </div>
                          <div className="mt-bar-track">
                            <div
                              className="mt-bar-fill"
                              style={{
                                width: `${barW}%`,
                                background: item.is_deployed
                                  ? `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}CC 100%)`
                                  : `linear-gradient(90deg, ${meta.color}88 0%, ${meta.color}55 100%)`,
                                transition: `width 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 100}ms`,
                              }}
                            >
                              <span className="mt-bar-inner-label">{val.toFixed(1)}%</span>
                            </div>
                          </div>
                          <span className="mt-bar-val" style={{ color: item.is_deployed ? meta.color : undefined }}>
                            {val.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Full table */}
                  <table className="mt-detail-table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Accuracy</th>
                        <th>Precision</th>
                        <th>Recall</th>
                        <th>F1</th>
                        <th>ROC-AUC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMetrics.map(item => {
                        const meta = MODEL_META[item.model] || {};
                        return (
                          <tr key={item.model} className={item.is_deployed ? 'mt-table-selected' : ''}>
                            <td className="mt-table-model-cell">
                              <span className="mt-table-dot" style={{ background: meta.color }} />
                              {item.model}
                            </td>
                            <td>{item.accuracy != null ? `${(item.accuracy * 100).toFixed(1)}%` : '—'}</td>
                            <td>{item.precision != null ? `${(item.precision * 100).toFixed(1)}%` : '—'}</td>
                            <td>{item.recall != null ? `${(item.recall * 100).toFixed(1)}%` : '—'}</td>
                            <td>{item.f1 != null ? `${(item.f1 * 100).toFixed(1)}%` : '—'}</td>
                            <td className={item.is_deployed ? 'mt-table-best-auc' : ''}>
                              {item.roc_auc != null ? `${(item.roc_auc * 100).toFixed(2)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Best ROC-AUC callout */}
                  <div className="mt-best-auc-callout">
                    <span className="mt-best-auc-icon">🏆</span>
                    <strong>Best ROC-AUC: XGBoost — 80.37%</strong>
                    <span className="mt-best-auc-note">Selected as the deployed classifier based on highest test ROC-AUC.</span>
                  </div>
                </div>

                {/* ── Why XGBoost? ── */}
                <div className="mt-why-section">
                  <div className="mt-why-title">
                    <span>⚡</span> Why XGBoost?
                  </div>
                  <p className="mt-why-body">
                    All four models were trained and evaluated using the same dataset and evaluation procedure.
                    XGBoost achieved the highest ROC-AUC (<strong>80.37%</strong>) and was therefore selected as the
                    deployed classifier for the main clinical risk assessment. ROC-AUC was used as the primary
                    selection criterion because it measures discriminative capacity across all classification
                    thresholds, making it more robust than accuracy for imbalanced clinical outcomes.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
"""
code = re.sub(r'\{/\* ══ RIGHT PANEL: Results ════════════════════════════════════════ \*/\}.*?(?=\{/\* ══ FOOTER)', right_panel + '\n\n        ', code, flags=re.DOTALL)

with open("src/components/ModelTestingModal.jsx", "w") as f:
    f.write(code)

