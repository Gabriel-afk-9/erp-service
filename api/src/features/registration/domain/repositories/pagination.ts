export interface Pagination {
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function normalizePagination(page: number | undefined, pageSize: number | undefined): Pagination {
  const safePage = page !== undefined && Number.isInteger(page) && page >= 1 ? page : 1;
  const safeSize =
    pageSize !== undefined && Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100 ? pageSize : 20;
  return { page: safePage, pageSize: safeSize };
}
