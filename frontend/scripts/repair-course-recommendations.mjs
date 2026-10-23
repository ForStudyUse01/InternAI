/**
 * Rebuilds courseRecommendations.json — allowed providers only, verified external URLs.
 * Run: node scripts/repair-course-recommendations.mjs
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "../lib/data/courseRecommendations.json");

const ALLOWED_PROVIDERS = new Set([
  "Coursera",
  "NPTEL",
  "Kaggle Learn",
  "freeCodeCamp",
  "Microsoft Learn",
  "Google Learn",
  "DeepLearning.AI",
  "MIT OpenCourseWare",
  "Harvard Online Learning",
  "Cisco Skills For All"
]);

function desc(title, provider, skillHint = "") {
  const topic = skillHint ? `${skillHint} — ` : "";
  return `${topic}Free ${provider} course: ${title}. Learn through hands-on lessons and structured modules.`;
}

/** @type {Array<{title:string,provider:string,level:string,duration:string,free:boolean,url:string,description:string,skills?:string[]}>} */
const VERIFIED_POOL = [
  { title: "Python", provider: "Kaggle Learn", level: "Beginner", duration: "4 hours", free: true, url: "https://www.kaggle.com/learn/python", description: desc("Python fundamentals", "Kaggle Learn", "Python"), skills: ["Python"] },
  { title: "Intro to SQL", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-sql", description: desc("SQL queries and databases", "Kaggle Learn", "SQL"), skills: ["SQL"] },
  { title: "Intro to Machine Learning", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-machine-learning", description: desc("ML basics with scikit-learn", "Kaggle Learn", "Machine Learning"), skills: ["Machine Learning"] },
  { title: "Pandas", provider: "Kaggle Learn", level: "Beginner", duration: "4 hours", free: true, url: "https://www.kaggle.com/learn/pandas", description: desc("Data manipulation with Pandas", "Kaggle Learn", "Data Science"), skills: ["Data Science", "Python"] },
  { title: "Data Visualization", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/data-visualization", description: desc("Charts and visual analytics", "Kaggle Learn", "Data Analytics"), skills: ["Data Analytics", "Power BI", "Tableau"] },
  { title: "Data Cleaning", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/data-cleaning", description: desc("Prepare messy datasets", "Kaggle Learn", "Data Science"), skills: ["Excel", "Data Science"] },
  { title: "Intermediate Machine Learning", provider: "Kaggle Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://www.kaggle.com/learn/intermediate-machine-learning", description: desc("Advanced ML techniques", "Kaggle Learn", "Machine Learning"), skills: ["Machine Learning"] },
  { title: "Intro to Deep Learning", provider: "Kaggle Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-deep-learning", description: desc("Neural networks fundamentals", "Kaggle Learn", "Deep Learning"), skills: ["Deep Learning"] },
  { title: "Feature Engineering", provider: "Kaggle Learn", level: "Intermediate", duration: "5 hours", free: true, url: "https://www.kaggle.com/learn/feature-engineering", description: desc("Build better ML features", "Kaggle Learn", "Machine Learning"), skills: ["NLP", "Machine Learning"] },
  { title: "Scientific Computing with Python", provider: "freeCodeCamp", level: "Beginner", duration: "57 hours", free: true, url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/", description: desc("Python programming certification", "freeCodeCamp", "Python"), skills: ["Python"] },
  { title: "JavaScript Algorithms and Data Structures", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/", description: desc("JS, DSA, and certification prep", "freeCodeCamp", "JavaScript"), skills: ["JavaScript", "Data Structures", "Algorithms"] },
  { title: "Relational Database", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/relational-database/", description: desc("SQL, Bash, and Git for data", "freeCodeCamp", "SQL"), skills: ["SQL", "MySQL", "PostgreSQL", "DBMS"] },
  { title: "Back End Development and APIs", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/", description: desc("Node.js, Express, and REST APIs", "freeCodeCamp", "Node.js"), skills: ["Node.js", "Express.js", "REST APIs", "Authentication", "MongoDB"] },
  { title: "Machine Learning with Python", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/machine-learning-with-python/", description: desc("TensorFlow and ML workflows", "freeCodeCamp", "Machine Learning"), skills: ["Machine Learning", "NLP"] },
  { title: "Data Analysis with Python", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/data-analysis-with-python/", description: desc("NumPy, Pandas, and visualization", "freeCodeCamp", "Data Analytics"), skills: ["Data Analytics", "Data Science", "Tableau"] },
  { title: "Responsive Web Design", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/", description: desc("HTML, CSS, and responsive layouts", "freeCodeCamp", "HTML"), skills: ["HTML", "CSS", "UI Development", "UI/UX Design", "Figma"] },
  { title: "Front End Development Libraries", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/front-end-development-libraries/", description: desc("React, Redux, and UI libraries", "freeCodeCamp", "React"), skills: ["React", "TypeScript", "Tailwind CSS", "Next.js"] },
  { title: "Programming in Python", provider: "NPTEL", level: "Beginner", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc19_cs55/preview", description: desc("Python programming foundations", "NPTEL", "Python"), skills: ["Python"] },
  { title: "Database Management System", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc26_cs39/preview", description: desc("DBMS theory and SQL practice", "NPTEL", "DBMS"), skills: ["DBMS", "SQL", "MySQL"] },
  { title: "Fundamentals of Database Systems", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses-archive.nptel.ac.in/noc17_cs33/course", description: desc("Relational database design", "NPTEL", "DBMS"), skills: ["DBMS", "PostgreSQL"] },
  { title: "Python for Data Science", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc24_cs78/preview", description: desc("Python with DSA for analytics", "NPTEL", "Data Science"), skills: ["Data Science", "Data Structures"] },
  { title: "Python Data Science", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc26_cs80/preview", description: desc("Applied Python data workflows", "NPTEL", "Data Science"), skills: ["Data Science"] },
  { title: "Introduction to Machine Learning", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs85/preview", description: desc("Supervised and unsupervised ML", "NPTEL", "Machine Learning"), skills: ["Machine Learning", "Artificial Intelligence"] },
  { title: "Machine Learning", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc24_cs60/preview", description: desc("ML methods and model building", "NPTEL", "Machine Learning"), skills: ["Machine Learning"] },
  { title: "Modern Application Development", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc20_cs52/preview", description: desc("Full-stack web application dev", "NPTEL", "React"), skills: ["React", "UI Development", "JavaScript", "HTML"] },
  { title: "Java Programming", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs87/preview", description: desc("Core Java and OOP", "NPTEL", "Java"), skills: ["Java", "OOP"] },
  { title: "Design and Analysis of Algorithms", provider: "NPTEL", level: "Advanced", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs102/preview", description: desc("Algorithm design techniques", "NPTEL", "Algorithms"), skills: ["Algorithms", "C++"] },
  { title: "Object Oriented Programming", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs101/preview", description: desc("OOP principles and patterns", "NPTEL", "OOP"), skills: ["OOP", "Java"] },
  { title: "Operating Systems", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs104/preview", description: desc("OS concepts and processes", "NPTEL", "Operating Systems"), skills: ["Operating Systems"] },
  { title: "Machine Learning Crash Course", provider: "Google Learn", level: "Beginner", duration: "15 hours", free: true, url: "https://developers.google.com/machine-learning/crash-course", description: desc("TensorFlow and ML intuition", "Google Learn", "Machine Learning"), skills: ["Machine Learning", "LLMs", "Generative AI", "Artificial Intelligence"] },
  { title: "Python Class", provider: "Google Learn", level: "Beginner", duration: "2 days", free: true, url: "https://developers.google.com/edu/python", description: desc("Python for beginners", "Google Learn", "Python"), skills: ["Python"] },
  { title: "Learn CSS", provider: "Google Learn", level: "Beginner", duration: "Self-paced", free: true, url: "https://web.dev/learn/css/", description: desc("Modern CSS layouts and styling", "Google Learn", "CSS"), skills: ["CSS", "Tailwind CSS"] },
  { title: "UI Design", provider: "Google Learn", level: "Beginner", duration: "Self-paced", free: true, url: "https://web.dev/learn/design/", description: desc("UI patterns and accessibility", "Google Learn", "UI/UX Design"), skills: ["UI/UX Design", "UI Development", "Figma"] },
  { title: "Grow with Google Certificates", provider: "Google Learn", level: "Beginner", duration: "Self-paced", free: true, url: "https://grow.google/certificates/", description: desc("Career certificate programs", "Google Learn", "Interview Preparation"), skills: ["Interview Preparation", "Communication Skills"] },
  { title: "Machine Learning", provider: "Coursera", level: "Beginner", duration: "11 weeks", free: true, url: "https://www.coursera.org/learn/machine-learning", description: desc("Andrew Ng ML course (audit free)", "Coursera", "Machine Learning"), skills: ["Machine Learning"] },
  { title: "Basic Statistics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/basic-statistics", description: desc("Statistical inference basics", "Coursera", "Statistics"), skills: ["Statistics", "Aptitude"] },
  { title: "Algorithms Part I", provider: "Coursera", level: "Intermediate", duration: "6 weeks", free: true, url: "https://www.coursera.org/learn/algorithms-part1", description: desc("Princeton algorithms course", "Coursera", "Algorithms"), skills: ["Algorithms", "Data Structures", "Interview Preparation", "Aptitude"] },
  { title: "Computer Networking", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/computer-networking", description: desc("Network protocols and architecture", "Coursera", "Computer Networks"), skills: ["Computer Networks", "Networking"] },
  { title: "SQL for Data Science", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/sql-for-data-science", description: desc("SQL for analytics workflows", "Coursera", "SQL"), skills: ["SQL", "PostgreSQL", "Data Analytics"] },
  { title: "React Basics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/react-basics", description: desc("React components and hooks", "Coursera", "React"), skills: ["React"] },
  { title: "Introduction to HTML5", provider: "Coursera", level: "Beginner", duration: "3 weeks", free: true, url: "https://www.coursera.org/learn/html", description: desc("Semantic HTML foundations", "Coursera", "HTML"), skills: ["HTML"] },
  { title: "Generative AI for Everyone", provider: "Coursera", level: "Beginner", duration: "3 weeks", free: true, url: "https://www.coursera.org/learn/generative-ai-for-everyone", description: desc("GenAI concepts for all roles", "Coursera", "Generative AI"), skills: ["Generative AI", "LLMs"] },
  { title: "NLP Classification", provider: "Coursera", level: "Intermediate", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/classification-vector-spaces-in-nlp", description: desc("Text classification and NLP", "Coursera", "NLP"), skills: ["NLP"] },
  { title: "Deep Learning Specialization", provider: "DeepLearning.AI", level: "Advanced", duration: "5 months", free: true, url: "https://www.coursera.org/specializations/deep-learning", description: desc("Neural networks deep dive", "DeepLearning.AI", "Deep Learning"), skills: ["Deep Learning"] },
  { title: "Neural Networks", provider: "DeepLearning.AI", level: "Intermediate", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/neural-networks-deep-learning", description: desc("Foundations of deep learning", "DeepLearning.AI", "Deep Learning"), skills: ["Deep Learning"] },
  { title: "Prompt Engineering", provider: "DeepLearning.AI", level: "Beginner", duration: "1 hour", free: true, url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/", description: desc("LLM prompt engineering", "DeepLearning.AI", "LLMs"), skills: ["LLMs"] },
  { title: "Azure Fundamentals", provider: "Microsoft Learn", level: "Beginner", duration: "8 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/", description: desc("Azure cloud foundations", "Microsoft Learn", "Azure"), skills: ["Azure", "Cloud Computing"] },
  { title: "Cloud Principles", provider: "Microsoft Learn", level: "Beginner", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/principles-cloud-computing/", description: desc("Cloud computing fundamentals", "Microsoft Learn", "Cloud Computing"), skills: ["Cloud Computing", "AWS"] },
  { title: "Power BI Path", provider: "Microsoft Learn", level: "Beginner", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/get-started-power-bi/", description: desc("Power BI dashboards and reports", "Microsoft Learn", "Power BI"), skills: ["Power BI"] },
  { title: "Containers Intro", provider: "Microsoft Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/intro-to-containers/", description: desc("Container basics for DevOps", "Microsoft Learn", "Docker"), skills: ["Docker", "CI/CD"] },
  { title: "Kubernetes Intro", provider: "Microsoft Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/intro-to-kubernetes/", description: desc("Kubernetes orchestration intro", "Microsoft Learn", "Kubernetes"), skills: ["Kubernetes"] },
  { title: "GitHub Intro", provider: "Microsoft Learn", level: "Beginner", duration: "1 hour", free: true, url: "https://learn.microsoft.com/en-us/training/modules/introduction-to-github/", description: desc("GitHub collaboration basics", "Microsoft Learn", "GitHub"), skills: ["GitHub", "Git"] },
  { title: "Networking Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "70 hours", free: true, url: "https://skillsforall.com/course/networking-essentials", description: desc("Networking fundamentals", "Cisco Skills For All", "Networking"), skills: ["Networking", "Computer Networks", "Ethical Hacking"] },
  { title: "Cybersecurity Intro", provider: "Cisco Skills For All", level: "Beginner", duration: "15 hours", free: true, url: "https://skillsforall.com/course/introduction-to-cybersecurity", description: desc("Cybersecurity foundations", "Cisco Skills For All", "Cybersecurity"), skills: ["Cybersecurity", "Authentication", "Ethical Hacking"] },
  { title: "Ethical Hacker", provider: "Cisco Skills For All", level: "Intermediate", duration: "30 hours", free: true, url: "https://skillsforall.com/course/ethical-hacker", description: desc("Ethical hacking fundamentals", "Cisco Skills For All", "Ethical Hacking"), skills: ["Ethical Hacking"] },
  { title: "Git Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "8 hours", free: true, url: "https://skillsforall.com/course/git-essentials", description: desc("Version control with Git", "Cisco Skills For All", "Git"), skills: ["Git", "CI/CD"] },
  { title: "JavaScript Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "70 hours", free: true, url: "https://skillsforall.com/course/javascript-essentials-1", description: desc("JavaScript programming basics", "Cisco Skills For All", "JavaScript"), skills: ["JavaScript", "TypeScript"] },
  { title: "GCP Fundamentals", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/gcp-fundamentals", description: desc("Google Cloud Platform intro", "Coursera", "GCP"), skills: ["GCP"] },
  { title: "Cloud Computing Basics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/cloud-computing-basics", description: desc("Cloud service models", "Coursera", "Cloud Computing"), skills: ["Cloud Computing", "AWS"] },
  { title: "Google Data Analytics", provider: "Coursera", level: "Beginner", duration: "6 months", free: true, url: "https://www.coursera.org/professional-certificates/google-data-analytics", description: desc("Data analytics certificate path", "Coursera", "Data Analytics"), skills: ["Data Analytics", "Excel"] },
  { title: "CS50", provider: "Harvard Online Learning", level: "Beginner", duration: "13 weeks", free: true, url: "https://pll.harvard.edu/course/cs50-introduction-computer-science", description: desc("Harvard intro to computer science", "Harvard Online Learning", "C"), skills: ["C", "C++", "Aptitude", "OOP"] },
  { title: "Public Speaking", provider: "Harvard Online Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://pll.harvard.edu/course/public-speaking", description: desc("Communication and presentation", "Harvard Online Learning", "Communication Skills"), skills: ["Communication Skills"] },
  { title: "MIT OS Engineering", provider: "MIT OpenCourseWare", level: "Advanced", duration: "14 weeks", free: true, url: "https://ocw.mit.edu/courses/6-828-operating-system-engineering-fall-2012/", description: desc("MIT operating systems course", "MIT OpenCourseWare", "Operating Systems"), skills: ["Operating Systems", "Networking"] },
  { title: "Communication Skills", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/communication-skills", description: desc("Workplace communication", "Coursera", "Communication Skills"), skills: ["Communication Skills"] },
  { title: "Interview Preparation", provider: "Coursera", level: "Beginner", duration: "3 weeks", free: true, url: "https://www.coursera.org/learn/interview-preparation", description: desc("Job interview strategies", "Coursera", "Interview Preparation"), skills: ["Interview Preparation"] },
  { title: "Linear Algebra for ML", provider: "Coursera", level: "Intermediate", duration: "8 weeks", free: true, url: "https://www.coursera.org/learn/linear-algebra-machine-learning", description: desc("Math for machine learning", "Coursera", "Aptitude"), skills: ["Aptitude", "Statistics"] },
  { title: "UI/UX Design", provider: "Coursera", level: "Beginner", duration: "6 months", free: true, url: "https://www.coursera.org/specializations/ui-ux-design", description: desc("UI/UX design specialization", "Coursera", "UI/UX Design"), skills: ["UI/UX Design", "Figma"] },
  { title: "Excel Specialization", provider: "Coursera", level: "Beginner", duration: "6 weeks", free: true, url: "https://www.coursera.org/specializations/excel", description: desc("Excel for business analytics", "Coursera", "Excel"), skills: ["Excel"] },
  { title: "Version Control with Git", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/version-control-with-git", description: desc("Git workflows and branching", "Coursera", "Git"), skills: ["Git"] },
  { title: "Cybersecurity Fundamentals", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/introduction-cybersecurity-cyber-attacks", description: desc("Cyber attacks and defense", "Coursera", "Cybersecurity"), skills: ["Cybersecurity"] },
  { title: "NoSQL Databases", provider: "Coursera", level: "Intermediate", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/nosql-databases", description: desc("MongoDB and NoSQL patterns", "Coursera", "MongoDB"), skills: ["MongoDB"] },
  { title: "Data Science Math", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/datasciencemathskills", description: desc("Math skills for data science", "Coursera", "Statistics"), skills: ["Statistics", "Data Science"] },
  { title: "Wharton Communication", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/wharton-communication-skills", description: desc("Business communication skills", "Coursera", "Communication Skills"), skills: ["Communication Skills"] }
];

const SKILL_PICKS = {
  Python: ["Python", "Scientific Computing with Python", "Programming in Python", "Python Class", "Python for Data Science"],
  Java: ["Java Programming", "Object Oriented Programming", "CS50", "Back End Development and APIs", "Algorithms Part I"],
  C: ["CS50", "Programming in Python", "Scientific Computing with Python", "Algorithms Part I", "MIT OS Engineering"],
  "C++": ["Design and Analysis of Algorithms", "CS50", "Java Programming", "Algorithms Part I", "Machine Learning with Python"],
  JavaScript: ["JavaScript Essentials", "JavaScript Algorithms and Data Structures", "Modern Application Development", "React Basics", "Front End Development Libraries"],
  TypeScript: ["JavaScript Essentials", "Front End Development Libraries", "React Basics", "Modern Application Development", "JavaScript Algorithms and Data Structures"],
  HTML: ["Introduction to HTML5", "Responsive Web Design", "Modern Application Development", "React Basics", "UI Design"],
  CSS: ["Learn CSS", "Responsive Web Design", "UI Design", "Front End Development Libraries", "React Basics"],
  React: ["React Basics", "Front End Development Libraries", "Modern Application Development", "Responsive Web Design", "UI/UX Design"],
  "Next.js": ["Front End Development Libraries", "React Basics", "Modern Application Development", "Back End Development and APIs", "JavaScript Essentials"],
  "Tailwind CSS": ["Learn CSS", "Responsive Web Design", "Front End Development Libraries", "UI Design", "React Basics"],
  "UI Development": ["UI Design", "Responsive Web Design", "UI/UX Design", "Modern Application Development", "React Basics"],
  "Node.js": ["Back End Development and APIs", "JavaScript Essentials", "JavaScript Algorithms and Data Structures", "NoSQL Databases", "Cloud Principles"],
  "Express.js": ["Back End Development and APIs", "JavaScript Essentials", "NoSQL Databases", "Cybersecurity Intro", "Cloud Principles"],
  "REST APIs": ["Back End Development and APIs", "JavaScript Essentials", "NoSQL Databases", "Cybersecurity Intro", "Cloud Principles"],
  Authentication: ["Cybersecurity Intro", "Back End Development and APIs", "Cybersecurity Fundamentals", "Ethical Hacker", "Cloud Principles"],
  SQL: ["Intro to SQL", "Relational Database", "Database Management System", "SQL for Data Science", "Fundamentals of Database Systems"],
  MySQL: ["Relational Database", "Database Management System", "Intro to SQL", "Fundamentals of Database Systems", "SQL for Data Science"],
  PostgreSQL: ["Relational Database", "Intro to SQL", "Database Management System", "SQL for Data Science", "Fundamentals of Database Systems"],
  MongoDB: ["NoSQL Databases", "Back End Development and APIs", "Relational Database", "Database Management System", "Intro to SQL"],
  "Data Structures": ["Python for Data Science", "JavaScript Algorithms and Data Structures", "Design and Analysis of Algorithms", "Algorithms Part I", "Programming in Python"],
  Algorithms: ["Algorithms Part I", "Design and Analysis of Algorithms", "JavaScript Algorithms and Data Structures", "Intro to Machine Learning", "Python for Data Science"],
  OOP: ["Object Oriented Programming", "Java Programming", "CS50", "Python", "Scientific Computing with Python"],
  "Operating Systems": ["Operating Systems", "MIT OS Engineering", "Computer Networking", "CS50", "Networking Essentials"],
  DBMS: ["Database Management System", "Fundamentals of Database Systems", "Relational Database", "Intro to SQL", "SQL for Data Science"],
  "Computer Networks": ["Computer Networking", "Networking Essentials", "Operating Systems", "Cybersecurity Intro", "MIT OS Engineering"],
  "Artificial Intelligence": ["Machine Learning Crash Course", "Introduction to Machine Learning", "Machine Learning", "Generative AI for Everyone", "Intermediate Machine Learning"],
  "Machine Learning": ["Intro to Machine Learning", "Machine Learning with Python", "Machine Learning Crash Course", "Machine Learning", "Introduction to Machine Learning"],
  "Deep Learning": ["Intro to Deep Learning", "Deep Learning Specialization", "Neural Networks", "Intermediate Machine Learning", "Machine Learning"],
  NLP: ["NLP Classification", "Machine Learning with Python", "Intro to Machine Learning", "Feature Engineering", "Intermediate Machine Learning"],
  LLMs: ["Prompt Engineering", "Generative AI for Everyone", "Machine Learning Crash Course", "Intro to Deep Learning", "Deep Learning Specialization"],
  "Generative AI": ["Generative AI for Everyone", "Prompt Engineering", "Machine Learning Crash Course", "Intro to Deep Learning", "Deep Learning Specialization"],
  "Data Science": ["Pandas", "Data Analysis with Python", "Python Data Science", "Google Data Analytics", "Data Science Math"],
  Statistics: ["Basic Statistics", "Data Science Math", "Pandas", "Intro to Machine Learning", "Linear Algebra for ML"],
  "Power BI": ["Power BI Path", "Data Visualization", "Google Data Analytics", "Pandas", "Excel Specialization"],
  Tableau: ["Data Visualization", "Data Analysis with Python", "Google Data Analytics", "Pandas", "Power BI Path"],
  Excel: ["Excel Specialization", "Pandas", "Data Cleaning", "Google Data Analytics", "Data Analysis with Python"],
  "Data Analytics": ["Data Analysis with Python", "Google Data Analytics", "Pandas", "Intro to SQL", "Python Data Science"],
  AWS: ["Cloud Computing Basics", "Cloud Principles", "Azure Fundamentals", "GCP Fundamentals", "Cybersecurity Intro"],
  Azure: ["Azure Fundamentals", "Cloud Principles", "Cloud Computing Basics", "GCP Fundamentals", "Containers Intro"],
  GCP: ["GCP Fundamentals", "Cloud Computing Basics", "Cloud Principles", "Azure Fundamentals", "Grow with Google Certificates"],
  "Cloud Computing": ["Cloud Computing Basics", "Cloud Principles", "Azure Fundamentals", "GCP Fundamentals", "Containers Intro"],
  Git: ["Git Essentials", "Version Control with Git", "GitHub Intro", "Relational Database", "Back End Development and APIs"],
  GitHub: ["GitHub Intro", "Git Essentials", "Version Control with Git", "Back End Development and APIs", "CI/CD via Containers Intro"],
  Docker: ["Containers Intro", "Back End Development and APIs", "Kubernetes Intro", "Cloud Principles", "Cybersecurity Intro"],
  Kubernetes: ["Kubernetes Intro", "Containers Intro", "Cloud Principles", "Azure Fundamentals", "Back End Development and APIs"],
  "CI/CD": ["GitHub Intro", "Git Essentials", "Containers Intro", "Kubernetes Intro", "Back End Development and APIs"],
  Cybersecurity: ["Cybersecurity Intro", "Cybersecurity Fundamentals", "Ethical Hacker", "Networking Essentials", "Authentication"],
  Networking: ["Networking Essentials", "Computer Networking", "Operating Systems", "Cybersecurity Intro", "MIT OS Engineering"],
  "Ethical Hacking": ["Ethical Hacker", "Cybersecurity Intro", "Cybersecurity Fundamentals", "Networking Essentials", "Authentication"],
  "UI/UX Design": ["UI/UX Design", "UI Design", "Responsive Web Design", "Modern Application Development", "React Basics"],
  Figma: ["UI/UX Design", "UI Design", "Responsive Web Design", "React Basics", "Front End Development Libraries"],
  "Communication Skills": ["Communication Skills", "Public Speaking", "Interview Preparation", "Wharton Communication", "Grow with Google Certificates"],
  Aptitude: ["Linear Algebra for ML", "Basic Statistics", "Algorithms Part I", "Data Science Math", "CS50"],
  "Interview Preparation": ["Interview Preparation", "Algorithms Part I", "Communication Skills", "JavaScript Algorithms and Data Structures", "Grow with Google Certificates"]
};

const poolByTitle = new Map(VERIFIED_POOL.map((c) => [c.title, c]));
poolByTitle.set("CI/CD via Containers Intro", poolByTitle.get("Containers Intro"));

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; InternAI-CourseValidator/1.0)" }
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

async function buildCatalog() {
  const catalog = {};
  const usedGlobal = new Set();

  for (const [skill, picks] of Object.entries(SKILL_PICKS)) {
    const courses = [];
    const usedLocal = new Set();

    for (const pick of picks) {
      const course = poolByTitle.get(pick);
      if (!course || !ALLOWED_PROVIDERS.has(course.provider)) continue;
      if (usedLocal.has(course.url) || usedGlobal.has(course.url)) continue;
      const ok = await checkUrl(course.url);
      if (!ok) {
        console.warn(`Skip broken: [${skill}] ${course.url}`);
        continue;
      }
      const { skills: _s, ...entry } = course;
      courses.push({ ...entry, description: course.description || desc(course.title, course.provider, skill) });
      usedLocal.add(course.url);
      usedGlobal.add(course.url);
      if (courses.length >= 5) break;
    }

    if (courses.length < 3) {
      for (const fallback of VERIFIED_POOL) {
        if (courses.length >= 5) break;
        if (!ALLOWED_PROVIDERS.has(fallback.provider)) continue;
        if (usedLocal.has(fallback.url) || usedGlobal.has(fallback.url)) continue;
        const ok = await checkUrl(fallback.url);
        if (!ok) continue;
        const { skills: _s, ...entry } = fallback;
        courses.push({ ...entry, description: fallback.description || desc(fallback.title, fallback.provider, skill) });
        usedLocal.add(fallback.url);
        usedGlobal.add(fallback.url);
      }
    }

    catalog[skill] = courses.slice(0, 5);
  }

  return catalog;
}

const catalog = await buildCatalog();
writeFileSync(jsonPath, JSON.stringify(catalog, null, 2), "utf8");
const total = Object.values(catalog).reduce((n, arr) => n + arr.length, 0);
console.log(`Repaired ${Object.keys(catalog).length} skills, ${total} verified courses`);
