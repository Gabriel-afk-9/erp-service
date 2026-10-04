import { describe, expect, it } from "vitest";
import { Item } from "../entities/item.entity.js";
import { ItemInactiveError } from "../errors/item-inactive.error.js";

const BASE = { categoryId: "11111111-1111-1111-1111-111111111111", unitId: "22222222-2222-2222-2222-222222222222" };

describe("Item entity", () => {
  it("creates preserving requiresExpiration true", () => {
    const item = Item.create({ ...BASE, name: "Arroz 1kg", requiresExpiration: true });
    expect(item.requiresExpiration).toBe(true);
    expect(item.isActive).toBe(true);
  });

  it("creates preserving requiresExpiration false", () => {
    const item = Item.create({ ...BASE, name: "Sabonete", requiresExpiration: false });
    expect(item.requiresExpiration).toBe(false);
  });

  it("update changes fields and increments revision", () => {
    const item = Item.create({ ...BASE, name: "Arroz 1kg", requiresExpiration: true });
    item.update({ name: "Arroz 5kg", description: "Pacote maior", requiresExpiration: false });
    expect(item.name).toBe("Arroz 5kg");
    expect(item.requiresExpiration).toBe(false);
    expect(item.revision).toBe(2);
  });

  it("second deactivate throws ItemInactiveError", () => {
    const item = Item.create({ ...BASE, name: "Arroz 1kg", requiresExpiration: true });
    item.deactivate();
    expect(item.isActive).toBe(false);
    expect(() => item.deactivate()).toThrow(ItemInactiveError);
  });
});
