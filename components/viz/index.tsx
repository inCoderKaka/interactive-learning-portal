"use client";
import Player from "./Player";
import { ALGOS } from "./algos";
import { WIDGETS } from "./Hld";

export default function Viz({ id }: { id?: string }) {
  if (!id) return null;
  if (ALGOS[id]) return <Player id={id} />;
  const W = WIDGETS[id];
  return W ? <W /> : null;
}
