export type Instant = string & { readonly _brand: "Instant" };

export const Instant = {
  now(): Instant {
    return new Date().toISOString() as Instant;
  },
  from(date: Date): Instant {
    return date.toISOString() as Instant;
  },
};
