import { describe, test, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/lib/use-pagination";

describe("usePagination", () => {
  test("returns all items on a single page when items fit within pageSize", () => {
    const { result } = renderHook(() => usePagination([1, 2, 3], 10));
    expect(result.current.pageItems).toEqual([1, 2, 3]);
    expect(result.current.totalPages).toBe(1);
  });

  test("slices items into pages of the given size", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pageItems).toEqual(items.slice(0, 10));
  });

  test("advancing the page returns the next slice", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => result.current.setPage(1));
    expect(result.current.pageItems).toEqual(items.slice(10, 20));
  });

  test("clamps to the last valid page when the current page is out of range", () => {
    const items = Array.from({ length: 5 }, (_, i) => i);
    const { result, rerender } = renderHook(({ items, pageSize }) => usePagination(items, pageSize), {
      initialProps: { items: Array.from({ length: 25 }, (_, i) => i), pageSize: 10 }
    });

    act(() => result.current.setPage(2));
    expect(result.current.safePage).toBe(2);

    rerender({ items, pageSize: 10 });
    expect(result.current.totalPages).toBe(1);
    expect(result.current.safePage).toBe(0);
    expect(result.current.pageItems).toEqual(items);
  });

  test("empty items array yields one empty page, not zero pages", () => {
    const { result } = renderHook(() => usePagination([], 10));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageItems).toEqual([]);
  });
});
