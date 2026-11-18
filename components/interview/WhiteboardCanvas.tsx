"use client";
// Excalidraw (MIT) whiteboard. Loaded only on the mock page, client-side.
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { digestScene, snapshotScene, type SceneElement } from "@/lib/interview/core/digest";
import type { DiagramSnapshot, Digest } from "@/lib/interview/core/types";

type Api = Parameters<NonNullable<React.ComponentProps<typeof Excalidraw>["excalidrawAPI"]>>[0];

export interface WhiteboardHandle {
  image(): Promise<Blob | null>;
}

export default function WhiteboardCanvas({ onDigest, onElements, readOnly, pauseMs = 2500, handle }: {
  onDigest: (d: Digest, snapshot: DiagramSnapshot, elements: unknown[]) => void;
  /** Every real edit, throttled (peer mode mirrors the board to the other browser). */
  onElements?: (elements: unknown[]) => void;
  readOnly?: boolean;
  pauseMs?: number;
  handle?: (h: WhiteboardHandle) => void;
}) {
  const api = useRef<Api | null>(null);
  const prev = useRef<DiagramSnapshot | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sceneVersion = useRef(-1);
  const onDigestRef = useRef(onDigest);
  onDigestRef.current = onDigest;
  const onElementsRef = useRef(onElements);
  onElementsRef.current = onElements;
  const lastSent = useRef(0);
  const trailing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(trailing.current); }, []);

  const image = async (): Promise<Blob | null> => {
    const a = api.current;
    if (!a) return null;
    const elements = a.getSceneElements();
    if (!elements.length) return null;
    return exportToBlob({ elements, appState: { ...a.getAppState(), exportBackground: true, viewBackgroundColor: "#ffffff", exportWithDarkMode: false }, files: a.getFiles(), mimeType: "image/jpeg", quality: 0.7, maxWidthOrHeight: 1280 });
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-line" aria-label="Whiteboard">
      <Excalidraw
        theme="dark"
        viewModeEnabled={readOnly}
        excalidrawAPI={(a) => { api.current = a; handle?.({ image }); }}
        UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false } }}
        onChange={(elements) => {
          // Excalidraw also calls onChange for selection, scroll and re-renders: only real edits restart the pause timer
          const version = elements.reduce((a, e) => a + e.version, elements.length);
          if (version === sceneVersion.current) return;
          sceneVersion.current = version;
          if (onElementsRef.current) {
            const sendNow = () => { lastSent.current = Date.now(); onElementsRef.current?.(JSON.parse(JSON.stringify(elements))); };
            clearTimeout(trailing.current);
            if (Date.now() - lastSent.current > 400) sendNow(); else trailing.current = setTimeout(sendNow, 400);
          }
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const snap = snapshotScene(elements as unknown as readonly SceneElement[]);
            const d = digestScene(prev.current, snap);
            prev.current = snap;
            // a plain copy of the live elements, kept as a replay frame
            if (d) onDigestRef.current(d, snap, JSON.parse(JSON.stringify(elements.filter((e) => !e.isDeleted))));
          }, pauseMs);
        }}
      />
    </div>
  );
}
