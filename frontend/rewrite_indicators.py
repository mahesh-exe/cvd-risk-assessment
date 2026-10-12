import json
import re

with open('old_indicators.jsx', 'r') as f:
    content = f.read()

# Add onSelectIndicator
content = content.replace(
    '  onHoverFactor\n}) {',
    '  onHoverFactor,\n  onSelectIndicator\n}) {'
)

# Add onClick, onKeyDown, role, tabIndex, cursor
replacement = """          <div
            key={item.id}
            role="button"
            tabIndex={0}
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
            style={{ cursor: 'pointer' }}
          >"""
          
content = content.replace(
"""          <div
            key={item.id}
            className={`bullet-indicator-row ${isCrossActive ? 'cross-highlighted' : ''}`}
            onMouseEnter={() => { if (onHoverFactor) onHoverFactor(item.id); }}
            onMouseLeave={() => { if (onHoverFactor) onHoverFactor(null); }}
          >""",
    replacement
)

with open('src/components/HealthBulletIndicators.jsx', 'w') as f:
    f.write(content)
