const {
  normalizeSkillValue,
  normalizeSkillList,
  toDisplaySkill,
  toDisplaySkillList,
  textMentionsSkill
} = require("../../src/shared/utils/skill-normalizer");

describe("normalizeSkillValue", () => {
  test("lowercases and trims", () => {
    expect(normalizeSkillValue("  JavaScript  ")).toBe("javascript");
  });

  test("resolves known aliases", () => {
    expect(normalizeSkillValue("JS")).toBe("javascript");
    expect(normalizeSkillValue("node.js")).toBe("nodejs");
    expect(normalizeSkillValue("Node")).toBe("nodejs");
    expect(normalizeSkillValue("React.js")).toBe("react");
  });

  test("returns empty string for non-string/number input", () => {
    expect(normalizeSkillValue(null)).toBe("");
    expect(normalizeSkillValue(undefined)).toBe("");
    expect(normalizeSkillValue({})).toBe("");
    expect(normalizeSkillValue([])).toBe("");
  });

  test("passes through unknown skills unchanged (normalized casing)", () => {
    expect(normalizeSkillValue("Blender")).toBe("blender");
  });

  test("accepts numeric input", () => {
    expect(normalizeSkillValue(123)).toBe("123");
  });
});

describe("normalizeSkillList", () => {
  test("dedupes aliases into a single canonical entry", () => {
    const result = normalizeSkillList(["JavaScript", "js", "JS "]);
    expect(result).toEqual(["javascript"]);
  });

  test("splits combined entries on separators", () => {
    const result = normalizeSkillList(["React, Node.js and MongoDB"]);
    expect(result).toEqual(expect.arrayContaining(["react", "nodejs", "mongodb"]));
    expect(result).toHaveLength(3);
  });

  test("returns empty array for non-array input", () => {
    expect(normalizeSkillList(null)).toEqual([]);
    expect(normalizeSkillList("javascript")).toEqual([]);
    expect(normalizeSkillList(undefined)).toEqual([]);
  });

  test("ignores non-string/number entries within the array", () => {
    expect(normalizeSkillList(["React", null, {}, undefined, "Vue"])).toEqual(
      expect.arrayContaining(["react", "vuejs"])
    );
  });

  test("handles empty array", () => {
    expect(normalizeSkillList([])).toEqual([]);
  });
});

describe("toDisplaySkill / toDisplaySkillList", () => {
  test("uses curated display map when available", () => {
    expect(toDisplaySkill("javascript")).toBe("JavaScript");
    expect(toDisplaySkill("js")).toBe("JavaScript");
  });

  test("title-cases unknown skills as fallback", () => {
    expect(toDisplaySkill("machine vision")).toBe("Machine Vision");
  });

  test("empty input yields empty string", () => {
    expect(toDisplaySkill("")).toBe("");
  });

  test("toDisplaySkillList maps and dedupes a list", () => {
    expect(toDisplaySkillList(["js", "JavaScript"])).toEqual(["JavaScript"]);
  });
});

describe("textMentionsSkill", () => {
  test("matches canonical skill mentioned in free text", () => {
    expect(textMentionsSkill("Experienced with Node.js and Express", "nodejs")).toBe(true);
  });

  test("matches alias surface forms with punctuation variants", () => {
    expect(textMentionsSkill("Built REST APIs using nodejs", "nodejs")).toBe(true);
    expect(textMentionsSkill("node based backend", "nodejs")).toBe(true);
  });

  test("does not match unrelated text", () => {
    expect(textMentionsSkill("Experienced with Python and Django", "nodejs")).toBe(false);
  });

  test("does not false-positive on substrings without word boundaries", () => {
    expect(textMentionsSkill("nodejsx is not a real thing", "nodejs")).toBe(false);
  });

  test("returns false for empty text or empty skill", () => {
    expect(textMentionsSkill("", "nodejs")).toBe(false);
    expect(textMentionsSkill("some text", "")).toBe(false);
    expect(textMentionsSkill(null, "nodejs")).toBe(false);
  });
});
