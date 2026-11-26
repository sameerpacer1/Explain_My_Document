import { describe, expect, it } from "vitest";
import { compressImageForUpload, fitWithinBounds } from "@/lib/imageCompression";

describe("Client image compression helpers", () => {
  it("scales large dimensions proportionally to fit within maxDimension", () => {
    expect(fitWithinBounds(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitWithinBounds(1200, 2400, 1600)).toEqual({ width: 800, height: 1600 });
    expect(fitWithinBounds(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithinBounds(0, 600, 1600)).toEqual({ width: 0, height: 0 });
  });

  it("returns PDFs and small images unchanged", async () => {
    const pdf = new File(["%PDF-1.7"], "doc.pdf", { type: "application/pdf" });
    const smallPng = new File([new Uint8Array(1000)], "small.png", {
      type: "image/png",
    });

    expect(await compressImageForUpload(pdf)).toBe(pdf);
    expect(await compressImageForUpload(smallPng)).toBe(smallPng);
  });
});
