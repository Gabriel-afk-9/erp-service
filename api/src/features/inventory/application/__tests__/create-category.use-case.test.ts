import { describe, expect, it } from "vitest";
import { Category } from "../../domain/entities/category.entity.js";
import { CategoryNameAlreadyExistsError } from "../../domain/errors/category-name-already-exists.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { CreateCategoryUseCase } from "../use-cases/create-category/create-category.use-case.js";

class InMemoryCategories implements CategoryRepository {
  readonly store = new Map<string, Category>();

  async save(category: Category): Promise<void> {
    this.store.set(category.id, category);
  }

  async findById(id: string): Promise<Category | null> {
    return this.store.get(id) ?? null;
  }

  async findByName(name: string): Promise<Category | null> {
    for (const category of this.store.values()) {
      if (category.name.toLowerCase() === name.toLowerCase()) return category;
    }
    return null;
  }

  async findByQuery(): Promise<Category[]> {
    return [...this.store.values()];
  }
}

describe("CreateCategoryUseCase", () => {
  it("creates category without conflict", async () => {
    const repository = new InMemoryCategories();
    const useCase = new CreateCategoryUseCase(repository);
    const output = await useCase.execute({ name: "Alimentos" });
    expect(output.categoryId).toBeTruthy();
    expect(output.name).toBe("Alimentos");
  });

  it("duplicate name throws CategoryNameAlreadyExistsError", async () => {
    const repository = new InMemoryCategories();
    const useCase = new CreateCategoryUseCase(repository);
    await useCase.execute({ name: "Alimentos" });
    await expect(useCase.execute({ name: "Alimentos" })).rejects.toThrow(CategoryNameAlreadyExistsError);
  });
});
