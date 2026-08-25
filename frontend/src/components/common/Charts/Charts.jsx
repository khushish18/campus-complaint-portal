import React, { useState } from 'react';
import './Charts.css';

// ----------------------------------------------------
// 1. Doughnut Chart Component
// ----------------------------------------------------
export const DoughnutChart = ({ data = [], title = "" }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  const strokeWidth = 14;
  const center = 70; // viewBox is 140x140

  let currentOffset = 0;

  // Process data to include stroke parameters
  const processedData = data.map((item) => {
    const percentage = total > 0 ? item.value / total : 0;
    const strokeLength = circumference * percentage;
    const strokeOffset = circumference - strokeLength + currentOffset;
    // We update offset for next segment (SVG offsets run counter-clockwise)
    currentOffset -= strokeLength;

    return {
      ...item,
      percentage: (percentage * 100).toFixed(1),
      strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
      strokeDashoffset: strokeOffset,
    };
  });

  return (
    <div className="custom-chart-container doughnut-wrapper">
      {title && <h5 className="chart-title">{title}</h5>}
      <div className="doughnut-content">
        <div className="doughnut-svg-container">
          <svg width="100%" height="100%" viewBox="0 0 140 140" className="doughnut-svg">
            {/* Background track circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--bg-secondary)"
              strokeWidth={strokeWidth}
            />
            {total === 0 ? (
              // Empty state circle
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="var(--text-muted)"
                strokeWidth={strokeWidth}
                strokeDasharray="4 4"
              />
            ) : (
              processedData.map((item, idx) => (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color || 'var(--primary)'}
                  strokeWidth={strokeWidth + (hoveredIdx === idx ? 2 : 0)}
                  strokeDasharray={item.strokeDasharray}
                  strokeDashoffset={item.strokeDashoffset}
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ))
            )}
            
            {/* Center label */}
            <g className="doughnut-center-text">
              <text x={center} y={center - 4} textAnchor="middle" className="doughnut-center-val">
                {total}
              </text>
              <text x={center} y={center + 12} textAnchor="middle" className="doughnut-center-lbl">
                Total
              </text>
            </g>
          </svg>
        </div>

        {/* Legends */}
        <div className="doughnut-legends">
          {processedData.map((item, idx) => (
            <div
              key={idx}
              className={`doughnut-legend-item ${hoveredIdx === idx ? 'active' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span className="legend-dot" style={{ backgroundColor: item.color }} />
              <span className="legend-label">{item.label}</span>
              <span className="legend-value">{item.value} <span className="legend-percent">({item.percentage}%)</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. Horizontal Bar Chart Component
// ----------------------------------------------------
export const BarChart = ({ data = [], title = "", colorVar = "--primary" }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="custom-chart-container bar-chart-wrapper">
      {title && <h5 className="chart-title">{title}</h5>}
      <div className="bar-chart-list">
        {data.map((item, idx) => {
          const widthPercent = ((item.value / maxVal) * 100).toFixed(1);
          return (
            <div key={idx} className="bar-chart-row">
              <div className="bar-label" title={item.label}>
                {item.label}
              </div>
              <div className="bar-track-wrapper">
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: item.color || `var(${colorVar})`,
                    }}
                  />
                </div>
              </div>
              <div className="bar-value">
                {item.value}
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <div className="chart-empty-state">No data recorded.</div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. Line/Area Chart Component (Trends)
// ----------------------------------------------------
export const LineChart = ({ data = [], title = "" }) => {
  const [activeIdx, setActiveIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="custom-chart-container line-chart-wrapper">
        {title && <h5 className="chart-title">{title}</h5>}
        <div className="chart-empty-state">No data recorded.</div>
      </div>
    );
  }

  // Sizing configurations
  const viewBoxWidth = 500;
  const viewBoxHeight = 180;
  
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.count), 4); // default minimum ceiling
  
  // Calculate coordinates
  const points = data.map((d, index) => {
    const x = paddingLeft + (data.length > 1 ? index * (chartWidth / (data.length - 1)) : chartWidth / 2);
    const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
    return { x, y, label: d.date, value: d.count };
  });

  // Construct Line Path string (D)
  let linePath = "";
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Linear path
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  // Construct Area Path (filled overlay)
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : "";

  return (
    <div className="custom-chart-container line-chart-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        {title && <h5 className="chart-title" style={{ margin: 0 }}>{title}</h5>}
        {activeIdx !== null && (
          <div className="line-tooltip-badge">
            <strong>{points[activeIdx].label}</strong>: {points[activeIdx].value} complaints
          </div>
        )}
      </div>

      <div className="line-svg-container">
        <svg width="100%" height="100%" viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="line-svg">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const gridVal = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx} className="line-grid-line">
                <line x1={paddingLeft} y1={y} x2={viewBoxWidth - paddingRight} y2={y} stroke="var(--border-color)" strokeDasharray="3 3" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="line-grid-text">
                  {gridVal}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          {areaPath && (
            <path d={areaPath} fill="url(#areaGrad)" />
          )}

          {/* Draw Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactivity Dots */}
          {points.map((p, idx) => (
            <g key={idx}>
              {/* Invisible large overlay circle for hover detection */}
              <circle
                cx={p.x}
                cy={p.y}
                r="16"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              />
              {/* Styled visible dots */}
              <circle
                cx={p.x}
                cy={p.y}
                r={activeIdx === idx ? 6 : 4}
                fill={activeIdx === idx ? "var(--primary)" : "var(--bg-card)"}
                stroke="var(--primary)"
                strokeWidth="2"
                style={{
                  pointerEvents: 'none',
                  transition: 'all 0.15s ease'
                }}
              />
            </g>
          ))}

          {/* X Axis ticks */}
          {points.map((p, idx) => {
            // Decimate X labels if too long (e.g. show alternate labels if data count > 10)
            const showLabel = points.length <= 10 || idx % Math.ceil(points.length / 8) === 0 || idx === points.length - 1;
            if (!showLabel) return null;
            
            return (
              <text
                key={idx}
                x={p.x}
                y={viewBoxHeight - 10}
                textAnchor="middle"
                className="line-axis-text"
              >
                {p.label.length > 10 ? p.label.substring(5) : p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
