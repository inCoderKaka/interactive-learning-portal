"use client";
// Images and voice clips for notes: kept as blobs in IndexedDB, mirrored to the private
// `note-media` bucket when signed in, and served to the UI as cached object URLs.

import { useEffect, useState } from "react";
import { idbGet, idbPut } from "./idb";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { uid } from "./types";

interface MediaRec { blob: Blob; type: string; uploaded?: boolean }

const urls = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

const uidOf = () => useStore.getState().user?.id;

/** Stores a blob and returns its media id. Uploads in the background when signed in. */
export async function putMedia(blob: Blob, id = uid()): Promise<string> {
  await idbPut("media", id, { blob, type: blob.type } satisfies MediaRec);
  urls.set(id, URL.createObjectURL(blob));
  void uploadMedia(id);
  return id;
}

export async function uploadMedia(id: string) {
  const sb = supabase(), u = uidOf();
  if (!sb || !u) return;
  const rec = await idbGet<MediaRec>("media", id);
  if (!rec || rec.uploaded) return;
  const { error } = await sb.storage.from("note-media").upload(`${u}/${id}`, rec.blob, { contentType: rec.type.split(";")[0] || "application/octet-stream", upsert: true });
  if (!error) await idbPut("media", id, { ...rec, uploaded: true });
}

/** Object URL for a media id: memory cache, then IndexedDB, then the cloud bucket. */
export function mediaUrl(id: string): Promise<string | null> {
  const hit = urls.get(id);
  if (hit) return Promise.resolve(hit);
  const p = pending.get(id);
  if (p) return p;
  const job = (async () => {
    const rec = await idbGet<MediaRec>("media", id).catch(() => undefined);
    let blob = rec?.blob;
    if (!blob) {
      const sb = supabase(), u = uidOf();
      if (sb && u) {
        const { data } = await sb.storage.from("note-media").download(`${u}/${id}`);
        if (data) {
          blob = data;
          await idbPut("media", id, { blob: data, type: data.type, uploaded: true } satisfies MediaRec).catch(() => {});
        }
      }
    }
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urls.set(id, url);
    return url;
  })().finally(() => pending.delete(id));
  pending.set(id, job);
  return job;
}

export function useMediaUrl(id: string | undefined) {
  const [url, setUrl] = useState<string | null>(() => (id ? urls.get(id) ?? null : null));
  useEffect(() => {
    let live = true;
    if (id) mediaUrl(id).then((u) => live && setUrl(u));
    return () => { live = false; };
  }, [id]);
  return url;
}

/** Downscale and re-encode an image so pasted screenshots stay small. GIFs keep their animation. */
export async function compressImage(file: Blob, max = 1800): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  if (file.type === "image/gif" || (scale === 1 && file.size < 300_000)) { bmp.close(); return { blob: file, w, h }; }
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", 0.86));
  return { blob: blob && blob.size < file.size ? blob : file, w, h };
}

/** data:image/...;base64,... → Blob (documents exported from Google Docs embed images this way). */
export function dataUriToBlob(uri: string): Blob | null {
  const m = uri.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!m) return null;
  try {
    if (!m[2]) return new Blob([decodeURIComponent(m[3])], { type: m[1] });
    const bin = atob(m[3].replace(/\s+/g, ""));
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: m[1] });
  } catch {
    return null;
  }
}
