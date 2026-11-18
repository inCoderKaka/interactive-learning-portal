"use client";
import type { Engine } from "./types";

/** Typed chat. The interviewer's text streams into the transcript. */
export const textEngine: Engine = {
  id: "text",
  label: "Text",
  unavailable: () => null,
  async start(_opts, cb) {
    return {
      id: "text",
      kind: "pipeline",
      async speak(chunks, signal) {
        let text = "";
        const t0 = performance.now();
        for await (const c of chunks) {
          if (signal.aborted) break;
          if (!text) cb.latency("first_token", performance.now() - t0);
          text += c;
          cb.interviewerPartial(text);
        }
        return { text, interrupted: signal.aborted };
      },
      cancelSpeech() {},
      mute() {},
      async stop() {},
    };
  },
};
