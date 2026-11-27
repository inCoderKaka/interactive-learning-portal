"use client";
import type { ComponentType } from "react";
import { NounVerb, RelLab, StateLab, VendingState } from "./oo";
import { CompositeTree, DecoratorOnion, UndoRedo } from "./oo3";
import { ComboExplosion, DiSwap, DispatchLab, DoublesLab, InvariantGuard, LspLab, OcpLab } from "./oo2";

/** LLD simulations by widget id (sequence scenarios for LLD live in scenarios/lld.ts). Ids are listed in ids.ts. */
export const LLD_SIMS: Record<string, ComponentType> = {
  "noun-verb": NounVerb,
  "rel-lab": RelLab,
  "state-lab": () => <StateLab />,
  "vending-state": VendingState,
  "invariant-guard": InvariantGuard,
  "combo-explosion": ComboExplosion,
  "dispatch-lab": DispatchLab,
  "ocp-lab": OcpLab,
  "lsp-lab": LspLab,
  "di-swap": DiSwap,
  "decorator-onion": DecoratorOnion,
  "composite-tree": CompositeTree,
  "undo-redo": UndoRedo,
  "doubles-lab": DoublesLab,
};
