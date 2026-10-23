import { apiRequest } from "@/lib/api-client";
import type { CalendarDayEntry } from "@/lib/calendar-stickers";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheStore = new Map<string, { ts: number; data: CalendarDayEntry[] }>();
const inflightRequests = new Map<string, Promise<CalendarDayEntry[]>>();

function cacheKey(from: string, to: string) {
  return `calendar:entries:${from}:${to}`;
}

function readCache(key: string): CalendarDayEntry[] | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
}

function writeCache(key: string, data: CalendarDayEntry[]) {
  cacheStore.set(key, { ts: Date.now(), data });
}

function invalidateCalendarCache() {
  for (const key of cacheStore.keys()) {
    if (key.startsWith("calendar:entries:")) cacheStore.delete(key);
  }
}

export async function fetchCalendarEntries(from: string, to: string, force = false): Promise<CalendarDayEntry[]> {
  const key = cacheKey(from, to);
  if (!force) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  const pending = inflightRequests.get(key);
  if (pending && !force) return pending;

  const promise = apiRequest<{ entries: CalendarDayEntry[] }>(
    `/api/calendar/entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
    .then((response) => {
      const entries = response.entries || [];
      writeCache(key, entries);
      return entries;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
}

export async function createCalendarSticker(dateKey: string, emoji: string) {
  const response = await apiRequest<{ entry: CalendarDayEntry }>("/api/calendar/entries", {
    method: "POST",
    body: JSON.stringify({ dateKey, entryType: "sticker", emoji })
  });
  invalidateCalendarCache();
  return response.entry;
}

export async function createCalendarNote(dateKey: string, content: string) {
  const response = await apiRequest<{ entry: CalendarDayEntry }>("/api/calendar/entries", {
    method: "POST",
    body: JSON.stringify({ dateKey, entryType: "note", content })
  });
  invalidateCalendarCache();
  return response.entry;
}

export async function updateCalendarSticker(entryId: string, emoji: string) {
  const response = await apiRequest<{ entry: CalendarDayEntry }>(`/api/calendar/entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify({ emoji })
  });
  invalidateCalendarCache();
  return response.entry;
}

export async function updateCalendarNote(entryId: string, content: string) {
  const response = await apiRequest<{ entry: CalendarDayEntry }>(`/api/calendar/entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify({ content })
  });
  invalidateCalendarCache();
  return response.entry;
}

export async function deleteCalendarEntry(entryId: string) {
  await apiRequest<{ message: string }>(`/api/calendar/entries/${entryId}`, { method: "DELETE" });
  invalidateCalendarCache();
}

export function groupCalendarEntriesByDate(entries: CalendarDayEntry[]) {
  const map = new Map<string, CalendarDayEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.dateKey) || [];
    list.push(entry);
    map.set(entry.dateKey, list);
  }
  return map;
}

export function monthGridDateRange(cursor: Date, gridDays = 42) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + gridDays - 1);
  const toKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  return { from: toKey(start), to: toKey(end) };
}

export function weekDateRange(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const toKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  return { from: toKey(weekStart), to: toKey(end) };
}
