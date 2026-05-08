import type { PackResult } from "glb-pack/web";

export interface Stats {
  /** Filename stem of the input file (no extension). */
  filename: string;
  /** baseColor texture pixel dimensions before packing. */
  originalSize: { width: number; height: number };
  /** baseColor texture pixel dimensions after packing. */
  packedSize: { width: number; height: number };
  /**
   * 0..100. Percent reduction in baseColor pixel area.
   * Example: 128*128 → 84*60 → 100 * (1 - 5040/16384) ≈ 69.24
   */
  areaReductionPct: number;
}

export type AppState =
  | { kind: "idle" }
  | { kind: "loading-preview"; file: File }
  | { kind: "packing"; file: File }
  | { kind: "done"; file: File; result: PackResult; stats: Stats; zipName: string }
  | { kind: "error"; message: string };
