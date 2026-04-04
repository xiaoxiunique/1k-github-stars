const FORCE_INCLUDE = new Set([
  "microsoft/PowerToys",
  "FortAwesome/Font-Awesome",
  "openai/codex",
  "anthropics/claude-code",
]);

const STRONG_NAME_KEYWORDS = [
  "awesome",
  "roadmap",
  "guide",
  "tutorial",
  "interview",
  "handbook",
  "primer",
  "cookbook",
  "course",
  "best-practice",
  "bestpractices",
  "project-based-learning",
  "app-ideas",
  "howtocook",
  "days-of",
  "guidelines",
  "challenge",
  "challenges",
  "examples",
];

const STRONG_DESCRIPTION_KEYWORDS = [
  "curated list",
  "awesome list",
  "interactive roadmap",
  "study plan",
  "interview preparation",
  "interview questions",
  "step-by-step guide",
  "style guide",
  "programming challenge",
  "coding challenge",
  "type challenges",
  "examples and tutorials",
  "tutorial and examples",
  "examples for",
  "implementations/tutorials",
  "full text",
  "learn how to",
  "prep for",
  "resources",
  "guides",
  "tutorial",
  "roadmap",
];

const WEAK_DESCRIPTION_KEYWORDS = [
  "collection of",
  "a collection of",
  "a list of",
  "examples and guides",
  "manuals",
  "cheatsheets",
  "examples",
  "samples",
  "templates",
];

function scoreKeywordMatches(text: string, keywords: string[], weight: number) {
  return keywords.reduce(
    (score, keyword) => score + (text.includes(keyword) ? weight : 0),
    0
  );
}

export function shouldExcludeRepo(
  fullName: string,
  description: string,
  langName: string
) {
  if (FORCE_INCLUDE.has(fullName)) {
    return false;
  }

  const haystackName = fullName.replace(/[._]/g, "-").toLowerCase();
  const haystackDescription = (description ?? "").toLowerCase();

  if (STRONG_NAME_KEYWORDS.some((keyword) => haystackName.includes(keyword))) {
    return true;
  }

  let score = 0;
  score += scoreKeywordMatches(haystackDescription, STRONG_DESCRIPTION_KEYWORDS, 2);
  score += scoreKeywordMatches(haystackDescription, WEAK_DESCRIPTION_KEYWORDS, 1);

  if (
    (langName === "Markdown" ||
      langName === "MDX" ||
      langName === "Other" ||
      langName === "Jupyter Notebook") &&
    score >= 2
  ) {
    score += 1;
  }

  return score >= 3;
}
