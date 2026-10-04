import { describe, expect, it } from "vitest";
import { ConcurrentModificationError } from "../../../../shared/domain/errors/concurrent-modification.error.js";
import { Category } from "../../domain/entities/category.entity.js";
import { CategoryNameAlreadyExistsError } from "../../domain/errors/category-name-already-exists.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { UpdateCategoryUseCase } from "../use-cases/update-category/update-category.use-case.js";

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

describe("UpdateCategoryUseCase", () => {
  it("updates name and increments revision", async () => {
    const repository = new InMemoryCategories();
    const category = Category.create({ name: "Alimentos" });
    await repository.save(category);
    const useCase = new UpdateCategoryUseCase(repository);
    const output = await useCase.execute({ categoryId: category.id, name: "Alimentos Novos", reason: "Correcao", expectedRevision: 1 });
    expect(output.revision).toBe(2);
  });

  it("stale revision throws ConcurrentModificationError", async () => {
    const repository = new InMemoryCategories();
    const category = Category.create({ name: "Alimentos" });
    await repository.save(category);
    const useCase = new UpdateCategoryUseCase(repository);
    await expect(
      useCase.execute({ categoryId: category.id, name: "Outro", reason: "Correcao", expectedRevision: 99 }),
    ).rejects.toThrow(ConcurrentModificationError);
  });

  it("existing name throws CategoryNameAlreadyExistsError", async () => {
    const repository = new InMemoryCategories();
    const first = Category.create({ name: "Alimentos" });
    const second = Category.create({ name: "Higiene" });
    await repository.save(first);
    await repository.save(second);
    const useCase = new UpdateCategoryUseCase(repository);
    await expect(
      useCase.execute({ categoryId: second.id, name: "Alimentos", reason: "Correcao", expectedRevision: 1 }),
    ).rejects.toThrow(CategoryNameAlreadyExistsError);
  });
});
