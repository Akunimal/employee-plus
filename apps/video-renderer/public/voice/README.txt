The renderer uses one VoiceStudio-generated WAV track for the complete narration:

- `employee-plus-narration.wav`

Each short scene is synthesized from the same VoiceStudio Demo Voice profile (`demo0001`), with the same model settings and deterministic seed. The segments are time-fitted and assembled into one 76-second WAV track, so the final video has one consistent cloned voice, clean scene boundaries, and avoids a long-form repetition cascade.

The repository does not include generated audio. Run `pnpm video:voice` while VoiceStudio is running locally on port 3900. The generator uses VoiceStudio's local OpenAI-compatible `POST /v1/audio/speech` endpoint and the `demo0001` profile. Review the selected model's terms before publishing generated audio.
