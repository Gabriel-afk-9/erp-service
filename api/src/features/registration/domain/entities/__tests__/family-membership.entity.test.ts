import { describe, expect, it } from "vitest";
import type { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { FamilyMembership } from "../family-membership.entity.js";
import { InvalidDateRangeError } from "../../errors/invalid-date-range.error.js";
import { TextTooLongError } from "../../errors/text-too-long.error.js";

const TODAY = "2026-05-01" as CivilDate;

describe("FamilyMembership validation", () => {
  it("creates membership with open-ended validity", () => {
    const membership = FamilyMembership.create(
      { personId: "p1", familyId: "f1", isReference: false, validFrom: "2024-01-01" as CivilDate },
      TODAY,
    );
    expect(membership.validUntil).toBeNull();
    expect(membership.isActiveOn("2024-06-01" as CivilDate)).toBe(true);
    expect(membership.isActiveOn("2023-12-31" as CivilDate)).toBe(false);
  });

  it("rejects future validFrom", () => {
    expect(() =>
      FamilyMembership.create(
        { personId: "p1", familyId: "f1", isReference: false, validFrom: "2999-01-01" as CivilDate },
        TODAY,
      ),
    ).toThrow(InvalidDateRangeError);
  });

  it("rejects end before start", () => {
    const membership = FamilyMembership.create(
      { personId: "p1", familyId: "f1", isReference: false, validFrom: "2024-01-01" as CivilDate },
      TODAY,
    );
    expect(() => membership.end("2023-12-31" as CivilDate)).toThrow(InvalidDateRangeError);
  });

  it("treats blank relationship as null and rejects too long relationship", () => {
    const blank = FamilyMembership.create(
      { personId: "p1", familyId: "f1", isReference: false, validFrom: "2024-01-01" as CivilDate, relationshipToReference: "   " },
      TODAY,
    );
    expect(blank.relationshipToReference).toBeNull();
    expect(() =>
      FamilyMembership.create(
        {
          personId: "p1",
          familyId: "f1",
          isReference: false,
          validFrom: "2024-01-01" as CivilDate,
          relationshipToReference: "x".repeat(101),
        },
        TODAY,
      ),
    ).toThrow(TextTooLongError);
  });

  it("detects overlap on [start, end) boundaries", () => {
    const membership = FamilyMembership.create(
      { personId: "p1", familyId: "f1", isReference: false, validFrom: "2024-01-01" as CivilDate },
      TODAY,
    );
    membership.end("2024-06-01" as CivilDate);
    expect(membership.overlaps("2024-06-01" as CivilDate, null)).toBe(false);
    expect(membership.overlaps("2024-05-01" as CivilDate, null)).toBe(true);
  });
});
