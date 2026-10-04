import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { computeQueryFingerprint } from "../../application/services/query-fingerprint.js";
import { stableStringify } from "../services/stable-stringify.js";

describe("stableStringify", () => {
  it("serializes keys in alphabetical order regardless of insertion order", () => {
    const first = stableStringify({ to: "2026-12-31", from: "2026-01-01", itemId: "abc" });
    const second = stableStringify({ itemId: "abc", from: "2026-01-01", to: "2026-12-31" });
    expect(first).toBe(second);
    expect(first).toBe('{"from":"2026-01-01","itemId":"abc","to":"2026-12-31"}');
  });

  it("orders nested objects and preserves array order", () => {
    const value = stableStringify({ b: { y: 1, x: 2 }, a: [{ q: 1, p: 2 }] });
    expect(value).toBe('{"a":[{"p":2,"q":1}],"b":{"x":2,"y":1}}');
  });

  it("same filters in different key order produce the same fingerprint", () => {
    const revision = "2026-05-01T10:00:00.000Z";
    const first = computeQueryFingerprint("stock-movements", { from: "2026-01-01", itemId: "x", to: "2026-12-31" }, revision);
    const second = computeQueryFingerprint("stock-movements", { to: "2026-12-31", from: "2026-01-01", itemId: "x" }, revision);
    expect(first).toBe(second);
    expect(first).toBe(createHash("sha256").update(stableStringify({ filters: { from: "2026-01-01", itemId: "x", to: "2026-12-31" }, maxRevision: revision, report: "stock-movements" })).digest("hex"));
  });

  it("different revisions produce different fingerprints", () => {
    const filters = { from: "2026-01-01", to: "2026-12-31" };
    expect(computeQueryFingerprint("deliveries", filters, "2026-05-01T10:00:00.000Z")).not.toBe(
      computeQueryFingerprint("deliveries", filters, "2026-05-02T10:00:00.000Z"),
    );
  });
});
