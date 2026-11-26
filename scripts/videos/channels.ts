/**
 * Every tracked channel. `file` is the catalog in scripts/videos/catalog/<file>.tsv (refresh with fetch.sh).
 * `q`: the channel publishes problem solutions, so titles are matched against LeetCode.
 * `areas`: which outline areas its concept videos are matched into.
 * `hi`: Hindi or Hinglish.
 * `mine`: named by the user (vs picked from research).
 */
import type { Area } from "@/lib/types";

export interface Channel { file: string; name: string; areas: Area[]; q?: boolean; hi?: boolean; mine?: boolean }

export const CHANNELS: Channel[] = [
  // the user's DSA channels
  { file: "NeetCode", name: "NeetCode", areas: ["dsa"], q: true, mine: true },
  { file: "NeetCodeIO", name: "NeetCodeIO", areas: ["dsa"], q: true, mine: true },
  { file: "ARYANMITTAL", name: "Aryan Mittal", areas: ["dsa", "lld", "hld"], q: true, mine: true },
  { file: "codestorywithMIK", name: "codestorywithMIK", areas: ["dsa"], q: true, hi: true, mine: true },
  { file: "WilliamFiset-videos", name: "WilliamFiset", areas: ["dsa"], q: true, mine: true },
  { file: "abdul_bari", name: "Abdul Bari", areas: ["dsa"], mine: true },
  { file: "techdose4u", name: "Techdose", areas: ["dsa", "hld"], q: true, mine: true },
  { file: "TechdoseEngineering", name: "Techdose Engineering", areas: ["hld", "ai"], mine: true },
  // the user's HLD / LLD / AI channels
  { file: "codeWithAryanBhai", name: "codeWithAryan", areas: ["lld", "hld"], hi: true, mine: true },
  { file: "ConceptAndCodingByShrayansh", name: "Concept && Coding", areas: ["lld", "hld"], hi: true, mine: true },
  { file: "krishnaik06", name: "Krish Naik", areas: ["ai"], mine: true },
  // HLD, picked from research
  { file: "ByteByteGo", name: "ByteByteGo", areas: ["hld"] },
  { file: "hnasr", name: "Hussein Nasser", areas: ["hld"] },
  { file: "gkcs", name: "Gaurav Sen", areas: ["hld", "dsa"] },
  { file: "hello_interview", name: "Hello Interview", areas: ["hld"] },
  { file: "jordanhasnolife5163", name: "Jordan has no life", areas: ["hld"] },
  { file: "AsliEngineering", name: "Arpit Bhayani", areas: ["hld"] },
  { file: "TechDummiesNarendraL", name: "Tech Dummies Narendra L", areas: ["hld"] },
  { file: "sudocode", name: "sudoCODE", areas: ["hld"], hi: true },
  { file: "kleppmann", name: "Martin Kleppmann", areas: ["hld"] },
  { file: "6.824", name: "MIT 6.824", areas: ["hld"] },
  { file: "CMUDatabaseGroup", name: "CMU Database Group", areas: ["hld"] },
  { file: "GoogleCloudTech", name: "Google Cloud Tech", areas: ["hld", "ai"] },
  // LLD, picked from research
  { file: "ChristopherOkhravi", name: "Christopher Okhravi", areas: ["lld"] },
  { file: "anomaly2104", name: "Udit Agarwal", areas: ["lld"] },
  { file: "CoderArmy9", name: "Coder Army", areas: ["lld", "hld"], hi: true },
  { file: "EngineeringDigest", name: "Engineering Digest", areas: ["lld", "hld"], hi: true },
  // AI, picked from research
  { file: "AndrejKarpathy", name: "Andrej Karpathy", areas: ["ai"] },
  { file: "3blue1brown", name: "3Blue1Brown", areas: ["ai"] },
  { file: "statquest", name: "StatQuest", areas: ["ai"] },
  { file: "campusx-official", name: "CampusX", areas: ["ai"], hi: true },
  { file: "umarjamilai", name: "Umar Jamil", areas: ["ai"] },
  { file: "YannicKilcher", name: "Yannic Kilcher", areas: ["ai"] },
  { file: "WelchLabs", name: "Welch Labs", areas: ["ai"] },
  { file: "SerranoAcademy", name: "Serrano.Academy", areas: ["ai"] },
  { file: "stanfordonline", name: "Stanford Online", areas: ["ai"] },
  { file: "GoogleDeepMind", name: "Google DeepMind", areas: ["ai"] },
  { file: "GoogleDevelopers", name: "Google for Developers", areas: ["ai", "hld"] },
  { file: "anthropic-ai", name: "Anthropic", areas: ["ai"] },
];
