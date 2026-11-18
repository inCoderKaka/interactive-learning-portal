# ADR 0007: Privacy mode uses on-device Whisper (Transformers.js, loaded on demand) or Chrome's on-device recognition

- Status: Accepted
- Date: 2026-11-19
- Context docs: [Product spec MI-X-6](../design/mock-interviewer/01-product-spec.md#7-further-modes), [Architecture §8](../design/mock-interviewer/02-architecture.md#8-security-and-privacy)

## Context

Privacy mode promises that nothing about a round leaves the learner's machine: speech recognition, the interviewer model and the voice all run locally. Chrome's default Web Speech recognition sends audio to Google, so it cannot be used. Two on-device options exist: Chrome's newer on-device recognition (`processLocally`, with a language pack it downloads once), and running Whisper in the browser. Shipping a speech model and an ONNX runtime with Ascent would make every page load heavier for a mode few learners use.

## Decision

- Speech-to-text offers two on-device choices: **Whisper** (default for privacy mode) and **Chrome on-device recognition** where the browser supports it.
- Whisper runs in a module Web Worker with Transformers.js (Apache-2.0), imported from jsDelivr at a pinned version (`@huggingface/transformers@4.3.1`) only when this mode starts. The English Whisper models (tiny, base, small) are downloaded once from Hugging Face and cached by the browser. WebGPU is used when present, otherwise WebAssembly.
- Utterances are cut by the existing voice activity detector and transcribed whole, as the OpenAI speech-to-text adapter already does.
- Text-to-speech uses only voices the browser marks as local (`localService`); in privacy mode it never falls back to a network voice.
- The LLM for every task is the learner's local model server. Privacy rounds are not synced to the cloud.
- Before every round, a "What leaves this device" list, computed from the actual configuration, shows each data type and where it goes.

## Consequences

- No new npm dependency and no cost to page weight for other modes.
- The first privacy round downloads 40–250 MB of model files, with a progress indicator. Model files come from Hugging Face; audio never does.
- Loading code from a CDN at runtime adds a supply-chain dependency on jsDelivr and that exact package version. The version is pinned, and the mode is opt-in. A later step could self-host the worker bundle.
- Whisper in the browser is slower than cloud recognition, about 0.5–2 s per utterance on a laptop, so turn-taking in privacy mode is noticeably slower than realtime voice.
