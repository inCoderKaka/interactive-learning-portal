"use client";
// Read-only Excalidraw that shows one recorded whiteboard frame at a time (replay, MI-FB-2).
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

type Api = Parameters<NonNullable<React.ComponentProps<typeof Excalidraw>["excalidrawAPI"]>>[0];
type Elements = Parameters<Api["updateScene"]>[0]["elements"];

export default function ReplayBoard({ elements }: { elements: unknown[] }) {
  const api = useRef<Api | null>(null);
  useEffect(() => {
    api.current?.updateScene({ elements: elements as Elements });
    api.current?.scrollToContent(undefined, { fitToContent: true, animate: false });
  }, [elements]);
  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-line" aria-label="Whiteboard at this moment">
      <Excalidraw
        theme="dark"
        viewModeEnabled
        initialData={{ elements: elements as Elements, scrollToContent: true }}
        excalidrawAPI={(a) => { api.current = a; }}
        UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false, changeViewBackgroundColor: false, clearCanvas: false } }}
      />
    </div>
  );
}
