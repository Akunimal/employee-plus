import { useEffect, useState } from "react";
import { App } from "@modelcontextprotocol/ext-apps";
import "./styles.css";

type HomeBrief = { recommendation: string; dueAssets: Array<{ name: string; location: string }>; upcomingBookings: Array<{ providerName: string; scheduledStart: string; status: string }> };
const fallback: HomeBrief = { recommendation: "Your water heater needs attention this week.", dueAssets: [{ name: "Main water heater", location: "Utility room" }], upcomingBookings: [] };

export function HomeCareBoard() {
  const [brief, setBrief] = useState<HomeBrief>(fallback);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const app = new App({ name: "employee-plus-home-care-board", version: "0.1.0" });
    app.connect().then(() => setConnected(true)).catch(() => setConnected(false));
    return () => { void app.close(); };
  }, []);

  return <main className="board" aria-labelledby="title">
    <header className="hero"><div><p className="eyebrow">EMPLOYEE PLUS</p><h1 id="title">Home Care Board</h1><p className="subtitle">A calm view of what your home needs next.</p></div><span className={`status ${connected ? "online" : "offline"}`}>{connected ? "Connected" : "Preview mode"}</span></header>
    <section className="brief card"><p className="eyebrow">THIS WEEK</p><h2>{brief.recommendation}</h2><button type="button">Ask Employee Plus for options</button></section>
    <section className="grid" aria-label="Home care details">
      <article className="card"><h2>Needs attention</h2>{brief.dueAssets.map((asset) => <div className="item" key={asset.name}><span className="dot amber" /><div><strong>{asset.name}</strong><span>{asset.location}</span></div></div>)}</article>
      <article className="card"><h2>Upcoming visits</h2>{brief.upcomingBookings.length ? brief.upcomingBookings.map((booking) => <div className="item" key={booking.scheduledStart}><span className="dot blue" /><div><strong>{booking.providerName}</strong><span>{new Date(booking.scheduledStart).toLocaleString()}</span></div></div>) : <p className="muted">No visits scheduled.</p>}</article>
    </section>
    <footer>Employee+ uses synthetic providers and data for this demo.</footer>
  </main>;
}

export default HomeCareBoard;
