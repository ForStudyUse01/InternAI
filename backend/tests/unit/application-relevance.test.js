const { computeApplicationRelevance } = require("../../src/modules/applications/services/application-relevance.service");

describe("computeApplicationRelevance", () => {
  test("full skill match against internship requirements scores 100", () => {
    const profile = { skills: ["React", "Node.js", "MongoDB"] };
    const internship = { skillsRequired: ["react", "nodejs", "mongodb"] };
    const result = computeApplicationRelevance(profile, internship);
    expect(result.relevanceScore).toBe(100);
    expect(result.missingRequiredSkills).toEqual([]);
  });

  test("partial skill match scores below 100 and lists missing skills", () => {
    const profile = { skills: ["React"] };
    const internship = { skillsRequired: ["react", "python", "docker"] };
    const result = computeApplicationRelevance(profile, internship);
    expect(result.relevanceScore).toBeLessThan(100);
    expect(result.missingRequiredSkills).toEqual(expect.arrayContaining(["Python", "Docker"]));
  });

  test("no matching skills at all scores 0", () => {
    const profile = { skills: ["Photoshop"] };
    const internship = { skillsRequired: ["react", "nodejs"] };
    const result = computeApplicationRelevance(profile, internship);
    expect(result.relevanceScore).toBe(0);
  });

  test("internship with no required skills scores 100 (vacuous match)", () => {
    const profile = { skills: ["React"] };
    const internship = {};
    const result = computeApplicationRelevance(profile, internship);
    expect(result.relevanceScore).toBe(100);
  });

  test("pulls intern skills from parsed resume skills when profile.skills is empty", () => {
    const profile = { skills: [], resume: { parsed: { skills: ["React", "Node.js"] } } };
    const internship = { skillsRequired: ["react", "nodejs"] };
    const result = computeApplicationRelevance(profile, internship);
    expect(result.relevanceScore).toBe(100);
  });

  test("handles completely empty profile and internship without throwing", () => {
    expect(() => computeApplicationRelevance({}, {})).not.toThrow();
    const result = computeApplicationRelevance({}, {});
    expect(result.relevanceScore).toBe(100);
  });

  test("preferred skills influence score as a 20% weighted component", () => {
    const profile = { skills: ["React", "Docker"] };
    const internship = { skillsRequired: ["react"], prioritySkills: ["docker", "kubernetes"] };
    const result = computeApplicationRelevance(profile, internship);
    expect(result.preferredSkillMatchPercent).toBe(50);
    expect(result.relevanceScore).toBe(Math.round(100 * 0.8 + 50 * 0.2));
  });
});
