import { UnavailableResumeParser } from "./parsers/unavailable-resume.parser";
import type { ResumeParser } from "./resume-parser.interface";

class ResumeParserFactory {
  private readonly fallbackParser: ResumeParser;

  constructor() {
    this.fallbackParser = new UnavailableResumeParser();
  }

  getParser(): ResumeParser {
    return this.fallbackParser;
  }
}

export const resumeParserFactory = new ResumeParserFactory();
