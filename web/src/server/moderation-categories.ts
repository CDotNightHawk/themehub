// Client-safe constants for the report dialog. No DB / server-only imports
// allowed in this file.

export type ReportCategory =
  | "spam"
  | "malware"
  | "copyright"
  | "harassment"
  | "nsfw"
  | "broken"
  | "other";

export const REPORT_CATEGORIES: ReadonlyArray<{
  value: ReportCategory;
  label: string;
}> = [
  { value: "spam", label: "Spam / advertising" },
  { value: "malware", label: "Malware or exploit" },
  { value: "copyright", label: "Copyright / plagiarism" },
  { value: "harassment", label: "Harassment / abuse" },
  { value: "nsfw", label: "Unmarked NSFW" },
  { value: "broken", label: "Broken / doesn't work" },
  { value: "other", label: "Something else" },
];

export function isReportCategory(s: unknown): s is ReportCategory {
  return (
    typeof s === "string" && REPORT_CATEGORIES.some((c) => c.value === s)
  );
}
