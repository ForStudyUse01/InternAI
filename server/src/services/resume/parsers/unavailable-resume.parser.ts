import type { ResumeParser } from "../resume-parser.interface";

export class UnavailableResumeParser implements ResumeParser {
  async parse(_filePath: string, _mimeType: string) {
    return {
      status: "failed" as const,
      data: {
        skills: [],
        projects: [],
      },
    };
  }
}
