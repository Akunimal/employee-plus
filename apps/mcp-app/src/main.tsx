import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import "./styles.css";

type Theme = "dark" | "light";

type HomeBrief = {
  recommendation: string;
  dueAssets: Array<{ name: string; location: string }>;
  upcomingBookings: Array<{ providerName: string; scheduledStart: string; status: string }>;
};

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

const fallbackBrief: HomeBrief = {
  recommendation: "Your water heater needs attention this week.",
  dueAssets: [{ name: "Main water heater", location: "Utility room" }],
  upcomingBookings: [{ providerName: "Northstar Home Care", scheduledStart: "2026-09-16T14:00:00-03:00", status: "scheduled" }],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asMoney(value: unknown) {
  if (!isRecord(value) || typeof value.amount !== "number") return "Price on request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value.amount);
}

function toQuote(value: unknown, index: number): Quote | null {
  if (!isRecord(value) || typeof value.providerName !== "string") return null;
  const rating = typeof value.rating === "number" ? value.rating.toFixed(1) : "—";
  return {
    provider: value.providerName,
    description: typeof value.title === "string" ? value.title : typeof value.description === "string" ? value.description : "Home service option",
    price: asMoney(value.price),
    rating,
    earliest: typeof value.earliest === "string" ? value.earliest : index === 0 ? "Next available" : "Ask for availability",
    accent: index % 2 === 0 ? "mint" : "blue",
  };
}

function readStructuredData(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !isRecord(value.structuredContent)) return null;
  const structured = value.structuredContent;
  return isRecord(structured.data) ? structured.data : null;
}

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
  const [brief, setBrief] = useState<HomeBrief>(fallbackBrief);
  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>(quotes);
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
    mcpApp.ontoolresult = (result) => {
      const data = readStructuredData(result);
      if (!data) return;
      if (typeof data.recommendation === "string" && Array.isArray(data.dueAssets)) {
        setBrief({
          recommendation: data.recommendation,
          dueAssets: data.dueAssets.filter(isRecord).map((asset) => ({ name: typeof asset.name === "string" ? asset.name : "Home system", location: typeof asset.location === "string" ? asset.location : "Home" })),
          upcomingBookings: Array.isArray(data.upcomingBookings) ? data.upcomingBookings.filter(isRecord).map((booking) => ({ providerName: typeof booking.providerName === "string" ? booking.providerName : "Service provider", scheduledStart: typeof booking.scheduledStart === "string" ? booking.scheduledStart : "", status: typeof booking.status === "string" ? booking.status : "scheduled" })) : [],
        });
      }
      if (Array.isArray(data.options)) {
        const nextQuotes = data.options.map(toQuote).filter((quote): quote is Quote => quote !== null);
        if (nextQuotes.length) setAvailableQuotes(nextQuotes);
      }
      const booking = data.booking;
      if (isRecord(booking) && typeof booking.providerName === "string" && typeof booking.scheduledStart === "string") {
        const providerName = booking.providerName;
        const scheduledStart = booking.scheduledStart;
        const status = typeof booking.status === "string" ? booking.status : "scheduled";
        setBrief((current) => ({ ...current, upcomingBookings: [{ providerName, scheduledStart, status }] }));
      }
    };
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

  const selectedProvider = availableQuotes.find((quote) => quote.provider === selectedQuote);

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
          <h2 id="attention-title">{brief.recommendation}</h2>
          <p>{brief.dueAssets[0]?.name ?? "Home maintenance"} <span className="separator">·</span> {brief.dueAssets[0]?.location ?? "Your home"} <span className="separator">·</span> Due this week</p>
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
            {availableQuotes.map((quote) => (
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
            {brief.upcomingBookings[0] ? <><div className="visit-provider"><span className="provider-mark">{brief.upcomingBookings[0].providerName.charAt(0)}</span><span><strong>{brief.upcomingBookings[0].providerName}</strong><small>Home service visit</small></span></div><div className="visit-time"><span className="calendar-icon" aria-hidden="true">▣</span><span><strong>{new Date(brief.upcomingBookings[0].scheduledStart).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</strong><small>{new Date(brief.upcomingBookings[0].scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</small></span></div></> : <p className="muted">No visits scheduled.</p>}
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
