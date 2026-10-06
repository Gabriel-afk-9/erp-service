import { describe, expect, it } from "vitest";
import { deriveLotStatus } from "../entities/stock-lot.entity.js";
import { movementEffect } from "../entities/stock-movement.entity.js";

describe("lot status derivation (D-06)", () => {
  it("available when on hand positive and validity adequate", () => {
    expect(deriveLotStatus("2026-01-01", "2024-01-01", 5)).toBe("AVAILABLE");
  });

  it("expired when validity passed with positive balance", () => {
    expect(deriveLotStatus("2023-01-01", "2024-01-01", 5)).toBe("EXPIRED");
  });

  it("empty when balance is zero even with validity", () => {
    expect(deriveLotStatus("2026-01-01", "2024-01-01", 0)).toBe("EMPTY");
  });

  it("available without expiration", () => {
    expect(deriveLotStatus(null, "2024-01-01", 3)).toBe("AVAILABLE");
  });
});

describe("movement effect", () => {
  it("maps types to balance delta sign", () => {
    expect(movementEffect("DONATION_IN")).toBe(1);
    expect(movementEffect("ADJUSTMENT_IN")).toBe(1);
    expect(movementEffect("OPENING_BALANCE")).toBe(1);
    expect(movementEffect("ADJUSTMENT_OUT")).toBe(-1);
    expect(movementEffect("TRIAGE_DISCARD")).toBe(0);
  });
});
