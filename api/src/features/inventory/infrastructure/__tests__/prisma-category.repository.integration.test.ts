import { describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/infrastructure/database/prisma.client.js";
import { Category } from "../../domain/entities/category.entity.js";
import { PrismaCategoryRepository } from "../repositories/prisma-category.repository.js";

describe("PrismaCategoryRepository integration", () => {
  it("saves and finds by id", async () => {
    const repository = new PrismaCategoryRepository(prisma);
    const category = Category.create({ name: `Teste ${Date.now()}` });
    await repository.save(category);
    const found = await repository.findById(category.id);
    expect(found?.name).toBe(category.name);
  });

  it("findByName is case-insensitive", async () => {
    const repository = new PrismaCategoryRepository(prisma);
    const name = `Caso ${Date.now()}`;
    const category = Category.create({ name });
    await repository.save(category);
    const found = await repository.findByName(name.toLowerCase());
    expect(found?.id).toBe(category.id);
  });

  it("findByQuery respects onlyActive", async () => {
    const repository = new PrismaCategoryRepository(prisma);
    const category = Category.create({ name: `Inativa ${Date.now()}` });
    category.deactivate();
    await repository.save(category);
    const activeOnly = await repository.findByQuery("", true);
    expect(activeOnly.some((item) => item.id === category.id)).toBe(false);
    const withInactive = await repository.findByQuery("", false);
    expect(withInactive.some((item) => item.id === category.id)).toBe(true);
  });
});
