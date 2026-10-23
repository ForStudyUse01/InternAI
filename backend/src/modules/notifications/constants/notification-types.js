const NOTIFICATION_TYPES = Object.freeze({
  APPLICATION_SUBMITTED: "application_submitted",
  APPLICATION_RECEIVED: "application_received",
  APPLICATION_STATUS_CHANGED: "application_status_changed",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEW_REMINDER: "interview_reminder",
  INTERVIEW_RESCHEDULED: "interview_rescheduled",
  INTERVIEW_CANCELLED: "interview_cancelled",
  INTERVIEW_COMPLETED: "interview_completed",
  INTERVIEW_NO_SHOW: "interview_no_show",
  CANDIDATE_JOINED_INTERVIEW: "candidate_joined_interview",
  INTERVIEWER_JOINED_INTERVIEW: "interviewer_joined_interview",
  RESCHEDULE_REQUESTED: "interview_reschedule_requested",
  FEEDBACK_ADDED: "feedback_added",
  PROFILE_REMINDER: "profile_reminder",
  OTP: "otp",
  CHAT_MESSAGE: "chat_message"
});

module.exports = { NOTIFICATION_TYPES };
