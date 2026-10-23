import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CalendarX2,
  ClipboardList,
  FileText,
  Flag,
  MessageSquare,
  MessagesSquare,
  Search,
  ScrollText,
  Users
} from "lucide-react";

export const EMPTY_STATE_ICONS: Record<string, LucideIcon> = {
  applications: ClipboardList,
  interviews: Calendar,
  calendarEvents: CalendarX2,
  savedInternships: Briefcase,
  notifications: Bell,
  companyNotifications: Bell,
  applicants: Building2,
  candidates: Users,
  reports: Flag,
  analytics: BarChart3,
  users: Users,
  internships: Briefcase,
  companies: Building2,
  activity: Activity,
  chat: MessageSquare,
  conversations: MessagesSquare,
  feedback: ScrollText,
  resume: FileText,
  search: Search
};
