const asyncHandler = require("../../../shared/utils/asyncHandler");
const AppError = require("../../../shared/utils/AppError");
const { sendSuccess, sendPaginated } = require("../../../shared/utils/api-response");
const portfolioService = require("../../../services/portfolio.service");
const { PORTFOLIO_THEMES } = require("../../../constants/portfolio-themes");
const { isEnabled } = require("../../../shared/config/feature-flags");

function assertPortfolioEnabled() {
  if (!isEnabled("ENABLE_3D_PORTFOLIO")) {
    throw new AppError("3D Portfolio feature is disabled", 503);
  }
}

exports.getMyPortfolio = asyncHandler(async (req, res) => {
  assertPortfolioEnabled();
  const portfolio = await portfolioService.getPortfolioForUser(req.user._id);
  return sendSuccess(res, { data: { portfolio } });
});

exports.generateMyPortfolio = asyncHandler(async (req, res) => {
  assertPortfolioEnabled();
  const theme = String(req.body?.theme || "").trim();
  const useAi = req.body?.useAi !== false;
  const portfolioDoc = await portfolioService.generatePortfolio(req.user._id, {
    theme: theme || undefined,
    useAi
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Portfolio generated",
    data: { portfolio: portfolioService.toPortfolioPayload(portfolioDoc) }
  });
});

exports.updateMyPortfolioSettings = asyncHandler(async (req, res) => {
  assertPortfolioEnabled();
  const portfolio = await portfolioService.updatePortfolioSettings(req.user._id, {
    theme: req.body?.theme,
    status: req.body?.status,
    autoSync: req.body?.autoSync
  });
  return sendSuccess(res, { message: "Portfolio updated", data: { portfolio } });
});

exports.getPublicPortfolio = asyncHandler(async (req, res) => {
  const portfolio = await portfolioService.getPublicPortfolio(req.params.slug);
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
  return sendSuccess(res, { data: { portfolio } });
});

exports.listPortfoliosAdmin = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 50);
  const status = String(req.query.status || "").trim();
  const result = await portfolioService.listPortfoliosAdmin({ page, limit, status });
  return sendPaginated(res, {
    items: result.portfolios,
    itemsKey: "portfolios",
    page: result.page,
    limit: result.limit,
    total: result.total
  });
});

exports.moderatePortfolioAdmin = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || "").trim();
  if (status && !["draft", "published", "disabled"].includes(status)) {
    throw new AppError("Invalid status", 400);
  }
  const portfolio = await portfolioService.moderatePortfolio(req.user._id, req.params.portfolioId, {
    status: status || undefined,
    note: req.body?.note
  });
  return sendSuccess(res, { message: "Portfolio moderated", data: { portfolio } });
});

exports.getPortfolioThemes = asyncHandler(async (_req, res) => {
  assertPortfolioEnabled();
  return sendSuccess(res, { data: { themes: PORTFOLIO_THEMES } });
});

exports.getInternPortfolioSummary = asyncHandler(async (req, res) => {
  const InternPortfolio = require("../../../models/InternPortfolio");
  const portfolio = await InternPortfolio.findOne({
    internProfile: req.params.internProfileId,
    status: "published"
  })
    .select("slug theme lastGeneratedAt metadata status")
    .lean();

  if (!portfolio) {
    return sendSuccess(res, { data: { portfolio: null } });
  }

  return sendSuccess(res, {
    data: {
      portfolio: {
        slug: portfolio.slug,
        theme: portfolio.theme,
        status: portfolio.status,
        lastGeneratedAt: portfolio.lastGeneratedAt,
        viewCount: portfolio.metadata?.viewCount || 0,
        portfolioUrl: `/portfolio/${portfolio.slug}`
      }
    }
  });
});
