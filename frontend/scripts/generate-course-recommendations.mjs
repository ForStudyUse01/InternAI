/**
 * Generates lib/data/courseRecommendations.json from curated verified catalog.
 * Run: node scripts/generate-course-recommendations.mjs
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../lib/data/courseRecommendations.json");

/** @type {Record<string, Array<{title:string,provider:string,level:string,duration:string,free:boolean,url:string}>>} */
const catalog = {
  Python: [
    { title: "Python", provider: "Kaggle Learn", level: "Beginner", duration: "4 hours", free: true, url: "https://www.kaggle.com/learn/python" },
    { title: "Scientific Computing with Python", provider: "freeCodeCamp", level: "Beginner", duration: "57 hours", free: true, url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/" },
    { title: "Programming in Python", provider: "NPTEL", level: "Beginner", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc19_cs55/preview" },
    { title: "Python Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://docs.python.org/3/tutorial/" },
    { title: "Python Class", provider: "Google Learning", level: "Beginner", duration: "2 days", free: true, url: "https://developers.google.com/edu/python" }
  ],
  Java: [
    { title: "Java Programming", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs87/preview" },
    { title: "Java Programming for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "8 hours", free: true, url: "https://www.freecodecamp.org/news/java-programming-for-beginners/" },
    { title: "Java Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://docs.oracle.com/javase/tutorial/" },
    { title: "Java for Beginners", provider: "Microsoft Learn", level: "Beginner", duration: "6 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/java-first-steps/" }
  ],
  C: [
    { title: "C Programming", provider: "NPTEL", level: "Beginner", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc20_cs50/preview" },
    { title: "C Programming Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://en.cppreference.com/w/c/language" },
    { title: "Intro to C", provider: "Harvard Open Learning", level: "Beginner", duration: "13 weeks", free: true, url: "https://pll.harvard.edu/course/cs50-introduction-computer-science" },
    { title: "C Programming for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "4 hours", free: true, url: "https://www.freecodecamp.org/news/c-programming-for-beginners/" }
  ],
  "C++": [
    { title: "C++ Programming", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc20_cs49/preview" },
    { title: "C++ Reference", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://en.cppreference.com/w/" },
    { title: "C++ for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "6 hours", free: true, url: "https://www.freecodecamp.org/news/c-plus-plus-for-beginners/" },
    { title: "Introduction to C++", provider: "Microsoft Learn", level: "Beginner", duration: "8 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/c-plus-plus/" }
  ],
  JavaScript: [
    { title: "Intro to JavaScript", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-programming" },
    { title: "JavaScript Algorithms and Data Structures", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/" },
    { title: "JavaScript Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
    { title: "JavaScript Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "70 hours", free: true, url: "https://skillsforall.com/course/javascript-essentials-1" }
  ],
  TypeScript: [
    { title: "TypeScript Handbook", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
    { title: "TypeScript for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/learn-typescript-beginners-guide/" },
    { title: "TypeScript Fundamentals", provider: "Microsoft Learn", level: "Beginner", duration: "4 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/typescript/" },
    { title: "Modern TypeScript", provider: "Google Learning", level: "Intermediate", duration: "Self-paced", free: true, url: "https://web.dev/learn/typescript/" }
  ],
  HTML: [
    { title: "Responsive Web Design", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/" },
    { title: "HTML Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
    { title: "HTML Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "30 hours", free: true, url: "https://skillsforall.com/course/html-essentials" },
    { title: "Introduction to HTML5", provider: "Coursera", level: "Beginner", duration: "3 weeks", free: true, url: "https://www.coursera.org/learn/html" }
  ],
  CSS: [
    { title: "CSS Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
    { title: "Learn CSS", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://web.dev/learn/css/" },
    { title: "CSS for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "5 hours", free: true, url: "https://www.freecodecamp.org/news/css-for-beginners/" },
    { title: "Tailwind CSS from Scratch", provider: "freeCodeCamp", level: "Intermediate", duration: "3 hours", free: true, url: "https://www.freecodecamp.org/news/tailwind-css-tutorial/" }
  ],
  React: [
    { title: "React Quick Start", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://react.dev/learn" },
    { title: "Front End Development Libraries", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/front-end-development-libraries/" },
    { title: "Modern Application Development", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc20_cs52/preview" },
    { title: "React Basics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/react-basics" }
  ],
  "Next.js": [
    { title: "Next.js Documentation", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://nextjs.org/docs" },
    { title: "Learn Next.js", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://nextjs.org/learn" },
    { title: "Next.js for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "4 hours", free: true, url: "https://www.freecodecamp.org/news/nextjs-tutorial/" },
    { title: "Full Stack Open", provider: "University of Helsinki", level: "Intermediate", duration: "14 weeks", free: true, url: "https://fullstackopen.com/en/" }
  ],
  "Tailwind CSS": [
    { title: "Tailwind CSS Documentation", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://tailwindcss.com/docs" },
    { title: "Tailwind CSS Tutorial", provider: "freeCodeCamp", level: "Beginner", duration: "3 hours", free: true, url: "https://www.freecodecamp.org/news/tailwind-css-tutorial/" },
    { title: "Utility-First CSS", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://web.dev/learn/css" },
    { title: "Responsive Web Design", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/" }
  ],
  "UI Development": [
    { title: "UI Design Principles", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://web.dev/learn/design/" },
    { title: "Responsive Web Design", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/" },
    { title: "Human-Computer Interaction", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs100/preview" },
    { title: "UI/UX Design", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/specializations/ui-ux-design" }
  ],
  "Node.js": [
    { title: "Node.js Learn", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://nodejs.org/en/learn" },
    { title: "Back End Development and APIs", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" },
    { title: "Node.js Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://nodejs.dev/en/learn" },
    { title: "Node.js Essentials", provider: "Microsoft Learn", level: "Beginner", duration: "6 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/build-node-js-apps/" }
  ],
  "Express.js": [
    { title: "Express.js Guide", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://expressjs.com/en/starter/installing.html" },
    { title: "Back End Development and APIs", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" },
    { title: "REST API Design", provider: "Microsoft Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/design-a-rest-api/" },
    { title: "API Development", provider: "Google Learning", level: "Intermediate", duration: "Self-paced", free: true, url: "https://developers.google.com/tech-writing" }
  ],
  "REST APIs": [
    { title: "REST API Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://restfulapi.net/" },
    { title: "Back End Development and APIs", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" },
    { title: "Design a REST API", provider: "Microsoft Learn", level: "Intermediate", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/design-a-rest-api/" },
    { title: "APIs for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/apis-for-beginners/" }
  ],
  Authentication: [
    { title: "Authentication and Authorization", provider: "Microsoft Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/authentication-authorization/" },
    { title: "OAuth 2.0 Guide", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://oauth.net/2/" },
    { title: "Back End Development and APIs", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" },
    { title: "Web Security Basics", provider: "Google Learning", level: "Intermediate", duration: "Self-paced", free: true, url: "https://web.dev/learn/security/" }
  ],
  SQL: [
    { title: "Intro to SQL", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-sql" },
    { title: "Relational Database", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/relational-database/" },
    { title: "Database Management System", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc26_cs39/preview" },
    { title: "SQL Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.w3schools.com/sql/" },
    { title: "SQL for Data Science", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/sql-for-data-science" }
  ],
  MySQL: [
    { title: "MySQL Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://dev.mysql.com/doc/" },
    { title: "Relational Database", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/relational-database/" },
    { title: "Database Management System", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc26_cs39/preview" },
    { title: "Intro to SQL", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-sql" }
  ],
  PostgreSQL: [
    { title: "PostgreSQL Tutorial", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.postgresql.org/docs/current/tutorial.html" },
    { title: "Relational Database", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/relational-database/" },
    { title: "Intro to SQL", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-sql" },
    { title: "Database Management System", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc26_cs39/preview" }
  ],
  MongoDB: [
    { title: "MongoDB University Free Courses", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://learn.mongodb.com/" },
    { title: "Back End Development and APIs", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/" },
    { title: "MongoDB Basics", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/mongodb-tutorial/" },
    { title: "NoSQL Databases", provider: "Coursera", level: "Intermediate", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/nosql-databases" }
  ],
  "Data Structures": [
    { title: "Data Structures", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs100/preview" },
    { title: "JavaScript Algorithms and Data Structures", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/" },
    { title: "Algorithms, Part I", provider: "Coursera", level: "Intermediate", duration: "6 weeks", free: true, url: "https://www.coursera.org/learn/algorithms-part1" },
    { title: "Data Structures Easy to Advanced", provider: "freeCodeCamp", level: "Intermediate", duration: "8 hours", free: true, url: "https://www.freecodecamp.org/news/data-structures-for-beginners/" }
  ],
  Algorithms: [
    { title: "Intro to Machine Learning", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-machine-learning" },
    { title: "Algorithms, Part I", provider: "Coursera", level: "Intermediate", duration: "6 weeks", free: true, url: "https://www.coursera.org/learn/algorithms-part1" },
    { title: "JavaScript Algorithms and Data Structures", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/" },
    { title: "Design and Analysis of Algorithms", provider: "NPTEL", level: "Advanced", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs102/preview" }
  ],
  OOP: [
    { title: "Object Oriented Programming", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs101/preview" },
    { title: "Java Programming", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs87/preview" },
    { title: "OOP in Python", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://docs.python.org/3/tutorial/classes.html" },
    { title: "Object-Oriented Programming", provider: "Microsoft Learn", level: "Beginner", duration: "4 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/object-oriented-programming/" }
  ],
  "Operating Systems": [
    { title: "Operating Systems", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs104/preview" },
    { title: "Introduction to Operating Systems", provider: "Coursera", level: "Intermediate", duration: "6 weeks", free: true, url: "https://www.coursera.org/learn/os-power" },
    { title: "Operating Systems", provider: "MIT OpenCourseWare", level: "Advanced", duration: "14 weeks", free: true, url: "https://ocw.mit.edu/courses/6-828-operating-system-engineering-fall-2012/" },
    { title: "OS Concepts", provider: "freeCodeCamp", level: "Intermediate", duration: "4 hours", free: true, url: "https://www.freecodecamp.org/news/operating-systems-for-beginners/" }
  ],
  DBMS: [
    { title: "Database Management System", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc26_cs39/preview" },
    { title: "Fundamentals of Database Systems", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses-archive.nptel.ac.in/noc17_cs33/course" },
    { title: "Relational Database", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/relational-database/" },
    { title: "Intro to SQL", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-sql" }
  ],
  "Computer Networks": [
    { title: "Computer Networks", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs105/preview" },
    { title: "Networking Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "70 hours", free: true, url: "https://skillsforall.com/course/networking-essentials" },
    { title: "Computer Networking", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/computer-networking" },
    { title: "Networking Basics", provider: "freeCodeCamp", level: "Beginner", duration: "3 hours", free: true, url: "https://www.freecodecamp.org/news/computer-networking-for-beginners/" }
  ],
  "Artificial Intelligence": [
    { title: "Elements of AI", provider: "University of Helsinki", level: "Beginner", duration: "6 weeks", free: true, url: "https://www.elementsofai.com/" },
    { title: "AI For Everyone", provider: "DeepLearning.AI", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/ai-for-everyone" },
    { title: "Introduction to Artificial Intelligence", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs103/preview" },
    { title: "Machine Learning Crash Course", provider: "Google Learning", level: "Beginner", duration: "15 hours", free: true, url: "https://developers.google.com/machine-learning/crash-course" }
  ],
  "Machine Learning": [
    { title: "Intro to Machine Learning", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-machine-learning" },
    { title: "Machine Learning with Python", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/machine-learning-with-python/" },
    { title: "Machine Learning Crash Course", provider: "Google Learning", level: "Beginner", duration: "15 hours", free: true, url: "https://developers.google.com/machine-learning/crash-course" },
    { title: "Machine Learning", provider: "Coursera", level: "Beginner", duration: "11 weeks", free: true, url: "https://www.coursera.org/learn/machine-learning" },
    { title: "Introduction to Machine Learning", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs106/preview" }
  ],
  "Deep Learning": [
    { title: "Intro to Deep Learning", provider: "Kaggle Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-deep-learning" },
    { title: "Deep Learning Specialization", provider: "DeepLearning.AI", level: "Advanced", duration: "5 months", free: true, url: "https://www.coursera.org/specializations/deep-learning" },
    { title: "Neural Networks and Deep Learning", provider: "DeepLearning.AI", level: "Intermediate", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/neural-networks-deep-learning" },
    { title: "Deep Learning", provider: "NPTEL", level: "Advanced", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs107/preview" }
  ],
  NLP: [
    { title: "Natural Language Processing", provider: "Kaggle Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://www.kaggle.com/learn/natural-language-processing" },
    { title: "NLP with Python", provider: "freeCodeCamp", level: "Intermediate", duration: "4 hours", free: true, url: "https://www.freecodecamp.org/news/nlp-tutorial/" },
    { title: "Natural Language Processing", provider: "Coursera", level: "Intermediate", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/language-processing" },
    { title: "Speech and Language Processing", provider: "Official Documentation", level: "Advanced", duration: "Self-paced", free: true, url: "https://web.stanford.edu/~jurafsky/slp3/" }
  ],
  LLMs: [
    { title: "Generative AI for Beginners", provider: "Microsoft Learn", level: "Beginner", duration: "6 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/generative-ai-for-beginners/" },
    { title: "Large Language Models", provider: "DeepLearning.AI", level: "Intermediate", duration: "3 hours", free: true, url: "https://www.deeplearning.ai/short-courses/large-language-models-introduction/" },
    { title: "ChatGPT Prompt Engineering", provider: "DeepLearning.AI", level: "Beginner", duration: "1 hour", free: true, url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/" },
    { title: "Introduction to LLMs", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://developers.google.com/machine-learning/resources/intro-llms" }
  ],
  "Generative AI": [
    { title: "Generative AI for Beginners", provider: "Microsoft Learn", level: "Beginner", duration: "6 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/generative-ai-for-beginners/" },
    { title: "Generative AI Fundamentals", provider: "DeepLearning.AI", level: "Beginner", duration: "2 hours", free: true, url: "https://www.deeplearning.ai/courses/generative-ai-for-everyone/" },
    { title: "Introduction to Generative AI", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.cloudskillsboost.google/course_templates/536" },
    { title: "Generative AI", provider: "Coursera", level: "Beginner", duration: "3 weeks", free: true, url: "https://www.coursera.org/learn/generative-ai-for-everyone" }
  ],
  "Data Science": [
    { title: "Data Science Micro-Courses", provider: "Kaggle Learn", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.kaggle.com/learn" },
    { title: "Data Analysis with Python", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/data-analysis-with-python/" },
    { title: "Python for Data Science", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc24_cs78/preview" },
    { title: "Data Science Math Skills", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/datasciencemathskills" }
  ],
  Statistics: [
    { title: "Intro to Statistics", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-statistics" },
    { title: "Statistics Fundamentals", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/basic-statistics" },
    { title: "Statistics for Data Science", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs108/preview" },
    { title: "Statistics Essentials", provider: "freeCodeCamp", level: "Beginner", duration: "4 hours", free: true, url: "https://www.freecodecamp.org/news/statistics-for-data-science/" }
  ],
  "Power BI": [
    { title: "Power BI Learning", provider: "Microsoft Learn", level: "Beginner", duration: "Self-paced", free: true, url: "https://learn.microsoft.com/en-us/training/powerplatform/power-bi" },
    { title: "Get Started with Power BI", provider: "Microsoft Learn", level: "Beginner", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/get-started-power-bi/" },
    { title: "Power BI Desktop", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://learn.microsoft.com/en-us/power-bi/fundamentals/desktop-getting-started" },
    { title: "Data Visualization", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/data-visualization" }
  ],
  Tableau: [
    { title: "Tableau Free Training Videos", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.tableau.com/learn/training" },
    { title: "Data Visualization", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/data-visualization" },
    { title: "Data Analysis with Python", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/data-analysis-with-python/" },
    { title: "Business Analytics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/business-analytics" }
  ],
  Excel: [
    { title: "Excel for Beginners", provider: "Microsoft Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/excel-for-beginners/" },
    { title: "Excel Skills for Business", provider: "Coursera", level: "Beginner", duration: "6 weeks", free: true, url: "https://www.coursera.org/specializations/excel" },
    { title: "Spreadsheet Basics", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/excel-for-beginners/" },
    { title: "Data Cleaning", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/data-cleaning" }
  ],
  "Data Analytics": [
    { title: "Data Analysis with Python", provider: "freeCodeCamp", level: "Intermediate", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/data-analysis-with-python/" },
    { title: "Data Analytics", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.coursera.org/professional-certificates/google-data-analytics" },
    { title: "Intro to SQL", provider: "Kaggle Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://www.kaggle.com/learn/intro-to-sql" },
    { title: "Python for Data Science", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc24_cs78/preview" }
  ],
  AWS: [
    { title: "AWS Cloud Practitioner Essentials", provider: "Official Documentation", level: "Beginner", duration: "6 hours", free: true, url: "https://explore.skillbuilder.aws/learn/course/external/view/elearning/16466/cloud-practitioner-essentials" },
    { title: "AWS Training", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://aws.amazon.com/training/digital/" },
    { title: "Cloud Computing Basics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/cloud-computing-basics" },
    { title: "Introduction to Cloud", provider: "Microsoft Learn", level: "Beginner", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/principles-cloud-computing/" }
  ],
  Azure: [
    { title: "Azure Fundamentals", provider: "Microsoft Learn", level: "Beginner", duration: "8 hours", free: true, url: "https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/" },
    { title: "Azure Cloud Concepts", provider: "Microsoft Learn", level: "Beginner", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/fundamentals-cloud-computing/" },
    { title: "Cloud Computing Basics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/cloud-computing-basics" },
    { title: "Introduction to Cloud", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.cloudskillsboost.google/course_templates/536" }
  ],
  GCP: [
    { title: "Google Cloud Skills Boost", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.cloudskillsboost.google/" },
    { title: "Introduction to Google Cloud", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/gcp-fundamentals" },
    { title: "Cloud Computing Basics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/cloud-computing-basics" },
    { title: "Principles of Cloud Computing", provider: "Microsoft Learn", level: "Beginner", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/principles-cloud-computing/" }
  ],
  "Cloud Computing": [
    { title: "Cloud Computing Basics", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/cloud-computing-basics" },
    { title: "Principles of Cloud Computing", provider: "Microsoft Learn", level: "Beginner", duration: "2 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/principles-cloud-computing/" },
    { title: "Introduction to Cloud", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs109/preview" },
    { title: "Cloud Practitioner Essentials", provider: "Official Documentation", level: "Beginner", duration: "6 hours", free: true, url: "https://explore.skillbuilder.aws/learn/course/external/view/elearning/16466/cloud-practitioner-essentials" }
  ],
  Git: [
    { title: "Git Handbook", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://guides.github.com/introduction/git-handbook/" },
    { title: "Git and GitHub", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/git-and-github-for-beginners/" },
    { title: "Version Control with Git", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/version-control-with-git" },
    { title: "Git Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "8 hours", free: true, url: "https://skillsforall.com/course/git-essentials" }
  ],
  GitHub: [
    { title: "GitHub Skills", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://skills.github.com/" },
    { title: "Git and GitHub", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/git-and-github-for-beginners/" },
    { title: "Hello World", provider: "Official Documentation", level: "Beginner", duration: "30 min", free: true, url: "https://docs.github.com/en/get-started/start-your-journey/hello-world" },
    { title: "Version Control with Git", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/version-control-with-git" }
  ],
  Docker: [
    { title: "Docker Getting Started", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://docs.docker.com/get-started/" },
    { title: "Docker for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/docker-for-beginners/" },
    { title: "Container Basics", provider: "Microsoft Learn", level: "Beginner", duration: "3 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/intro-to-containers/" },
    { title: "DevOps with Docker", provider: "University of Helsinki", level: "Intermediate", duration: "4 weeks", free: true, url: "https://devopswithdocker.com/" }
  ],
  Kubernetes: [
    { title: "Kubernetes Basics", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" },
    { title: "Introduction to Kubernetes", provider: "Cisco Skills For All", level: "Intermediate", duration: "14 hours", free: true, url: "https://skillsforall.com/course/introduction-to-kubernetes" },
    { title: "Kubernetes for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "3 hours", free: true, url: "https://www.freecodecamp.org/news/kubernetes-for-beginners/" },
    { title: "Container Orchestration", provider: "Microsoft Learn", level: "Intermediate", duration: "4 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/intro-to-kubernetes/" }
  ],
  "CI/CD": [
    { title: "CI/CD Pipelines", provider: "Microsoft Learn", level: "Intermediate", duration: "3 hours", free: true, url: "https://learn.microsoft.com/en-us/training/modules/create-a-cicd-pipeline/" },
    { title: "GitHub Actions", provider: "Official Documentation", level: "Intermediate", duration: "Self-paced", free: true, url: "https://docs.github.com/en/actions/learn-github-actions" },
    { title: "DevOps Essentials", provider: "freeCodeCamp", level: "Intermediate", duration: "4 hours", free: true, url: "https://www.freecodecamp.org/news/devops-for-beginners/" },
    { title: "DevOps with Docker", provider: "University of Helsinki", level: "Intermediate", duration: "4 weeks", free: true, url: "https://devopswithdocker.com/" }
  ],
  Cybersecurity: [
    { title: "Introduction to Cybersecurity", provider: "Cisco Skills For All", level: "Beginner", duration: "15 hours", free: true, url: "https://skillsforall.com/course/introduction-to-cybersecurity" },
    { title: "Cybersecurity Fundamentals", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/introduction-cybersecurity-cyber-attacks" },
    { title: "Cybersecurity Essentials", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs110/preview" },
    { title: "Web Security", provider: "Google Learning", level: "Intermediate", duration: "Self-paced", free: true, url: "https://web.dev/learn/security/" }
  ],
  Networking: [
    { title: "Networking Essentials", provider: "Cisco Skills For All", level: "Beginner", duration: "70 hours", free: true, url: "https://skillsforall.com/course/networking-essentials" },
    { title: "Computer Networks", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs105/preview" },
    { title: "Computer Networking", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/computer-networking" },
    { title: "Networking Basics", provider: "freeCodeCamp", level: "Beginner", duration: "3 hours", free: true, url: "https://www.freecodecamp.org/news/computer-networking-for-beginners/" }
  ],
  "Ethical Hacking": [
    { title: "Ethical Hacking Essentials", provider: "Cisco Skills For All", level: "Intermediate", duration: "30 hours", free: true, url: "https://skillsforall.com/course/ethical-hacker" },
    { title: "Introduction to Cybersecurity", provider: "Cisco Skills For All", level: "Beginner", duration: "15 hours", free: true, url: "https://skillsforall.com/course/introduction-to-cybersecurity" },
    { title: "Cybersecurity Fundamentals", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/introduction-cybersecurity-cyber-attacks" },
    { title: "Web Security", provider: "Google Learning", level: "Intermediate", duration: "Self-paced", free: true, url: "https://web.dev/learn/security/" }
  ],
  "UI/UX Design": [
    { title: "UI/UX Design Specialization", provider: "Coursera", level: "Beginner", duration: "6 months", free: true, url: "https://www.coursera.org/specializations/ui-ux-design" },
    { title: "UI Design Principles", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://web.dev/learn/design/" },
    { title: "Human-Computer Interaction", provider: "NPTEL", level: "Intermediate", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_cs100/preview" },
    { title: "Responsive Web Design", provider: "freeCodeCamp", level: "Beginner", duration: "300 hours", free: true, url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/" }
  ],
  Figma: [
    { title: "Figma Learn", provider: "Official Documentation", level: "Beginner", duration: "Self-paced", free: true, url: "https://help.figma.com/hc/en-us/categories/360002051616-Figma-Design" },
    { title: "Figma for Beginners", provider: "freeCodeCamp", level: "Beginner", duration: "2 hours", free: true, url: "https://www.freecodecamp.org/news/figma-tutorial/" },
    { title: "UI/UX Design", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/specializations/ui-ux-design" },
    { title: "Design Principles", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://web.dev/learn/design/" }
  ],
  "Communication Skills": [
    { title: "Communication Skills", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/communication-skills" },
    { title: "Improving Communication Skills", provider: "Coursera", level: "Beginner", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/wharton-communication-skills" },
    { title: "Professional Communication", provider: "OpenLearn", level: "Beginner", duration: "8 hours", free: true, url: "https://www.open.edu/openlearn/education-development/communication-skills/content-section-overview" },
    { title: "Public Speaking", provider: "Harvard Open Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://pll.harvard.edu/course/public-speaking" }
  ],
  Aptitude: [
    { title: "Quantitative Aptitude", provider: "NPTEL", level: "Beginner", duration: "12 weeks", free: true, url: "https://onlinecourses.nptel.ac.in/noc21_ma101/preview" },
    { title: "Mathematics for Machine Learning", provider: "Coursera", level: "Intermediate", duration: "8 weeks", free: true, url: "https://www.coursera.org/learn/linear-algebra-machine-learning" },
    { title: "Problem Solving", provider: "Kaggle Learn", level: "Beginner", duration: "Self-paced", free: true, url: "https://www.kaggle.com/learn" },
    { title: "Logical Reasoning", provider: "OpenLearn", level: "Beginner", duration: "6 hours", free: true, url: "https://www.open.edu/openlearn/science-maths-technology/mathematics-statistics/content-section-overview" }
  ],
  "Interview Preparation": [
    { title: "Technical Interview Prep", provider: "freeCodeCamp", level: "Intermediate", duration: "Self-paced", free: true, url: "https://www.freecodecamp.org/news/coding-interview-prep/" },
    { title: "Interview Preparation", provider: "Coursera", level: "Beginner", duration: "3 weeks", free: true, url: "https://www.coursera.org/learn/interview-preparation" },
    { title: "Algorithms Interview Prep", provider: "Coursera", level: "Intermediate", duration: "4 weeks", free: true, url: "https://www.coursera.org/learn/algorithms-part1" },
    { title: "Career Skills", provider: "Google Learning", level: "Beginner", duration: "Self-paced", free: true, url: "https://grow.google/certificates/" }
  ]
};

writeFileSync(outPath, JSON.stringify(catalog, null, 2), "utf8");
console.log(`Wrote ${Object.keys(catalog).length} skills to ${outPath}`);
