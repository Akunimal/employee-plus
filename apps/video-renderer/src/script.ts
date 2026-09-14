export type VideoScene = {
  id: string;
  startSec: number;
  durationSec: number;
  eyebrow: string;
  subtitle: string;
  narration: string;
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const scenes: VideoScene[] = [
  {
    id: "hook",
    startSec: 0,
    durationSec: 7,
    eyebrow: "THE EVERYDAY PROBLEM",
    subtitle: "The hard part is coordinating what happens next.",
    narration:
      "Your home never stops asking. The hard part is not noticing a problem. It is coordinating what happens next.",
  },
  {
    id: "brief",
    startSec: 7,
    durationSec: 9,
    eyebrow: "EMPLOYEE+",
    subtitle:
      "One calm conversation turns a vague concern into a clear next step.",
    narration:
      "Employee Plus is your virtual home-care concierge for Alexa Plus. Ask once, and it turns a vague worry into a clear next step.",
  },
  {
    id: "compare",
    startSec: 16,
    durationSec: 12,
    eyebrow: "SMART MATCHES",
    subtitle: "Compare price, warranty, rating, and availability at a glance.",
    narration:
      "It brings price, warranty, rating, and availability together so you can choose with confidence.",
  },
  {
    id: "prepare",
    startSec: 28,
    durationSec: 10,
    eyebrow: "TRUST BY DESIGN",
    subtitle:
      "Nothing is booked until the customer sees the details and says yes.",
    narration:
      "Choosing is not booking. Review every detail first. Nothing happens until you say yes.",
  },
  {
    id: "book",
    startSec: 38,
    durationSec: 10,
    eyebrow: "ONE CONFIRMATION",
    subtitle: "A single confirmation creates one durable booking.",
    narration:
      "Your confirmation creates one durable appointment. No duplicate action. No hidden payment.",
  },
  {
    id: "change",
    startSec: 48,
    durationSec: 10,
    eyebrow: "CONTEXT PRESERVED",
    subtitle: "Move the time without losing the provider, service, or price.",
    narration:
      "Plans change. Move the visit while Employee Plus preserves the provider, service, and quoted price.",
  },
  {
    id: "board",
    startSec: 58,
    durationSec: 9,
    eyebrow: "ALWAYS VISIBLE",
    subtitle: "The Home Care Board keeps the whole story together.",
    narration:
      "The Home Care Board keeps the task, appointment, document, and status together.",
  },
  {
    id: "close",
    startSec: 67,
    durationSec: 9,
    eyebrow: "BUILT FOR ALEXA+",
    subtitle: "Employee+ makes the next right action feel effortless.",
    narration:
      "Employee Plus for Alexa Plus: the next right action, clear, reviewable, and yours to approve.",
  },
];

export const TOTAL_SECONDS =
  scenes.at(-1)!.startSec + scenes.at(-1)!.durationSec;
export const DURATION_IN_FRAMES = TOTAL_SECONDS * FPS;

export function sceneFrames(scene: VideoScene) {
  return {
    from: scene.startSec * FPS,
    durationInFrames: scene.durationSec * FPS,
  };
}
