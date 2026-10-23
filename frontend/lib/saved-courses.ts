"use client";

import type { CourseRecommendation } from "@/lib/skill-course-recommendations";

export type SavedCourse = CourseRecommendation & { skill: string; savedAt: string };

const STORAGE_KEY = "internai_saved_courses";

function readStorage(): SavedCourse[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeStorage(courses: SavedCourse[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  } catch {
    // ignore quota errors
  }
}

export function getSavedCourses(): SavedCourse[] {
  return readStorage();
}

export function isCourseSaved(url: string): boolean {
  return readStorage().some((c) => c.url === url);
}

export function saveCourse(course: CourseRecommendation & { skill: string }): void {
  const existing = readStorage();
  if (existing.some((c) => c.url === course.url)) return;
  writeStorage([{ ...course, savedAt: new Date().toISOString() }, ...existing]);
}

export function unsaveCourse(url: string): void {
  writeStorage(readStorage().filter((c) => c.url !== url));
}

export function toggleSavedCourse(
  course: CourseRecommendation & { skill: string }
): boolean {
  if (isCourseSaved(course.url)) {
    unsaveCourse(course.url);
    return false;
  }
  saveCourse(course);
  return true;
}
