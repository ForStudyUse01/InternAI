const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

function normalizeExtractedText(text = "") {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line))
    .join("\n")
    .trim();
}

async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    // Keep per-page boundaries to reduce line shuffle side-effects.
    const pageText = (result.pages || [])
      .map((page) => String(page?.text || "").trim())
      .filter(Boolean)
      .join("\n\n");

    const normalized = normalizeExtractedText(pageText || result.text || "");

    if (process.env.RESUME_PARSER_DEBUG === "true") {
      // eslint-disable-next-line no-console
      console.log("[resume-parser] raw-pdf-preview", JSON.stringify(normalized.split("\n").slice(0, 80)));
    }

    return normalized;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocxText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return normalizeExtractedText(result?.value || "");
}

async function parseResumeFile(file) {
  if (!file?.path) return "";
  if (!fs.existsSync(file.path)) return "";

  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = String(file.mimetype || "").toLowerCase();

  if (mime === "text/plain" || ext === ".txt") {
    try {
      return normalizeExtractedText(fs.readFileSync(file.path, "utf8"));
    } catch {
      return "";
    }
  }

  if (mime === "application/pdf" || ext === ".pdf") {
    try {
      return await extractPdfText(file.path);
    } catch {
      return "";
    }
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === ".docx"
  ) {
    try {
      return await extractDocxText(file.path);
    } catch {
      return "";
    }
  }

  return "";
}

module.exports = { parseResumeFile, normalizeExtractedText };
