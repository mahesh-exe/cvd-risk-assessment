import re

with open("src/components/ModelTestingModal.jsx", "r") as f:
    code = f.read()

# Add imports
lucide_import = "import { Network, BoxSelect, Cpu, BrainCircuit, Activity, Heart, ShieldAlert, ChevronRight, AlertTriangle, Info, PlayCircle } from 'lucide-react';\n"
code = code.replace("import React, { useState, useEffect, useCallback } from 'react';", "import React, { useState, useEffect, useCallback } from 'react';\n" + lucide_import)

# Change MODEL_META icons to Lucide components instead of strings
code = code.replace("icon: '🌳',", "icon: <Network size={22} />,")
code = code.replace("icon: '⬡',", "icon: <BoxSelect size={22} />,")
code = code.replace("icon: '⚡',", "icon: <Cpu size={22} />,")
code = code.replace("icon: '🧠',", "icon: <BrainCircuit size={22} />,")

# Increase font size for model names in selection list
code = code.replace("fontWeight: 700, fontSize: '13px'", "fontWeight: 700, fontSize: '15px'")

# Increase title font
code = code.replace("h1 className=\"mt-modal-title\"", "h1 className=\"mt-modal-title\" style={{ fontSize: '24px' }}")

# Improve button text size
code = code.replace("▶ Run Selected Model", "<PlayCircle size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> <span style={{ fontSize: '16px', fontWeight: 600 }}>Run Selected Model</span>")
# Fix button rendering which uses raw text
code = code.replace("Testing {selectedModel}...", "<span style={{ fontSize: '16px', fontWeight: 600 }}>Testing {selectedModel}...</span>")

# Empty state
code = code.replace("font-size: '48px'", "fontSize: '48px'")
code = code.replace("p style={{ fontSize: '18px', fontWeight: 600 }}", "p style={{ fontSize: '24px', fontWeight: 700, marginTop: '12px' }}")

# Result card risk score font size
code = code.replace("fontSize: '24px'", "fontSize: '32px', fontWeight: 800")
code = code.replace("fontSize: '16px'", "fontSize: '20px', fontWeight: 700")

# Full table font size (inline CSS for table header)
table_css = "style={{ fontSize: '14px' }}"
code = code.replace("<th>Model</th>", f"<th {table_css}>Model</th>")
code = code.replace("<th>Accuracy</th>", f"<th {table_css}>Accuracy</th>")
code = code.replace("<th>Precision</th>", f"<th {table_css}>Precision</th>")
code = code.replace("<th>Recall</th>", f"<th {table_css}>Recall</th>")
code = code.replace("<th>F1</th>", f"<th {table_css}>F1</th>")
code = code.replace("<th>ROC-AUC</th>", f"<th {table_css}>ROC-AUC</th>")

with open("src/components/ModelTestingModal.jsx", "w") as f:
    f.write(code)

