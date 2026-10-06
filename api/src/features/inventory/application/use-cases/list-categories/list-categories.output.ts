export interface CategoryListItem {
  categoryId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  revision: number;
}

export interface ListCategoriesOutput {
  categories: CategoryListItem[];
}
