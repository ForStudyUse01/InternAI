const USER_ROLES = {
  INTERN: "intern",
  COMPANY: "company",
  ADMIN: "admin"
};

const COMPANY_ACCOUNT_TYPES = {
  OWNER: "owner",
  HR: "hr",
  CEO: "ceo"
};

const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",
  VERIFICATION_ADMIN: "verification_admin",
  MODERATION_ADMIN: "moderation_admin",
  SUPPORT_ADMIN: "support_admin"
};

const COMPANY_VERIFICATION_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
  SUSPENDED: "suspended"
};

const APPLICATION_STATUS = {
  APPLIED: "applied",
  REVIEWED: "reviewed",
  SHORTLISTED: "shortlisted",
  UNDER_REVIEW: "under_review",
  SCREENING: "screening",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEW_COMPLETED: "interview_completed",
  INTERVIEW: "interview",
  TECHNICAL_ROUND: "technical_round",
  HR_ROUND: "hr_round",
  ON_HOLD: "on_hold",
  SELECTED: "selected",
  OFFERED: "offered",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn"
};

const REPORTED_COMPANY_STATUS = {
  OPEN: "open",
  IN_REVIEW: "in_review",
  ESCALATED: "escalated",
  RESOLVED: "resolved",
  DISMISSED: "dismissed"
};

module.exports = {
  USER_ROLES,
  COMPANY_ACCOUNT_TYPES,
  ADMIN_ROLES,
  COMPANY_VERIFICATION_STATUS,
  APPLICATION_STATUS,
  REPORTED_COMPANY_STATUS
};
