import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { McpClient } from "./mcp-client";
import "./styles.css";

type Theme = "dark" | "light";
type Money = { amount: number; currency: string };
type Asset = { assetId: string; name: string; location: string; maintenanceDue: boolean };
type Brief = { recommendation: string; dueAssets: Asset[]; upcomingBookings: Booking[] };
type Option = { optionId: string; title: string; providerName: string; rating: number; price: Money; durationMinutes: number; warrantyMonths: number; description: string };
type Slot = { slotId: string; startsAt: string; endsAt: string; timezone: string };
type Booking = { bookingId: string; optionId: string; providerName: string; addressLabel: string; scheduledStart: string; scheduledEnd: string; status: string; version: number };
type Draft = { draftId: string; payloadHash: string; confirmationToken: string; expectedVersion?: number; summary: string; requiresExplicitConfirmation: true; payload: Record<string, unknown> };
type Speaker = "you" | "employee";
type Message = { speaker: Speaker; text: string };

const client = new McpClient();
const assetId = "asset_water_heater";

const money = (value: Money | undefined) => value ? new Intl.NumberFormat("en-US", { style: "currency", currency: value.currency, maximumFractionDigits: 0 }).format(value.amount) : "Price on request";
const dateLabel = (value: string | undefined) => value ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(value)) : "Choose a time";
const timeLabel = (value: string | undefined) => value ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "";

function Icon({ children }: { children: string }) { return <span className="icon" aria-hidden="true">{children}</span>; }

function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingDraft, setBookingDraft] = useState<Draft | null>(null);
  const [changeDraft, setChangeDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { speaker: "you", text: "What does my home need this week?" },
    { speaker: "employee", text: "I found one thing worth taking care of." },
  ]);

  const currentBooking = booking ?? brief?.upcomingBookings[0] ?? null;
  const activeSlot = useMemo(() => slots[0], [slots]);
  const changeSlot = useMemo(() => slots[1] ?? slots[0], [slots]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    void run("brief", async () => {
      const data = await client.call<Brief>("get_home_brief");
      setBrief(data);
    });
  }, []);

  async function run(label: string, operation: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try { await operation(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Employee+ could not complete that request."); }
    finally { setBusy(null); }
  }

  function say(speaker: Speaker, text: string) { setMessages((current) => [...current, { speaker, text }]); }

  function showOptions() {
    void run("options", async () => {
      say("you", "Compare repair options for my water heater.");
      const searched = await client.call<{ options: Option[] }>("search_service_options", { assetId, serviceType: "repair", maxResults: 5 });
      const compared = await client.call<{ options: Option[] }>("compare_quotes", { optionIds: searched.options.map((option) => option.optionId) });
      setOptions(compared.options);
      say("employee", `I compared ${compared.options.length} options by price, warranty, rating, and availability.`);
    });
  }

  function selectOption(option: Option) {
    void run("select", async () => {
      setSelectedOption(option);
      const available = await client.call<{ slots: Slot[] }>("check_service_availability", { optionId: option.optionId });
      setSlots(available.slots);
      say("you", `Show me a time for ${option.providerName}.`);
      say("employee", `${option.providerName} is available ${dateLabel(available.slots[0]?.startsAt)}. I will not book anything without your confirmation.`);
    });
  }

  function prepareBooking() {
    if (!selectedOption || !activeSlot) return;
    void run("prepare", async () => {
      const draft = await client.call<{ draft: Draft }>("prepare_booking", { assetId, optionId: selectedOption.optionId, slotId: activeSlot.slotId, addressLabel: "Utility room access" });
      setBookingDraft(draft.draft);
      say("you", `Prepare ${selectedOption.providerName} for ${dateLabel(activeSlot.startsAt)}.`);
      say("employee", `I prepared ${selectedOption.providerName} at ${money(selectedOption.price)}. Please explicitly confirm before I book it.`);
    });
  }

  function confirmBooking() {
    if (!bookingDraft) return;
    void run("confirm", async () => {
      const confirmed = await client.call<{ booking: Booking }>("confirm_booking", { draftId: bookingDraft.draftId, payloadHash: bookingDraft.payloadHash, confirmationToken: bookingDraft.confirmationToken, idempotencyKey: `video-book-${bookingDraft.draftId}` });
      setBooking(confirmed.booking);
      setBookingDraft(null);
      setBrief((current) => current ? { ...current, upcomingBookings: [confirmed.booking] } : current);
      say("you", "Yes, confirm the booking.");
      say("employee", `Booked. ${confirmed.booking.providerName} is scheduled for ${dateLabel(confirmed.booking.scheduledStart)} at ${timeLabel(confirmed.booking.scheduledStart)}.`);
    });
  }

  function prepareChange() {
    if (!currentBooking || !changeSlot) return;
    void run("change", async () => {
      const available = slots.length ? { slots } : await client.call<{ slots: Slot[] }>("check_service_availability", { optionId: currentBooking.optionId });
      setSlots(available.slots);
      const target = available.slots[1] ?? available.slots[0];
      if (!target) throw new Error("No alternate appointment time is available.");
      const draft = await client.call<{ draft: Draft }>("prepare_booking_change", { bookingId: currentBooking.bookingId, slotId: target.slotId });
      setChangeDraft(draft.draft);
      say("you", "Move my appointment to a later time.");
      say("employee", `I can move the existing ${currentBooking.providerName} visit to ${dateLabel(target.startsAt)} at ${timeLabel(target.startsAt)}. The provider and service stay unchanged. Please confirm the change.`);
    });
  }

  function confirmChange() {
    if (!changeDraft) return;
    void run("change-confirm", async () => {
      const changed = await client.call<{ booking: Booking }>("confirm_booking_change", { draftId: changeDraft.draftId, payloadHash: changeDraft.payloadHash, confirmationToken: changeDraft.confirmationToken, idempotencyKey: `video-change-${changeDraft.draftId}` });
      setBooking(changed.booking);
      setChangeDraft(null);
      setBrief((current) => current ? { ...current, upcomingBookings: [changed.booking] } : current);
      say("you", "Yes, move it.");
      say("employee", `Done. Your ${changed.booking.providerName} visit moved to ${dateLabel(changed.booking.scheduledStart)} at ${timeLabel(changed.booking.scheduledStart)}.`);
    });
  }

  function resetScene() {
    void run("reset", async () => {
      await client.resetDemo();
      window.location.reload();
    });
  }

  const selectedPrice = selectedOption?.price;
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">+</span><span><strong>Employee<span>+</span></strong><small>HOME CARE CONCIERGE</small></span></div>
        <div className="top-actions"><span className="demo-pill"><i /> SIMULATED ALEXA+ EXPERIENCE</span><button className="reset-button" type="button" onClick={resetScene} disabled={Boolean(busy)}>Reset scene</button><button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><Icon>{theme === "dark" ? "☼" : "☾"}</Icon>{theme === "dark" ? "Light" : "Dark"}</button></div>
      </header>

      <section className="intro"><div><p className="eyebrow">ONE CALM CONVERSATION <span /></p><h1>Your home, <em>one step ahead.</em></h1><p className="intro-copy">A visual Alexa+ experience for the moments that usually take five tabs, three calls, and a sticky note.</p></div><div className="live-state"><span className="live-dot" /> MCP LIVE <small>video-demo fixture</small></div></section>

      <section className="workspace" aria-label="Employee Plus Alexa demonstration">
        <aside className="conversation panel">
          <div className="panel-top"><div><p className="eyebrow">VOICE LAYER</p><h2>Conversation</h2></div><span className="wave">∿</span></div>
          <div className="messages" aria-live="polite">
            {messages.slice(-6).map((message, index) => <div className={`message ${message.speaker}`} key={`${message.text}-${index}`}><span className="speaker">{message.speaker === "you" ? "YOU" : "EMPLOYEE+"}</span><p>{message.text}</p></div>)}
          </div>
          <div className="voice-prompt"><Icon>⌁</Icon><span>Try saying</span><strong>“Compare repair options.”</strong></div>
          {error && <div className="error" role="alert"><Icon>!</Icon>{error}</div>}
        </aside>

        <section className="board panel" aria-label="Home care board">
          <div className="board-header"><div><p className="eyebrow">THIS WEEK <span /></p><h2>Home Care Board</h2></div><span className="board-count">{brief?.dueAssets?.length ?? 1} <small>item to review</small></span></div>
          <div className="attention"><div className="attention-icon">!</div><div><span className="eyebrow">NEEDS ATTENTION</span><h3>{brief?.recommendation ?? "Checking your home..."}</h3><p>{brief?.dueAssets?.[0]?.name ?? "Main water heater"} <b>·</b> {brief?.dueAssets?.[0]?.location ?? "Utility room"}</p></div><button className="link-button" type="button" onClick={showOptions} disabled={Boolean(busy)}>Compare <span>↗</span></button></div>

          <div className="content-grid">
            <section className="options"><div className="section-heading"><div><span className="eyebrow">SMART MATCHES</span><h3>Service options</h3></div><span className="result-note">{options.length ? `${options.length} compared` : "Ready when you are"}</span></div>
              {!options.length ? <button className="empty-action" type="button" onClick={showOptions} disabled={Boolean(busy)}><span className="empty-icon">⌕</span><strong>Compare trusted repair options</strong><small>Price, warranty, rating, and earliest availability</small><span className="empty-arrow">→</span></button> : <div className="quote-list">{options.map((option, index) => <article className={`quote ${selectedOption?.optionId === option.optionId ? "selected" : ""}`} key={option.optionId}><div className={`avatar ${index % 2 ? "blue" : "mint"}`}>{option.providerName.charAt(0)}</div><div className="quote-body"><div className="quote-title"><h4>{option.providerName}</h4><span>★ {option.rating.toFixed(1)}</span></div><p>{option.title}</p><div className="quote-meta"><b>{money(option.price)}</b><span>{option.warrantyMonths} mo warranty</span><span>{option.durationMinutes} min</span></div></div><button className="select" type="button" onClick={() => selectOption(option)} disabled={Boolean(busy)}>{selectedOption?.optionId === option.optionId ? "Selected" : "Select"}</button></article>)}</div>}
              {selectedOption && !booking && <div className="action-card"><div><span className="eyebrow">NEXT STEP</span><strong>{money(selectedPrice)} · {dateLabel(activeSlot?.startsAt)}</strong><small>Nothing is booked yet.</small></div><button className="primary" type="button" onClick={prepareBooking} disabled={Boolean(busy || bookingDraft)}>{busy === "prepare" ? "Preparing…" : "Prepare booking"}</button></div>}
              {bookingDraft && <div className="confirm-card"><div className="confirm-icon">?</div><div><span className="eyebrow">EXPLICIT CONFIRMATION</span><strong>{bookingDraft.summary}</strong><small>This draft expires shortly. No booking has happened yet.</small></div><button className="primary" type="button" onClick={confirmBooking} disabled={Boolean(busy)}>{busy === "confirm" ? "Confirming…" : "Confirm booking"}</button></div>}
            </section>

            <aside className="side-stack"><section className="visit-card"><div className="section-heading"><div><span className="eyebrow">NEXT UP</span><h3>Upcoming visit</h3></div>{currentBooking ? <span className="status">{currentBooking.status}</span> : <span className="status muted">Not booked</span>}</div>{currentBooking ? <><div className="provider"><span className="provider-avatar">{currentBooking.providerName.charAt(0)}</span><div><strong>{currentBooking.providerName}</strong><small>Home service visit</small></div></div><div className="visit-time"><Icon>▣</Icon><div><strong>{dateLabel(currentBooking.scheduledStart)}</strong><small>{timeLabel(currentBooking.scheduledStart)} · Utility room access</small></div></div><button className="manage" type="button" onClick={prepareChange} disabled={Boolean(busy || changeDraft)}>{changeDraft ? "Change prepared" : "Move appointment →"}</button>{changeDraft && <div className="change-confirm"><span>↻</span><div><strong>Move to {dateLabel(changeSlot?.startsAt)}</strong><small>Provider and service preserved</small></div><button type="button" onClick={confirmChange} disabled={Boolean(busy)}>{busy === "change-confirm" ? "…" : "Confirm"}</button></div>}</> : <div className="empty-visit"><span>○</span><p>Select an option to prepare your first visit.</p></div>}</section><section className="proof-card"><span className="proof-mark">✓</span><div><span className="eyebrow">TRUST BY DESIGN</span><h3>Always clear before action.</h3><p>Final price, provider, time, and an explicit confirmation before any booking or change.</p></div></section></aside>
          </div>
          <footer><span>Employee+ <b>•</b> Home Care Board</span><span>Synthetic service data <b>◆</b></span></footer>
        </section>
      </section>
      <p className="recording-note">Recording mode · All actions above call the local MCP server · No real services or payments</p>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
