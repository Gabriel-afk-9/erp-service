import { randomUUID } from "node:crypto";

export type Id = string & { readonly _brand: "Id" };

export const Id = {
  generate(): Id {
    return randomUUID() as Id;
  },
  from(raw: string): Id {
    if (typeof raw !== "string" || raw.length === 0) {
      throw new Error("Invalid Id");
    }
    return raw as Id;
  },
};
