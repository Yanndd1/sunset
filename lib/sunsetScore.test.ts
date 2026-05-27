import { describe, expect, it } from "vitest";
import { scoreSky, tierForScore, type SkyConditions } from "./sunsetScore";

const overcastLow: SkyConditions = {
  cloudLow: 100,
  cloudMid: 80,
  cloudHigh: 40,
  visibility: 6000,
  humidity: 92,
};

const clearDry: SkyConditions = {
  cloudLow: 0,
  cloudMid: 0,
  cloudHigh: 0,
  visibility: 30000,
  humidity: 30,
};

const idealPartial: SkyConditions = {
  cloudLow: 5,
  cloudMid: 45,
  cloudHigh: 30,
  visibility: 28000,
  humidity: 35,
};

const textbookPerfect: SkyConditions = {
  cloudLow: 0,
  cloudMid: 50,
  cloudHigh: 0,
  visibility: 30000,
  humidity: 25,
};

describe("scoreSky", () => {
  it("returns a near-zero score when low overcast blocks the horizon", () => {
    expect(scoreSky(overcastLow)).toBeLessThan(10);
  });

  it("rates a clear dry sky as modest (pastel sky)", () => {
    const s = scoreSky(clearDry);
    expect(s).toBeGreaterThanOrEqual(20);
    expect(s).toBeLessThanOrEqual(45);
  });

  it("rates an ideal partial-cloud sky in the Beau tier or above", () => {
    expect(scoreSky(idealPartial)).toBeGreaterThanOrEqual(52);
  });

  it("rates a textbook-perfect sky as outstanding", () => {
    expect(scoreSky(textbookPerfect)).toBeGreaterThanOrEqual(85);
  });

  it("penalises increasing low cloud", () => {
    const base = {
      cloudMid: 45,
      cloudHigh: 30,
      visibility: 28000,
      humidity: 35,
    };
    expect(scoreSky({ ...base, cloudLow: 10 })).toBeGreaterThan(
      scoreSky({ ...base, cloudLow: 70 }),
    );
  });

  it("rewards drier, clearer air", () => {
    const base = { cloudLow: 5, cloudMid: 45, cloudHigh: 30 };
    expect(
      scoreSky({ ...base, visibility: 30000, humidity: 25 }),
    ).toBeGreaterThan(scoreSky({ ...base, visibility: 6000, humidity: 95 }));
  });

  it("boosts on moderate aerosols and dampens on thick haze", () => {
    expect(scoreSky({ ...idealPartial, aod: 0.12 })).toBeGreaterThan(
      scoreSky({ ...idealPartial, aod: 0.02 }),
    );
    expect(scoreSky({ ...idealPartial, aod: 0.12 })).toBeGreaterThan(
      scoreSky({ ...idealPartial, aod: 0.7 }),
    );
  });

  it("penalises a high precipitation probability", () => {
    expect(scoreSky({ ...idealPartial, precipProb: 0 })).toBeGreaterThan(
      scoreSky({ ...idealPartial, precipProb: 80 }),
    );
  });

  it("rewards a cirrus-like sky over a flat stratus-like sky", () => {
    const cirrus: SkyConditions = {
      cloudLow: 5,
      cloudMid: 20,
      cloudHigh: 55,
      visibility: 30000,
      humidity: 35,
    };
    const stratus: SkyConditions = {
      cloudLow: 5,
      cloudMid: 80,
      cloudHigh: 5,
      visibility: 18000,
      humidity: 85,
    };
    expect(scoreSky(cirrus)).toBeGreaterThan(scoreSky(stratus));
  });

  it("rewards a sharply rising pressure tendency", () => {
    expect(
      scoreSky({ ...idealPartial, pressureDelta24h: 8 }),
    ).toBeGreaterThan(scoreSky({ ...idealPartial, pressureDelta24h: 0 }));
  });

  it("scales by terrain factor", () => {
    expect(scoreSky(idealPartial, 1.06)).toBeGreaterThan(
      scoreSky(idealPartial, 0.97),
    );
  });
});

describe("tierForScore", () => {
  it("maps scores to the recalibrated French tiers", () => {
    expect(tierForScore(0).label).toBe("Médiocre");
    expect(tierForScore(17).label).toBe("Médiocre");
    expect(tierForScore(18).label).toBe("Quelconque");
    expect(tierForScore(34).label).toBe("Quelconque");
    expect(tierForScore(35).label).toBe("Correct");
    expect(tierForScore(52).label).toBe("Beau");
    expect(tierForScore(68).label).toBe("Superbe");
    expect(tierForScore(82).label).toBe("Exceptionnel");
    expect(tierForScore(100).label).toBe("Exceptionnel");
  });
});
