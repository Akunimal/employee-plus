import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { scenes } from "./script";

const root = resolve(import.meta.dirname, "..");
const entryPoint = resolve(root, "src/index.tsx");
const output = resolve(root, "../../artifacts/employee-plus-demo.mp4");
const publicRoot = resolve(root, "public");

function readFlag(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const outputPath = resolve(readFlag("--out") ?? output);
const relativeVoiceFile = "voice/employee-plus-narration.wav";
const voiceFile = existsSync(resolve(publicRoot, relativeVoiceFile))
  ? relativeVoiceFile
  : undefined;

console.log(`Rendering Employee+ video to ${outputPath}`);
console.log(
  voiceFile
    ? "VoiceStudio master narration: loaded (one track)"
    : "No VoiceStudio master narration found; rendering with subtitles only.",
);

const serveUrl = await bundle({
  entryPoint,
  webpackOverride: (config) => config,
});
const composition = await selectComposition({
  serveUrl,
  id: "EmployeePlusVideo",
  inputProps: { voiceFile },
});
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  audioCodec: "aac",
  outputLocation: outputPath,
  inputProps: { voiceFile },
});
console.log("Render complete.");
