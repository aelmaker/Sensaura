export interface PaginationQuery {
  limit?: string;
  offset?: string;
}

export function parsePagination(query: PaginationQuery): { limit: number; offset: number } {
  const rawLimit = Number(query.limit ?? 20);
  const rawOffset = Number(query.offset ?? 0);

  return {
    limit: Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 20,
    offset: Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0,
  };
}
