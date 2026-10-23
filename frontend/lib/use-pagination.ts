import { useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize]
  );

  return { page, setPage, totalPages, safePage, pageItems };
}
