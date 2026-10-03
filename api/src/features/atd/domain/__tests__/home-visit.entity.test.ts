import { describe, expect, it } from "vitest";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { HomeVisit } from "../../domain/entities/home-visit.entity.js";
import { ObservedSituationInvalidError } from "../../domain/errors/observed-situation-invalid.error.js";

describe("HomeVisit", () => {
  it("creates with a valid observed situation", () => {
    const visit = HomeVisit.create({
      id: Id.generate(),
      serviceRecordId: "sr-001",
      observedSituation: "Familia em situacao estavel",
    });
    expect(visit.observedSituation).toBe("Familia em situacao estavel");
  });

  it("throws when observed situation is blank after trim", () => {
    expect(() =>
      HomeVisit.create({ id: Id.generate(), serviceRecordId: "sr-001", observedSituation: "   " }),
    ).toThrow(ObservedSituationInvalidError);
  });
});
