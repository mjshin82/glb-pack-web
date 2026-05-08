import { describe, it, expect } from "vitest";
import { computeStats } from "../../src/pack.js";

describe("computeStats", () => {
  it("computes pixel area reduction percent (full to quarter)", () => {
    const stats = computeStats({
      filename: "model",
      originalSize: { width: 128, height: 128 },
      packedSize: { width: 64, height: 64 },
    });
    // originalArea = 16384, packedArea = 4096
    // reductionPct = 100 * (1 - 4096/16384) = 75
    expect(stats.areaReductionPct).toBeCloseTo(75, 5);
  });

  it("matches the JerseyBarrier sample (128x128 → 84x60 ≈ 69.24%)", () => {
    const stats = computeStats({
      filename: "JerseyBarrierB",
      originalSize: { width: 128, height: 128 },
      packedSize: { width: 84, height: 60 },
    });
    expect(stats.areaReductionPct).toBeCloseTo(69.24, 1);
  });

  it("returns 0 for identical sizes", () => {
    const stats = computeStats({
      filename: "x",
      originalSize: { width: 1024, height: 1024 },
      packedSize: { width: 1024, height: 1024 },
    });
    expect(stats.areaReductionPct).toBe(0);
  });

  it("preserves filename and sizes verbatim", () => {
    const stats = computeStats({
      filename: "JerseyBarrierB",
      originalSize: { width: 128, height: 128 },
      packedSize: { width: 84, height: 60 },
    });
    expect(stats.filename).toBe("JerseyBarrierB");
    expect(stats.originalSize).toEqual({ width: 128, height: 128 });
    expect(stats.packedSize).toEqual({ width: 84, height: 60 });
  });

  it("clamps negative reductions to 0 (defensive — packed shouldn't be larger)", () => {
    const stats = computeStats({
      filename: "x",
      originalSize: { width: 64, height: 64 },
      packedSize: { width: 128, height: 128 },
    });
    expect(stats.areaReductionPct).toBe(0);
  });
});
