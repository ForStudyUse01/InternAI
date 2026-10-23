const { computeSkillMatch } = require("../../src/shared/utils/compute-skill-match");

describe("computeSkillMatch", () => {
  test("100% required match when intern has every required skill", () => {
    const result = computeSkillMatch(["React", "Node.js"], ["react", "nodejs"], []);
    expect(result.requiredMatchPercent).toBe(100);
    expect(result.missingRequiredCanonical).toEqual([]);
    expect(result.overallScore).toBe(100);
  });

  test("partial required match computes rounded percent", () => {
    const result = computeSkillMatch(["React"], ["react", "nodejs", "mongodb", "python"], []);
    expect(result.requiredMatchPercent).toBe(25);
    expect(result.missingRequiredCanonical).toEqual(
      expect.arrayContaining(["nodejs", "mongodb", "python"])
    );
  });

  test("zero required skills is scored as vacuous 100%, not 0%", () => {
    const result = computeSkillMatch(["React"], [], []);
    expect(result.requiredMatchPercent).toBe(100);
    expect(result.overallScore).toBe(100);
  });

  test("blends required (80%) and preferred (20%) when preferred skills exist", () => {
    // required: 1/1 matched = 100; preferred: 1/2 matched = 50
    const result = computeSkillMatch(["React", "Docker"], ["react"], ["docker", "kubernetes"]);
    expect(result.requiredMatchPercent).toBe(100);
    expect(result.preferredMatchPercent).toBe(50);
    expect(result.overallScore).toBe(Math.round(100 * 0.8 + 50 * 0.2));
  });

  test("no intern skills at all yields 0% required match when skills are required", () => {
    const result = computeSkillMatch([], ["react", "nodejs"], []);
    expect(result.requiredMatchPercent).toBe(0);
    expect(result.overallScore).toBe(0);
  });

  test("preferredMatchPercent is null (not 0) when no preferred skills listed", () => {
    const result = computeSkillMatch(["React"], ["react"], []);
    expect(result.preferredMatchPercent).toBeNull();
    expect(result.overallScore).toBe(result.requiredMatchPercent);
  });

  test("dedupes and normalizes aliases across both intern and internship skill lists", () => {
    const result = computeSkillMatch(["JS", "js", "JavaScript"], ["javascript"], []);
    expect(result.normalizedInternSkills).toEqual(["javascript"]);
    expect(result.requiredMatchPercent).toBe(100);
  });

  test("handles missing/undefined arguments gracefully via defaults", () => {
    const result = computeSkillMatch();
    expect(result.requiredMatchPercent).toBe(100);
    expect(result.overallScore).toBe(100);
  });
});
