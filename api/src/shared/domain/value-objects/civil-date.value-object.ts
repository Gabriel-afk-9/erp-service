import { CivilDateFormatError } from "../errors/civil-date-format.error.js";

export type CivilDate = string & { readonly _brand: "CivilDate" };

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CivilDate = {
  from(raw: string): CivilDate {
    if (!CIVIL_DATE_PATTERN.test(raw)) {
      throw new CivilDateFormatError(raw);
    }
    const [yearRaw, monthRaw, dayRaw] = raw.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (month < 1 || month > 12) {
      throw new CivilDateFormatError(raw);
    }
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) {
      throw new CivilDateFormatError(raw);
    }
    return raw as CivilDate;
  },
};
