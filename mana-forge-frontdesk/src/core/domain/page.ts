export interface PageRequest { page: number; size: number }
export interface PageResult<T> extends PageRequest { items: T[]; total: number }

export function pageOf<T>(items: T[], { page, size }: PageRequest): PageResult<T> {
  return { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length };
}
