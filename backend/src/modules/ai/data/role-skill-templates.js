const ROLE_SKILL_TEMPLATES = Object.freeze({
  full_stack_developer: {
    role: "Full Stack Developer",
    requiredSkills: ["javascript", "typescript", "react", "node.js", "express", "mongodb", "sql", "docker", "authentication", "deployment", "system design"]
  },
  frontend_developer: {
    role: "Frontend Developer",
    requiredSkills: ["javascript", "typescript", "react", "next.js", "css", "state management", "testing", "accessibility"]
  },
  backend_developer: {
    role: "Backend Developer",
    requiredSkills: ["node.js", "express", "mongodb", "sql", "api design", "authentication", "docker", "deployment", "system design"]
  },
  data_scientist: {
    role: "Data Scientist",
    requiredSkills: ["python", "pandas", "numpy", "scikit-learn", "sql", "data analysis", "statistics", "machine learning"]
  },
  ai_ml_engineer: {
    role: "AI / ML Engineer",
    requiredSkills: ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "numpy", "pandas", "natural language processing"]
  }
});

module.exports = { ROLE_SKILL_TEMPLATES };
