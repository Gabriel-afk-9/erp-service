import { describe, expect, it } from "vitest";
import type { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { RegisterPersonUseCase } from "../register-person/register-person.use-case.js";
import { AddFamilyMemberUseCase } from "../add-family-member/add-family-member.use-case.js";
import { FamilyNotFoundError } from "../../../domain/errors/family-not-found.error.js";
import { HolderAlreadyExistsError } from "../../../domain/errors/holder-already-exists.error.js";
import { PersonAlreadyMemberError } from "../../../domain/errors/person-already-member.error.js";
import { InvalidDateRangeError } from "../../../domain/errors/invalid-date-range.error.js";
import { CpfFormatError } from "../../../domain/errors/cpf-format.error.js";
import {
  FakeRegistrationUnitOfWork,
  stubFamily,
  stubMembership,
  stubPerson,
} from "../../__tests__/fakes.js";

const ACTOR = "99999999-9999-9999-9999-999999999999";

function seedFamily(uow: FakeRegistrationUnitOfWork, holder: boolean): string {
  const family = stubFamily({ id: "11111111-1111-1111-1111-111111111111" });
  void uow.families.save(family);
  if (holder) {
    const holderPerson = stubPerson({ id: "00000000-0000-0000-0000-000000000001" });
    void uow.persons.save(holderPerson);
    const membership = stubMembership({
      personId: holderPerson.id,
      familyId: family.id,
      isReference: true,
      validFrom: "2024-01-01" as CivilDate,
      validUntil: null,
    });
    void uow.memberships.save(membership);
  }
  return family.id;
}

describe("register-person validation", () => {
  it("creates person with minimal data (CAD-AC01)", async () => {
    const uow = new FakeRegistrationUnitOfWork();
    const familyId = seedFamily(uow, false);
    const useCase = new RegisterPersonUseCase(uow);
    const output = await useCase.execute({
      name: "Ana Souza",
      familyId,
      validFrom: "2024-01-01",
      isReference: false,
      actorId: ACTOR,
    });
    expect(output.personId).toBeTypeOf("string");
    expect(output.membershipId).toBeTypeOf("string");
  });

  it("returns 404 equivalent when family does not exist", async () => {
    const uow = new FakeRegistrationUnitOfWork();
    const useCase = new RegisterPersonUseCase(uow);
    await expect(
      useCase.execute({
        name: "Ana Souza",
        familyId: "no-such-family",
        validFrom: "2024-01-01",
        isReference: false,
        actorId: ACTOR,
      }),
    ).rejects.toThrow(FamilyNotFoundError);
  });

  it("rejects second holder in the same family (409)", async () => {
    const uow = new FakeRegistrationUnitOfWork();
    const familyId = seedFamily(uow, true);
    const useCase = new RegisterPersonUseCase(uow);
    await expect(
      useCase.execute({
        name: "Second Holder",
        familyId,
        validFrom: "2024-02-01",
        isReference: true,
        actorId: ACTOR,
      }),
    ).rejects.toThrow(HolderAlreadyExistsError);
  });

  it("rejects invalid CPF and future dates (422)", async () => {
    const uow = new FakeRegistrationUnitOfWork();
    const familyId = seedFamily(uow, false);
    const useCase = new RegisterPersonUseCase(uow);
    await expect(
      useCase.execute({ name: "Ana", familyId, validFrom: "2024-01-01", isReference: false, cpf: "123", actorId: ACTOR }),
    ).rejects.toThrow(CpfFormatError);
    await expect(
      useCase.execute({
        name: "Ana",
        familyId,
        validFrom: "2999-01-01",
        isReference: false,
        actorId: ACTOR,
      }),
    ).rejects.toThrow(InvalidDateRangeError);
  });
});

describe("add-family-member MVP-D04 guard", () => {
  it("rejects overlapping membership for the same person (409)", async () => {
    const uow = new FakeRegistrationUnitOfWork();
    const familyId = seedFamily(uow, false);
    const person = stubPerson({ id: "22222222-2222-2222-2222-222222222222" });
    await uow.persons.save(person);
    await uow.memberships.save(
      stubMembership({ personId: person.id, familyId, validFrom: "2024-01-01" as CivilDate, validUntil: null }),
    );
    const useCase = new AddFamilyMemberUseCase(uow);
    await expect(
      useCase.execute({ personId: person.id, familyId, validFrom: "2024-06-01", isReference: false, actorId: ACTOR }),
    ).rejects.toThrow(PersonAlreadyMemberError);
  });
});
