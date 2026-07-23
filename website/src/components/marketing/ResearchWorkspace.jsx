import { useRef, useState } from "react";

const tabs = [
  { id: "summary", label: "Summary" },
  { id: "valuation", label: "Valuation" },
  { id: "assumptions", label: "Assumptions" },
  { id: "sources", label: "Sources" },
  { id: "lineage", label: "Lineage" },
  { id: "files", label: "Files" },
];

const scenarioValues = [
  { label: "Bear", value: "$130.18", tone: "negative" },
  { label: "Base", value: "$195.25", tone: "positive" },
  { label: "Bull", value: "$316.86", tone: "info" },
];

const forecast = [
  { year: "2026", value: 82 },
  { year: "2027", value: 101 },
  { year: "2028", value: 137 },
  { year: "2029", value: 174 },
  { year: "2030", value: 198 },
  { year: "Terminal", value: 232 },
];

const sources = [
  { name: "SEC company facts", date: "2026-03-28", status: "Current", tone: "current" },
  { name: "AAPL market snapshot", date: "2026-07-21", status: "Stale", tone: "stale" },
  { name: "U.S. Treasury", date: "2026-07-17", status: "Aging", tone: "aging" },
];

const assumptions = [
  ["Revenue growth", "7.0%", "Analyst judgment"],
  ["EBIT margin", "33.0%", "Analyst judgment"],
  ["WACC", "8.5%", "Formula-driven"],
  ["Terminal growth", "3.0%", "Analyst judgment"],
];

function ForecastChart() {
  const width = 520;
  const height = 224;
  const margin = { top: 18, right: 20, bottom: 36, left: 42 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (index / (forecast.length - 1)) * innerWidth;
  const y = (value) => margin.top + innerHeight - (value / 250) * innerHeight;
  const points = forecast.map((datum, index) => `${x(index)},${y(datum.value)}`).join(" ");

  return (
    <section
      className="chart-pane"
      aria-labelledby="valuation-chart-title"
      aria-describedby="valuation-chart-summary"
    >
      <header>
        <h3 id="valuation-chart-title">Base-case forecast</h3>
        <span>USD mm · illustrative</span>
      </header>
      <div className="chart-wrap" aria-hidden="true">
        <svg viewBox={`0 0 ${width} ${height}`} role="presentation" focusable="false">
          {[0, 50, 100, 150, 200, 250].map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                y1={y(tick)}
                x2={width - margin.right}
                y2={y(tick)}
                className="chart-gridline"
              />
              <text x={margin.left - 10} y={y(tick) + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {forecast.map((datum, index) => (
            <g key={datum.year}>
              <line
                x1={x(index)}
                y1={margin.top}
                x2={x(index)}
                y2={height - margin.bottom}
                className="chart-gridline"
              />
              <text x={x(index)} y={height - 12} textAnchor="middle">
                {datum.year}
              </text>
            </g>
          ))}
          <polyline points={points} className="chart-line" />
          {forecast.map((datum, index) => (
            <circle key={datum.year} cx={x(index)} cy={y(datum.value)} r="4" className="chart-point" />
          ))}
        </svg>
      </div>
      <p className="sr-only" id="valuation-chart-summary">
        Illustrative base-case forecast in USD millions: 2026, 82; 2027, 101; 2028, 137;
        2029, 174; 2030, 198; terminal value, 232.
      </p>
    </section>
  );
}

function SummaryPanel() {
  return (
    <div className="summary-grid">
      <div className="summary-grid__ledger">
        <section className="ledger-pane" aria-labelledby="intrinsic-value-title">
          <h3 id="intrinsic-value-title">Intrinsic value per share</h3>
          <dl className="scenario-ledger">
            {scenarioValues.map((scenario) => (
              <div key={scenario.label}>
                <dt>{scenario.label}</dt>
                <dd className={`value-${scenario.tone}`}>{scenario.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="source-pane" aria-labelledby="source-freshness-title">
          <h3 id="source-freshness-title">
            <span>Sources</span>
            <span>Freshness</span>
          </h3>
          <ul>
            {sources.map((source) => (
              <li key={source.name}>
                <span className="source-name">{source.name}</span>
                <span className={`source-state source-state--${source.tone}`}>
                  <span className="source-state__dot" aria-hidden="true" />
                  <span>{source.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="summary-grid__analysis">
        <ForecastChart />
        <dl className="metric-strip">
          <div><dt>Discount rate (WACC)</dt><dd>8.5%</dd></div>
          <div><dt>Terminal growth</dt><dd>3.0%</dd></div>
          <div><dt>Years forecast</dt><dd>5</dd></div>
          <div><dt>Currency</dt><dd>USD</dd></div>
        </dl>
      </div>
    </div>
  );
}

function ValuationPanel() {
  return (
    <div className="detail-panel">
      <div>
        <span className="eyebrow">Scenario range</span>
        <h3>$130.18 — $316.86</h3>
        <p>The market snapshot of $327.54 sits above the modeled bull case.</p>
      </div>
      <table>
        <thead><tr><th>Scenario</th><th>Value / share</th><th>Vs. market</th></tr></thead>
        <tbody>
          <tr><th>Bear</th><td>$130.18</td><td>−60.3%</td></tr>
          <tr><th>Base</th><td>$195.25</td><td>−40.4%</td></tr>
          <tr><th>Bull</th><td>$316.86</td><td>−3.3%</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function AssumptionsPanel() {
  return (
    <div className="detail-panel detail-panel--table">
      <table>
        <thead><tr><th>Base-case assumption</th><th>Value</th><th>Designation</th></tr></thead>
        <tbody>
          {assumptions.map(([label, value, designation]) => (
            <tr key={label}><th>{label}</th><td>{value}</td><td>{designation}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourcesPanel() {
  return (
    <div className="detail-panel detail-panel--table">
      <table>
        <thead><tr><th>Source</th><th>Effective date</th><th>Status</th></tr></thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.name}><th>{source.name}</th><td>{source.date}</td><td>{source.status}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineagePanel() {
  return (
    <div className="detail-panel">
      <div>
        <span className="eyebrow">Lineage basis</span>
        <h3>Author-declared</h3>
        <p>Material source facts and assumptions are linked to the three headline DCF outputs.</p>
      </div>
      <div className="disclosure">
        <span>Attestation</span>
        <strong>Traceable · not independently verified</strong>
      </div>
    </div>
  );
}

function FilesPanel() {
  return (
    <div className="detail-panel detail-panel--table">
      <table>
        <thead><tr><th>File</th><th>Role</th><th>Format</th></tr></thead>
        <tbody>
          <tr><th>OFF.md</th><td>Narrative entrypoint</td><td>Markdown</td></tr>
          <tr><th>apple-dcf-valuation.xlsx</th><td>Model artifact</td><td>XLSX</td></tr>
          <tr><th>SOURCES.md</th><td>Source evidence</td><td>Markdown</td></tr>
        </tbody>
      </table>
    </div>
  );
}

const tabPanels = {
  summary: <SummaryPanel />,
  valuation: <ValuationPanel />,
  assumptions: <AssumptionsPanel />,
  sources: <SourcesPanel />,
  lineage: <LineagePanel />,
  files: <FilesPanel />,
};

export function ResearchWorkspace() {
  const [activeTab, setActiveTab] = useState("summary");
  const tabRefs = useRef([]);

  function selectTab(index) {
    const nextIndex = (index + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  function handleTabKeyDown(event, index) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectTab(tabs.length - 1);
    }
  }

  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <header className="workspace-context">
        <h2 id="workspace-title">AAPL · DCF valuation</h2>
        <div className="workspace-meta">
          <span>Version 2026-07-21</span>
          <span>Base case</span>
          <span className="workspace-meta__traceable">Traceable · author-declared lineage</span>
        </div>
      </header>

      <div className="tab-list" role="tablist" aria-label="Research workspace sections">
        {tabs.map((tab, index) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="tab-panel"
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {tabPanels[activeTab]}
      </div>
    </section>
  );
}
