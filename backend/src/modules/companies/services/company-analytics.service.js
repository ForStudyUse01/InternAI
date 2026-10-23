const Internship = require("../../../models/Internship");
const Application = require("../../../models/Application");
const { APPLICATION_STATUS } = require("../../../constants/enums");
const {
  internshipScopeFilter,
  applicationScopeFilter,
  isHrScopedUser,
  canViewGlobalAnalytics,
  canViewSalaryAnalytics,
  canViewRecruiterAnalytics,
  buildListMeta
} = require("../../../services/company-access.service");

function buildRecruiterPerformance(applications) {
  const recruiterMap = new Map();

  applications.forEach((application) => {
    const recruiterId = String(application.assignedRecruiter || "unassigned");
    if (!recruiterMap.has(recruiterId)) {
      recruiterMap.set(recruiterId, {
        handled: 0,
        shortlisted: 0,
        hired: 0,
        interviews: 0,
        updatedAt: []
      });
    }
    const item = recruiterMap.get(recruiterId);
    item.handled += 1;
    if (application.status === APPLICATION_STATUS.SHORTLISTED) item.shortlisted += 1;
    if ([APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(application.status)) {
      item.hired += 1;
    }
    if (
      [
        APPLICATION_STATUS.INTERVIEW_SCHEDULED,
        APPLICATION_STATUS.TECHNICAL_ROUND,
        APPLICATION_STATUS.HR_ROUND
      ].includes(application.status)
    ) {
      item.interviews += 1;
    }
    if (application.updatedAt) item.updatedAt.push(new Date(application.updatedAt).getTime());
  });

  return Array.from(recruiterMap.entries()).map(([recruiterId, value]) => ({
    recruiterId,
    candidatesHandled: value.handled,
    shortlistedCandidates: value.shortlisted,
    hiredCandidates: value.hired,
    conversionRate: value.handled ? Number(((value.hired / value.handled) * 100).toFixed(2)) : 0,
    interviewSuccessRate: value.interviews
      ? Number(((value.hired / value.interviews) * 100).toFixed(2))
      : 0,
    recruiterResponseTimeHours:
      value.updatedAt.length > 1
        ? Number(
            (
              (Math.max(...value.updatedAt) - Math.min(...value.updatedAt)) /
              value.updatedAt.length /
              (1000 * 60 * 60)
            ).toFixed(2)
          )
        : 0
  }));
}

function buildSalaryAnalytics(internships) {
  const stipendValues = internships
    .map((internship) => Number(String(internship.stipend || "").replace(/[^\d.]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
  const totalSalaryExpenditure = stipendValues.reduce((acc, value) => acc + value, 0);
  const averagePackage = stipendValues.length
    ? Number((totalSalaryExpenditure / stipendValues.length).toFixed(2))
    : 0;

  return {
    offeredSalaryPerCandidate: stipendValues,
    stipendAnalytics: stipendValues,
    averagePackage,
    totalSalaryExpenditure
  };
}

function buildHiringAnalytics(internships, applications) {
  const totalHires = applications.filter((application) =>
    [APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(application.status)
  ).length;

  const departmentWiseHiring = internships.reduce((acc, internship) => {
    const department = internship.department || "General";
    if (!acc[department]) acc[department] = 0;
    acc[department] += applications.filter(
      (application) =>
        String(application.internshipId) === String(internship._id) &&
        [APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(application.status)
    ).length;
    return acc;
  }, {});

  return {
    totalHires,
    totalApplications: applications.length,
    departmentWiseHiring,
    internshipPerformance: internships.length
  };
}

function buildHrPipelineSummary(applications, recruiterId) {
  const mine = applications.filter(
    (application) => String(application.assignedRecruiter) === String(recruiterId)
  );
  const byStatus = mine.reduce((acc, application) => {
    acc[application.status] = (acc[application.status] || 0) + 1;
    return acc;
  }, {});

  return {
    assignedCandidates: mine.length,
    pipelineByStatus: byStatus,
    shortlisted: mine.filter((a) => a.status === APPLICATION_STATUS.SHORTLISTED).length,
    interviews: mine.filter((a) =>
      [
        APPLICATION_STATUS.INTERVIEW_SCHEDULED,
        APPLICATION_STATUS.TECHNICAL_ROUND,
        APPLICATION_STATUS.HR_ROUND
      ].includes(a.status)
    ).length,
    hired: mine.filter((a) =>
      [APPLICATION_STATUS.SELECTED, APPLICATION_STATUS.OFFERED].includes(a.status)
    ).length
  };
}

async function buildCompanyAnalytics(companyId, user) {
  const internshipFilter = internshipScopeFilter(companyId, user);
  const appFilter = applicationScopeFilter(companyId, user);

  const [internships, applications] = await Promise.all([
    Internship.find(internshipFilter).select("_id stipend department assignedRecruiter role").lean(),
    Application.find(appFilter)
      .select("status assignedRecruiter createdAt updatedAt relevanceScore internshipId")
      .lean()
  ]);

  const meta = buildListMeta(user);
  const analytics = { meta };

  if (isHrScopedUser(user)) {
    analytics.personalPipeline = buildHrPipelineSummary(applications, user._id);
    if (canViewRecruiterAnalytics(user)) {
      analytics.recruiterPerformance = buildRecruiterPerformance(applications).filter(
        (row) => row.recruiterId === String(user._id)
      );
    }
    return { analytics };
  }

  if (canViewRecruiterAnalytics(user)) {
    analytics.recruiterPerformance = buildRecruiterPerformance(applications);
  }

  if (canViewGlobalAnalytics(user)) {
    analytics.hiringAnalytics = buildHiringAnalytics(internships, applications);
  }

  if (canViewSalaryAnalytics(user)) {
    analytics.salaryAnalytics = buildSalaryAnalytics(internships);
  }

  return { analytics };
}

module.exports = { buildCompanyAnalytics, buildRecruiterPerformance };
