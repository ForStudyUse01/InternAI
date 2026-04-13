export interface ParsedResumeData {
  summary?: string;
  skills: string[];
  projects: string[];
  contact?: string;
  location?: string;
}

export interface ResumeParserResult {
  status: "parsed" | "failed";
  data: ParsedResumeData;
}

export interface ResumeParser {
  parse(filePath: string, mimeType: string): Promise<ResumeParserResult>;
}
