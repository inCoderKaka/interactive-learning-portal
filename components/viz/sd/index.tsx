"use client";
import type { ComponentType } from "react";
import { LbRace } from "./lb";
import { LatencyLadder, Queueing } from "./basics";
import { HolBlocking, PushCompare } from "./net";
import { HealthTimeline, L4L7 } from "./traffic";
import { EvictionRace, Stampede } from "./caching";
import { BtreeLsm, IndexExplorer, RowColumn } from "./db";
import { PartitionSim } from "./repl";
import { PartitionLoad, Rebalance, Snowflake } from "./part";
import { IsolationLab, Raft } from "./txn";
import { ConsumerGroups, MapReduce, QueueLog, Watermarks } from "./msg";
import { Seq } from "./Seq";
import { SCENARIOS } from "./scenarios";

const SIMS: Record<string, ComponentType> = {
  "load-balancer": LbRace,
  "latency-ladder": LatencyLadder,
  queueing: Queueing,
  "hol-blocking": HolBlocking,
  "push-compare": PushCompare,
  "l4-l7": L4L7,
  "health-timeline": HealthTimeline,
  "eviction-race": EvictionRace,
  stampede: Stampede,
  "index-explorer": IndexExplorer,
  "btree-lsm": BtreeLsm,
  "row-column": RowColumn,
  "partition-sim": PartitionSim,
  "partition-load": PartitionLoad,
  rebalance: Rebalance,
  snowflake: Snowflake,
  "isolation-lab": IsolationLab,
  raft: Raft,
  "queue-log": QueueLog,
  "consumer-groups": ConsumerGroups,
  mapreduce: MapReduce,
  watermarks: Watermarks,
};

/** Any HLD visual by id: a simulation, or a sequence scenario (ids starting "seq-"). */
export function HldWidget({ id }: { id: string }) {
  const Sim = SIMS[id];
  if (Sim) return <Sim />;
  const sc = SCENARIOS[id];
  return sc ? <Seq sc={sc} /> : null;
}
