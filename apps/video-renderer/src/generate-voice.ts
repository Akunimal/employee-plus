import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { scenes } from "./script";

const execFileAsync = promisify(execFile);
const baseUrl = process.env.VOICESTUDIO_URL ?? "http://127.0.0.1:3900";
const outputDir = resolve(import.meta.dirname, "../public/voice");
const tempDir = resolve(outputDir, ".employee-plus-scene-voice");
const masterPath = resolve(outputDir, "employee-plus-narration.wav");
const voiceProfile = "demo0001";
const seed = 240916;

await mkdir(outputDir, { recursive: true });
try {
  const discovery = await fetch(`${baseUrl}/.well-known/voicestudio-speech`);
  if (!discovery.ok) throw new Error(`HTTP ${discovery.status}`);
} catch {
  throw new Error(
    `VoiceStudio is not reachable at ${baseUrl}. Start VoiceStudio and try again.`,
  );
}

function wavDurationSeconds(bytes: Buffer) {
  if (
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE"
  )
    return undefined;
  let sampleRate: number | undefined;
  let channels: number | undefined;
  let bitsPerSample: number | undefined;
  let dataBytes: number | undefined;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunkId = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const chunkData = offset + 8;
    if (
      chunkId === "fmt " &&
      chunkSize >= 16 &&
      chunkData + 16 <= bytes.length
    ) {
      channels = bytes.readUInt16LE(chunkData + 2);
      sampleRate = bytes.readUInt32LE(chunkData + 4);
      bitsPerSample = bytes.readUInt16LE(chunkData + 14);
    }
    if (chunkId === "data" && chunkData <= bytes.length) {
      dataBytes = Math.min(chunkSize, bytes.length - chunkData);
      break;
    }
    offset = chunkData + chunkSize + (chunkSize % 2);
  }
  if (!sampleRate || !channels || !bitsPerSample || dataBytes === undefined)
    return undefined;
  return dataBytes / (sampleRate * channels * (bitsPerSample / 8));
}

function atempoFilter(factor: number) {
  const filters: string[] = [];
  let remaining = factor;
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters.join(",");
}

async function findFfmpeg() {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    process.env.FFMPEG_PATH,
    localAppData &&
      resolve(localAppData, "VoiceStudio (Current User)", "ffmpeg.exe"),
    "ffmpeg",
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["-version"], { windowsHide: true });
      return candidate;
    } catch {
      // Try the next known installation location.
    }
  }
  throw new Error(
    "FFmpeg is required to assemble the single narration track. Set FFMPEG_PATH and retry.",
  );
}

const ffmpeg = await findFfmpeg();
await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });

try {
  const fittedScenes: string[] = [];
  for (const scene of scenes) {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "omnivoice",
        input: scene.narration,
        voice: voiceProfile,
        language: "en",
        response_format: "wav",
        speed: 1,
        duration: scene.durationSec,
        seed,
        num_step: 32,
        guidance_scale: 2,
        denoise: true,
        preprocess_prompt: true,
      }),
    });
    if (!response.ok)
      throw new Error(
        `VoiceStudio failed for ${scene.id}: ${response.status} ${await response.text()}`,
      );

    const rawPath = resolve(tempDir, `${scene.id}.raw.wav`);
    const fittedPath = resolve(tempDir, `${scene.id}.fit.wav`);
    await writeFile(rawPath, Buffer.from(await response.arrayBuffer()));
    const duration = wavDurationSeconds(await readFile(rawPath));
    if (!duration || duration <= 0)
      throw new Error(`VoiceStudio returned an invalid WAV for ${scene.id}.`);

    await execFileAsync(
      ffmpeg,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        rawPath,
        "-filter:a",
        `${atempoFilter(duration / scene.durationSec)},apad`,
        "-t",
        String(scene.durationSec),
        "-ar",
        "24000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        fittedPath,
      ],
      { windowsHide: true },
    );
    fittedScenes.push(fittedPath);
    console.log(
      `Generated ${scene.id} with VoiceStudio Demo Voice (${duration.toFixed(2)}s → ${scene.durationSec.toFixed(2)}s).`,
    );
  }

  const concatList = resolve(tempDir, "concat.txt");
  const concatContents = fittedScenes
    .map(
      (file) => `file '${file.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`,
    )
    .join("\n");
  await writeFile(concatList, `${concatContents}\n`);

  const assembledPath = resolve(tempDir, "employee-plus-narration.wav");
  await execFileAsync(
    ffmpeg,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatList,
      "-c:a",
      "pcm_s16le",
      assembledPath,
    ],
    { windowsHide: true },
  );

  const assembledDuration = wavDurationSeconds(await readFile(assembledPath));
  const expectedDuration = scenes.reduce(
    (total, scene) => total + scene.durationSec,
    0,
  );
  if (
    !assembledDuration ||
    Math.abs(assembledDuration - expectedDuration) > 0.05
  ) {
    throw new Error(
      `Assembled narration duration ${assembledDuration?.toFixed(2) ?? "unknown"}s does not match ${expectedDuration.toFixed(2)}s.`,
    );
  }

  await rm(masterPath, { force: true });
  await rename(assembledPath, masterPath);
  console.log(
    `Generated one ${assembledDuration.toFixed(2)}s narration track using ${voiceProfile}.`,
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

for (const scene of scenes) {
  await rm(resolve(outputDir, `${scene.id}.wav`), { force: true });
}

await writeFile(
  resolve(outputDir, "README.txt"),
  await readFile(resolve(import.meta.dirname, "../VOICE-README.md")),
);
console.log("Voice generation complete.");
