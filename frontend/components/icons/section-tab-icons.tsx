import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  Briefcase,
  FolderKanban,
  GraduationCap,
  Link2,
  Palette,
  Sparkles,
  Target,
  User,
  Wrench
} from "lucide-react";

export const PROFILE_TAB_ICONS: Record<string, LucideIcon> = {
  overview: User,
  skills: Wrench,
  education: GraduationCap,
  projects: FolderKanban,
  achievements: Award,
  learning: BookOpen,
  theme: Palette
};

export const RESUME_TAB_ICONS: Record<string, LucideIcon> = {
  skills: Wrench,
  projects: FolderKanban,
  education: GraduationCap,
  certifications: Award,
  achievements: Target
};

export const PROFILE_FIELD_ICONS: Record<string, LucideIcon> = {
  social: Link2,
  summary: Sparkles
};

export const EDIT_TAB_ICONS: Record<string, LucideIcon> = {
  personal: User,
  education: GraduationCap,
  learning: BookOpen,
  skills: Wrench
};
