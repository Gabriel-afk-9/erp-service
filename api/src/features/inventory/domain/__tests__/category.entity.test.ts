import { describe, expect, it } from "vitest";
import { Category } from "../entities/category.entity.js";
import { CategoryInactiveError } from "../errors/category-inactive.error.js";

describe("Category entity", () => {
  it("creates with valid name, active and revision 1", () => {
    const category = Category.create({ name: "Alimentos" });
    expect(category.isActive).toBe(true);
    expect(category.revision).toBe(1);
    expect(category.name).toBe("Alimentos");
  });

  it("update increments revision", () => {
    const category = Category.create({ name: "Alimentos" });
    category.update({ description: "Itens alimenticios" });
    expect(category.revision).toBe(2);
    expect(category.description).toBe("Itens alimenticios");
  });

  it("deactivate sets inactive and increments revision", () => {
    const category = Category.create({ name: "Alimentos" });
    category.deactivate();
    expect(category.isActive).toBe(false);
    expect(category.revision).toBe(2);
  });

  it("second deactivate throws CategoryInactiveError", () => {
    const category = Category.create({ name: "Alimentos" });
    category.deactivate();
    expect(() => category.deactivate()).toThrow(CategoryInactiveError);
  });
});
