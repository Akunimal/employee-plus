import { describe, expect, it } from "vitest";

type Theme = { background: string; surface: string; text: string; muted: string; accent: string; accentInk: string; warning: string; warningSurface: string };
const themes: Record<string, Theme> = {
  dark: { background: "#071016", surface: "#11272e", text: "#eefafa", muted: "#8eafb2", accent: "#a5f3df", accentInk: "#06201e", warning: "#ffcf85", warningSurface: "#263026" },
  light: { background: "#f2f8f7", surface: "#ffffff", text: "#132b30", muted: "#557279", accent: "#0d6f66", accentInk: "#ffffff", warning: "#805300", warningSurface: "#fff3d6" },
};
function luminance(hex: string) { const channels = hex.slice(1).match(/../g)?.map((value) => Number.parseInt(value, 16) / 255) ?? []; const linear = channels.map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]; }
function contrast(first: string, second: string) { const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a); return (lighter + .05) / (darker + .05); }
describe("Employee+ theme contrast", () => {
  for (const [name, theme] of Object.entries(themes)) {
    it(`${name} keeps body and supporting text readable`, () => { expect(contrast(theme.text, theme.background)).toBeGreaterThanOrEqual(7); expect(contrast(theme.muted, theme.background)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.muted, theme.surface)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.text, theme.surface)).toBeGreaterThanOrEqual(7); });
    it(`${name} keeps controls and status accents readable`, () => { expect(contrast(theme.accentInk, theme.accent)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.warning, theme.warningSurface)).toBeGreaterThanOrEqual(4.5); });
  }
});
