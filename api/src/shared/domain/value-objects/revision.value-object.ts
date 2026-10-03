export type Revision = number & { readonly _brand: "Revision" };

export const Revision = {
  of(n: number): Revision {
    if (!Number.isInteger(n) || n < 1) {
      throw new Error("Revision must be an integer >= 1");
    }
    return n as Revision;
  },
};
