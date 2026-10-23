import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  Calendar,
  ClipboardList,
  FileText,
  HelpCircle,
  IdCard,
  LayoutGrid,
  LineChart,
  Lightbulb,
  MessageSquare,
  Rocket,
  Search,
  Sparkles,
  UserPen
} from "lucide-react";
import { FEATURE_FLAGS } from "@/constants/featureFlags";

export type InternSidebarItemConfig = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  navVariant?: "muted";
};

export type InternSidebarSectionConfig = {
  title: string;
  items: InternSidebarItemConfig[];
  collapsible?: boolean;
};

const BASE_SECTIONS: InternSidebarSectionConfig[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard Overview", href: "/dashboard/intern", icon: LayoutGrid },
      { label: "Placement Hub", href: "/dashboard/intern/placement-hub", icon: Rocket }
    ]
  },
  {
    title: "My Profile",
    collapsible: true,
    items: [
      { label: "Profile", href: "/dashboard/intern/profile", icon: IdCard },
      { label: "Edit Profile", href: "/dashboard/intern/profile/edit", icon: UserPen, navVariant: "muted" },
      { label: "Resume", href: "/dashboard/intern/resume", icon: FileText },
      { label: "Resume Score", href: "/dashboard/intern/resume/score", icon: Sparkles, navVariant: "muted" },
      ...(FEATURE_FLAGS.ENABLE_3D_PORTFOLIO
        ? [{ label: "3D Portfolio", href: "/dashboard/intern/portfolio", icon: Sparkles }]
        : []),
      { label: "Skill Gap Analysis", href: "/dashboard/intern/skill-gap", icon: BarChart3 }
    ]
  },
  {
    title: "Internships",
    items: [
      { label: "Recommended Internships", href: "/dashboard/intern/internships/recommended", icon: Sparkles },
      { label: "Search Internships", href: "/dashboard/intern/internships/search", icon: Search },
      { label: "Saved Internships", href: "/dashboard/intern/internships/saved", icon: Bookmark },
      { label: "My Applications", href: "/dashboard/intern/applications", icon: ClipboardList },
      { label: "Scheduled Interviews", href: "/dashboard/intern/interviews", icon: Calendar },
      { label: "Analytics Center", href: "/dashboard/intern/track-progress", icon: LineChart }
    ]
  },
  {
    title: "My Calendar",
    items: [{ label: "Personal Calendar", href: "/dashboard/intern/calendar", icon: Calendar }]
  },
  {
    title: "Learning",
    items: [
      { label: "Courses", href: "/dashboard/intern/learning/courses", icon: BookOpen },
      { label: "Certifications", href: "/dashboard/intern/learning/certifications", icon: Sparkles },
      { label: "Mock Aptitude Test", href: "/dashboard/intern/learning/mock-aptitude", icon: ClipboardList },
      { label: "Mock Technical Test", href: "/dashboard/intern/learning/mock-technical", icon: ClipboardList },
      { label: "Mock Interview", href: "/dashboard/intern/learning/mock-interview", icon: MessageSquare }
    ]
  },
  {
    title: "Feedback & Support",
    items: [
      { label: "Notifications", href: "/dashboard/intern/notifications", icon: Bell },
      ...(FEATURE_FLAGS.ENABLE_CHAT
        ? [{ label: "Messages", href: "/dashboard/intern/chat", icon: MessageSquare }]
        : []),
      { label: "HR Feedback", href: "/dashboard/intern/feedback/hr", icon: MessageSquare },
      { label: "Suggestions", href: "/dashboard/intern/feedback/suggestions", icon: Lightbulb },
      { label: "Help / Support", href: "/dashboard/intern/support", icon: HelpCircle }
    ]
  }
];

export function getInternSidebarSections(chatUnread = 0): InternSidebarSectionConfig[] {
  if (!FEATURE_FLAGS.ENABLE_CHAT || chatUnread <= 0) return BASE_SECTIONS;

  return BASE_SECTIONS.map((section) => {
    if (section.title !== "Feedback & Support") return section;
    return {
      ...section,
      items: section.items.map((item) =>
        item.href === "/dashboard/intern/chat" ? { ...item, badge: chatUnread > 9 ? 9 : chatUnread } : item
      )
    };
  });
}

export function isInternSidebarItemActive(pathname: string, href: string) {
  if (href === "/dashboard/intern") return pathname === "/dashboard/intern";
  return pathname === href || pathname.startsWith(`${href}/`);
}
