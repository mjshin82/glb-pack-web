import { runPack, type PackResult } from "glb-pack/web";
import { NodeIO } from "@gltf-transform/core";
import type { Stats } from "./types.js";

export interface ComputeStatsInput {
  filename: string;
  originalSize: { width: number; height: number };
  packedSize: { width: number; height: number };
}

export function computeStats(input: ComputeStatsInput): Stats {
  const originalArea = input.originalSize.width * input.originalSize.height;
  const packedArea = input.packedSize.width * input.packedSize.height;
  const raw = 100 * (1 - packedArea / originalArea);
  return {
    filename: input.filename,
    originalSize: input.originalSize,
    packedSize: input.packedSize,
    areaReductionPct: raw < 0 ? 0 : raw,
  };
}

export async function probeOriginalTextureSize(
  glbBytes: Uint8Array,
): Promise<{ width: number; height: number }> {
  // Parse GLB, find baseColor texture, decode bytes via Image() to read dimensions.
  const io = new NodeIO();
  const doc = await io.readBinary(glbBytes);
  const material = doc.getRoot().listMaterials()[0];
  if (!material) throw new Error("probeOriginalTextureSize: no material in GLB");
  const tex = material.getBaseColorTexture();
  if (!tex) throw new Error("probeOriginalTextureSize: no baseColor texture");
  const buf = tex.getImage();
  if (!buf) throw new Error("probeOriginalTextureSize: baseColor has no image data");

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const blob = new Blob([buf as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("probeOriginalTextureSize: Image decode failed"));
    };
    img.src = url;
  });
}

export interface RunAndPackResult {
  result: PackResult;
  stats: Stats;
}

export async function runAndPack(file: File): Promise<RunAndPackResult> {
  const glbBytes = new Uint8Array(await file.arrayBuffer());
  const stem = file.name.replace(/\.glb$/i, "");
  // Run probe and pack in parallel
  const [originalSize, result] = await Promise.all([
    probeOriginalTextureSize(glbBytes),
    runPack(glbBytes, { filename: stem, zip: true }),
  ]);
  const stats = computeStats({
    filename: stem,
    originalSize,
    packedSize: result.baseColorSize,
  });
  return { result, stats };
}
