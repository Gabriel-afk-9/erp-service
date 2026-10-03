import { CivilDateFormatError } from "../errors/civil-date-format.error.js";

export type CivilDate = string & { readonly _brand: "CivilDate" };

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CivilDate = {
  from(raw: string): CivilDate {
    if (!CIVIL_DATE_PATTERN.test(raw)) {
      throw new CivilDateFormatError(raw);
    }
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new CivilDateFormatError(raw);
    }
    return raw as CivilDate;
  },
};
