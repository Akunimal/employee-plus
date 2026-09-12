# Employee+ demo video plan: visible value in 110 seconds

Status: production plan only. No recording, audio generation, demo-host implementation, or publication is included in this document's delivery.

This replaces the earlier 2:54 storyboard. Target runtime: **1:50**, including opening and closing. Hard ceiling: **2:00**. Audience: hackathon judges seeing Employee+ for the first time.

## 1. The story viewers should remember

**A home problem becomes a clear appointment, and the user stays in control.**

Follow one water-heater maintenance need through comparison, explicit booking confirmation, and a date change. The most important shot is the appointment changing dates while its provider, service, and displayed quote stay visible and unchanged.

The viewer should understand three benefits with the audio muted:

- Know what needs attention.
- Compare options and approve the booking yourself.
- Change plans without starting again.

Use the existing dark Employee+ visual style, English synthetic narration, and English subtitles. Introduce the product through an action in the first three seconds. Save the logo-only frame for the ending.

## 2. Recording prerequisites and truth boundaries

These are future preparation tasks, not completed capabilities or instructions to implement them while saving this plan.

The current standalone preview is insufficient for the final recording: it starts with fallback quotes and an example appointment; Select only changes local selection; Compare all and Manage visit have no action handlers. It consumes some MCP tool results, but it does not yet demonstrate the whole storyboard interactively.

Before filming:

1. Build and test a web demonstration host that sends actual MCP requests and delivers actual tool results to the Home Care Board. Show user prompts, tool-derived responses, and the board in one view. Scripted intent routing is acceptable for this simulated experience if disclosed; do not describe it as unrestricted conversational intelligence.
2. Drive the product shots through the real local MCP server with the synthetic user `video-demo`. Label the host persistently **“Alexa+ experience simulation · Local MCP”** and **“Synthetic service data”**. Use the remote smoke check only as separate deployment evidence; it does not prove authenticated remote booking or official Alexa+ execution.
3. Start with no appointments. Prepare two repair options from the domain dataset: Northstar Standard ($129) and Northstar Priority ($189). They are two service packages from the same provider, not two independent providers. Keep stable option IDs; selecting by provider name currently cannot distinguish them.
4. Prepare future Wednesday and Thursday slots in one explicit display timezone, `America/New_York`. Replace expired fixture dates before the recording rehearsal. Show calendar dates and timezone consistently in chat, drafts, and appointment cards.
5. Make draft summaries visible. A pending draft must leave the appointment count at zero; a date-change draft must leave the existing appointment unchanged until confirmed. Render booking status from the response, rather than the current hardcoded Scheduled label.
6. Bind the displayed price to the selected service option and verify it remains consistent during the demonstration. Do not claim a locked contractual price: the current Booking object does not contain a price snapshot.
7. Verify the full sequence twice from fresh local fixture state. If a prerequisite fails, fix it before filming; do not replace the missing behavior with edited success screens.

The plan uses the simulated Alexa+ approach previously selected by the author. Consult the [official hackathon rules](https://amazonappdev2026.devpost.com/rules) and [resources](https://amazonappdev2026.devpost.com/resources) again before publication. If official Preview access becomes available, substitute official-host footage only after its complete flow works, and update the labels accordingly.

## 3. Storyboard and English narration

The narration below is the full script. Prompt text is shown on screen and is not narrated separately. Record voice by scene, with a calm US-English synthetic voice at approximately 135–145 words per minute. Use remaining time for reading and observing the result; do not fill every second with speech.

| Time | Visible action and framing | Short overlay | Narration |
| --- | --- | --- | --- |
| 0:00–0:08 | Open directly on the water-heater attention card. Its maintenance warning is the focal point; Employee+ branding is already in the header. | Home maintenance. One less worry. | “Your water heater needs attention. Finding help shouldn't become another job.” |
| 0:08–0:21 | Submit “What does my home need this week?” The real home brief populates the board. Keep the maintenance card large and the empty appointment state visible. | Know what needs attention | “Employee Plus brings your home-care tasks and service options into one guided conversation.” |
| 0:21–0:35 | Submit “Compare water-heater repair options.” Show only the two repair cards. Align price and warranty fields so differences are readable. Select Standard, $129. | Compare. Choose. | “Compare two repair options, see the price and warranty, and choose what works for you.” |
| 0:35–0:52 | Prepare Standard for Wednesday. Zoom to the review card: provider, service, date, timezone, $129. Show Awaiting confirmation and zero bookings. Hold the readable summary for at least four seconds. | Nothing booked yet | “Choosing isn't booking. Review the provider, time, and price. Nothing is scheduled until you confirm.” |
| 0:52–1:02 | Submit “Yes, confirm the booking.” Keep the action and result together: pending review becomes one Scheduled visit. Hold the completed card. | You confirm. Then it's booked. | “Confirm once. Your appointment appears right here.” |
| 1:02–1:24 | Submit “Move it to Thursday. Keep everything else.” Show the proposed date while Wednesday remains the current appointment. Submit “Yes, confirm the change.” Highlight only the updated date; keep provider, service, and $129 in the same screen positions. | Only the date changed | “Plans changed? Move the visit to Thursday. Keep the same provider, service, and quoted price. Review the change, confirm, and you're done.” |
| 1:24–1:36 | Refresh the home brief through MCP and show the single updated appointment. Briefly switch to light mode, then return to dark, keeping the same content and layout. | One visit. Everything in view. | “One appointment, with the new date and the details still together.” |
| 1:36–1:44 | Eight-second technical insert: actual sanitized remote smoke result plus a small original caption: Self-hosted MCP · AWS deployment · Open source. Show no scrolling terminal log. | Working MCP. Deployed on AWS. | “A working MCP server, deployed on AWS. Open source, with tested booking workflows.” |
| 1:44–1:50 | End on the updated appointment, then a short Employee+ closing card and repository URL. | Less coordination. More control. | “Employee Plus. Less coordination. More control.” |

The technical insert must use checks from the recording day and name the environment. Do not claim production readiness, an operational Bedrock pipeline, official Alexa+ certification, or whole-repository 100% coverage. Ring, invoices, cancellation, setup instructions, and detailed architecture belong outside this short cut.

## 4. Visual direction and recording procedure

- Composition: allocate approximately 30% of the frame to the latest conversation turn and 70% to the board. Collapse older messages. During confirmation, make the review card the dominant element.
- Typography: at 1080p, use at least 28 px for essential product details, 40–48 px for overlays, and 32 px subtitles. Reserve the bottom 120 px for subtitles so they never cover the confirmation action or price.
- Attention: highlight one changing element per shot. Use mint for the selected action, amber for pending confirmation, and a checkmark plus text for success. Meaning must remain clear without relying on color alone.
- Motion: direct cuts or restrained 150–250 ms transitions. At most one slow crop/zoom per scene. No intro animation, rapid montage, typing simulation, decorative confetti, or continuously moving cursor.
- Reading time: hold prices and confirmation summaries for at least four seconds. Show every explicit confirmation at normal speed. Trim unrelated waiting between scenes, never the cause-and-result sequence that proves user control.
- Capture: OBS window capture, 1920×1080, 30 fps. Record to MKV and remux for editing. Capture a full uninterrupted reference take first, then clean scene takes with two seconds of handles at each end.
- Consistency: preserve the same selected option, dates, and single booking across scene cuts. Restart only the disposable local demo fixture for retakes; never reset shared AWS state to stage a shot.
- Sound: use one licensed synthetic narrator voice, pronounced “Employee Plus.” Do not imitate Alexa's voice or imply that the narration is an actual Alexa response. No music in the first cut. Target about -14 LUFS integrated loudness and a true peak at or below -1 dBTP.
- Editing: time the visual cut first, then fit narration to it. Shorten wording rather than speed up the voice. Burn in English subtitles and also deliver a matching SRT file.
- Export: H.264 MP4, 1080p/30 fps, 12–16 Mbps, AAC audio. Review the exported file, not only the editor preview.

Raw takes, generated voice, and editing files should be kept in the ignored local artifacts area. The eventual deliverables are `employee-plus-demo.mp4`, `employee-plus-demo.srt`, and the public video URL. Producing or publishing those files is a separate task.

## 5. Acceptance before publication

- Watch once with sound muted. An unfamiliar viewer must be able to explain what needed attention, which option was chosen, when the booking became real, and what changed afterward. If any answer is unclear, revise the relevant shot before adding more narration.
- Watch once at 720p. Prices, dates, confirmation state, and simulation labels must remain readable without pausing.
- Confirm runtime is 110 seconds, with a maximum of 120 seconds including all end cards. If trimming is necessary, remove the theme switch and shorten the technical insert first; preserve confirmation and the date-change comparison.
- Match every shown state to its captured MCP result. Before confirmation: no new booking. After confirmation: exactly one booking. After moving: the same booking with the new date and unchanged selected option.
- Verify that fallback content is absent from the product flow and that a service error cannot silently turn into a successful demo state.
- Include the simulation and synthetic-data labels throughout product footage. Separate local interaction footage from remote deployment evidence explicitly.
- Check all frames for credentials, personal details, unrelated applications, and notifications. Show only authorized visual and audio assets.
- Keep raw takes and sanitized test evidence so the edited story remains traceable to working behavior. Recheck current submission rules and public playback when the final video is eventually published.

Success means viewers remember **“it helps me arrange home maintenance while keeping me in control”**, rather than a list of technologies.
