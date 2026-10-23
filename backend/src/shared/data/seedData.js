const { USER_ROLES, COMPANY_VERIFICATION_STATUS, APPLICATION_STATUS } = require("../constants/enums");

module.exports = {
  users: [
    {
      email: "admin@internai.com",
      role: USER_ROLES.ADMIN,
      password: "Admin@123",
      adminRole: "super_admin"
    },
    { email: "intern1@example.com", role: USER_ROLES.INTERN, password: "Intern@123" },
    { email: "intern2@example.com", role: USER_ROLES.INTERN, password: "Intern@123" },
    {
      email: "company1@example.com",
      role: USER_ROLES.COMPANY,
      password: "Company@123",
      companyAccountType: "owner"
    },
    {
      email: "company2@example.com",
      role: USER_ROLES.COMPANY,
      password: "Company@123",
      companyAccountType: "owner"
    },
    {
      email: "hr@novatech.example",
      role: USER_ROLES.COMPANY,
      password: "CompanyHr@123",
      companyAccountType: "hr",
      displayName: "NovaTech HR",
      linkedCompanyEmail: "company1@example.com"
    },
    {
      email: "ceo@novatech.example",
      role: USER_ROLES.COMPANY,
      password: "CompanyCeo@123",
      companyAccountType: "ceo",
      linkedCompanyEmail: "company1@example.com"
    }
  ],
  internProfiles: [
    {
      fullName: "Aarav Sharma",
      email: "intern1@example.com",
      mobile: "9876543210",
      skills: ["javascript", "react", "node", "mongodb"],
      education: ["B.Tech CSE - ABC University"],
      projects: ["Built internship portal", "Created recommendation app"],
      certifications: ["Machine Learning Certification"],
      interests: ["ai", "machine learning"],
      completedCourses: ["Node.js Masterclass", "SQL Bootcamp"]
    },
    {
      fullName: "Isha Mehta",
      email: "intern2@example.com",
      mobile: "9898989898",
      skills: ["python", "sql", "data analysis"],
      education: ["BCA - XYZ College"],
      projects: ["Sales dashboard project"],
      certifications: ["Data Analytics Certification"]
    }
  ],
  companyProfiles: [
    {
      companyName: "NovaTech",
      companyEmail: "company1@example.com",
      gst: "22AAAAA0000A1Z5",
      contactName: "Rohit Verma",
      phone: "9123456789",
      website: "https://novatech.example",
      address: "Bangalore",
      description: "AI product startup",
      verificationStatus: COMPANY_VERIFICATION_STATUS.VERIFIED
    },
    {
      companyName: "CloudNest",
      companyEmail: "company2@example.com",
      gst: "33BBBBB1111B1Z6",
      contactName: "Nisha Rao",
      phone: "9234567890",
      website: "https://cloudnest.example",
      address: "Hyderabad",
      description: "Cloud analytics company",
      verificationStatus: COMPANY_VERIFICATION_STATUS.PENDING
    }
  ],
  internships: [
    {
      companyEmail: "company1@example.com",
      role: "AI Research Intern",
      skillsRequired: ["python", "machine learning", "sql"],
      prioritySkills: ["python", "machine learning"],
      stipend: "25000",
      duration: "6 months",
      location: "Remote",
      description: "Work on NLP and ranking models",
      assignToHrEmail: null
    },
    {
      companyEmail: "company1@example.com",
      role: "Full Stack Intern",
      skillsRequired: ["javascript", "react", "node", "mongodb"],
      prioritySkills: ["react", "node"],
      stipend: "20000",
      duration: "4 months",
      location: "Bangalore",
      description: "Build product features for internship platform",
      assignToHrEmail: "hr@novatech.example"
    }
  ],
  applications: [
    {
      internEmail: "intern1@example.com",
      internshipRole: "Full Stack Intern",
      status: APPLICATION_STATUS.SHORTLISTED,
      matchScore: 92,
      hrFeedback: [{ feedback: "Strong React fundamentals" }],
      assignToHrEmail: "hr@novatech.example"
    }
  ]
};
