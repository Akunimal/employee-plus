import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import "./styles.css";

type Theme = "dark" | "light";

type Quote = {
  provider: string;
  description: string;
  price: string;
  rating: string;
  earliest: string;
  accent: "mint" | "blue";
};

const quotes: Quote[] = [
  { provider: "Northstar Home Care", description: "Water heater inspection and flush", price: "$189", rating: "4.9", earliest: "Wed, Sep 16", accent: "mint" },
  { provider: "Cedar & Coil", description: "Full system check and service", price: "$215", rating: "4.7", earliest: "Thu, Sep 17", accent: "blue" },
];

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button className="mode-toggle" type="button" onClick={onToggle} aria-label={`Switch to ${nextTheme} mode`}>
      <span className="mode-icon" aria-hidden="true">{theme === "dark" ? "☾" : "☼"}</span>
      <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
    </button>
  );
}

export function HomeCareBoard() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [connected, setConnected] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  useEffect(() => {
    const mcpApp = new App({ name: "employee-plus-home-care-board", version: "0.1.0" });
    const applyHostContext = (context: ReturnType<App["getHostContext"]>) => {
      if (!context) return;
      if (context.theme === "light" || context.theme === "dark") setTheme(context.theme);
      for (const [name, value] of Object.entries(context.styles?.variables ?? {})) {
        if (value !== undefined) document.documentElement.style.setProperty(name, value);
      }
    };
    mcpApp.onhostcontextchanged = applyHostContext;
    mcpApp.connect()
      .then(() => {
        setConnected(true);
        applyHostContext(mcpApp.getHostContext());
      })
      .catch(() => setConnected(false));
    return () => { void mcpApp.close(); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const selectedProvider = quotes.find((quote) => quote.provider === selectedQuote);

  return (
    <main className="board" aria-labelledby="title">
      <header className="topbar">
        <div className="brand" aria-label="Employee Plus home care concierge">
          <span className="brand-mark" aria-hidden="true">+</span>
          <span><strong>Employee<span className="brand-accent">+</span></strong><small>HOME CARE CONCIERGE</small></span>
        </div>
        <div className="topbar-actions">
          <span className={`connection-pill ${connected ? "online" : ""}`}><span className="connection-dot" />{connected ? "MCP connected" : "MCP preview"}</span>
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
        </div>
      </header>

      <section className="hero" aria-labelledby="title">
        <div>
          <p className="eyebrow">THIS WEEK <span className="eyebrow-line" /></p>
          <h1 id="title">Keep your home<br /><em>one step ahead.</em></h1>
          <p className="hero-copy">Employee+ brings maintenance, trusted providers, and upcoming visits into one calm conversation.</p>
        </div>
        <aside className="week-summary" aria-label="This week's summary">
          <span className="summary-number">3</span>
          <span><strong>things to review</strong><small>Updated just now</small></span>
        </aside>
      </section>

      <section className="attention-card" aria-labelledby="attention-title">
        <div className="attention-icon" aria-hidden="true">!</div>
        <div className="attention-content">
          <p className="eyebrow">NEEDS ATTENTION</p>
          <h2 id="attention-title">Your water heater needs a check-up.</h2>
          <p>Main water heater <span className="separator">·</span> Utility room <span className="separator">·</span> Due this week</p>
        </div>
        <button className="primary-button" type="button" onClick={() => document.getElementById("service-options")?.scrollIntoView({ behavior: "smooth" })}>See options <span aria-hidden="true">↗</span></button>
      </section>

      <div className="content-grid">
        <section className="panel options-panel" id="service-options" aria-labelledby="options-title">
          <div className="panel-heading">
            <div><p className="eyebrow">SMART MATCHES</p><h2 id="options-title">Service options</h2></div>
            <button className="text-button" type="button">Compare all <span aria-hidden="true">→</span></button>
          </div>
          <div className="quote-list">
            {quotes.map((quote) => (
              <article className={`quote-card ${selectedQuote === quote.provider ? "selected" : ""}`} key={quote.provider}>
                <div className={`quote-avatar ${quote.accent}`} aria-hidden="true">{quote.provider.charAt(0)}</div>
                <div className="quote-main">
                  <div className="quote-title-row"><h3>{quote.provider}</h3><span className="rating">★ {quote.rating}</span></div>
                  <p>{quote.description}</p>
                  <div className="quote-meta"><span>From <strong>{quote.price}</strong></span><span>Earliest <strong>{quote.earliest}</strong></span></div>
                </div>
                <button className="select-button" type="button" onClick={() => setSelectedQuote(selectedQuote === quote.provider ? null : quote.provider)} aria-pressed={selectedQuote === quote.provider}>
                  {selectedQuote === quote.provider ? "Selected" : "Select"}
                </button>
              </article>
            ))}
          </div>
          <div className="confirmation-note"><span aria-hidden="true">✓</span><span><strong>Explicit confirmation required</strong><small>Employee+ will always show the final price and ask before booking.</small></span></div>
        </section>

        <aside className="side-column">
          <section className="panel visit-panel" aria-labelledby="visit-title">
            <div className="panel-heading"><div><p className="eyebrow">NEXT UP</p><h2 id="visit-title">Upcoming visit</h2></div><span className="status-pill">Scheduled</span></div>
            <div className="visit-provider"><span className="provider-mark">N</span><span><strong>Northstar Home Care</strong><small>Water heater service</small></span></div>
            <div className="visit-time"><span className="calendar-icon" aria-hidden="true">▣</span><span><strong>Wednesday, Sep 16</strong><small>2:00 PM – 3:00 PM</small></span></div>
            <button className="secondary-button" type="button">Manage visit <span aria-hidden="true">→</span></button>
          </section>

          <section className="panel voice-panel" aria-labelledby="voice-title">
            <span className="voice-orb" aria-hidden="true">⌁</span>
            <div><p className="eyebrow">TRY SAYING</p><h2 id="voice-title">“Ask Employee Plus what my home needs this week.”</h2></div>
          </section>
        </aside>
      </div>

      <footer className="footer"><span>Employee+ <span className="footer-dot">•</span> Home Care Board</span><span className="synthetic-badge">Synthetic demo data <span aria-hidden="true">◆</span></span></footer>
      <p className="sr-status" aria-live="polite">{selectedProvider ? `${selectedProvider.provider} selected.` : ""}</p>
    </main>
  );
}

export default HomeCareBoard;

const root = document.getElementById("root");
const runtime = globalThis as typeof globalThis & { __employeePlusRoot?: ReturnType<typeof createRoot> };
if (root) {
  runtime.__employeePlusRoot ??= createRoot(root);
  runtime.__employeePlusRoot.render(<HomeCareBoard />);
}
