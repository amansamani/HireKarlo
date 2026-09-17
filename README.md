# HireKarlo

> **AI-powered recruitment management built to make hiring faster, smarter, and more organized.**

🌐 **Live:** https://hirekarlo.amansamani.me/

HireKarlo is a full-stack recruitment platform that helps recruiters manage the hiring process from **job posting to interview scheduling and candidate tracking**, with AI assisting in resume evaluation.

It is a personal project built and maintained by **Aman Samani**.

---

## ✨ Features

### 💼 Job Management

Create and manage job openings with detailed job descriptions and recruitment stages.

Recruiters can publish jobs and share a public application link with candidates.

### 📝 Public Candidate Applications

Candidates can apply to a job through a public application page without creating an account.

They can submit their details and upload their resume directly through the application process.

### 🤖 AI Resume Analysis

HireKarlo can analyze uploaded resumes against the job description using AI.

It extracts relevant candidate information and generates an **AI-based match score** to help recruiters quickly identify promising candidates.

### 📊 Recruitment Pipeline

Manage candidates through a visual recruitment pipeline.

Typical stages include:

**Applied → Technical → HR → Offer → Rejected**

Recruiters can move candidates between stages as the hiring process progresses.

### 📅 Interview Scheduling

Schedule interviews and keep interview activity connected to the candidate's recruitment journey.

Google Calendar integration is supported for interview scheduling.

### 📧 Automated Notifications

Candidates can receive email notifications when important recruitment events occur, including:

* Application stage changes
* Interview scheduling
* Interview-related updates

### 📈 Recruitment Analytics

Recruiters can view useful hiring and recruitment insights to understand activity across their jobs and candidates.

### 🕒 Activity & Audit Tracking

HireKarlo keeps a history of important recruitment actions, making it easier to understand how a candidate moved through the hiring process.

### 🔐 Recruiter Data Isolation

Recruiter accounts are isolated from one another.

Each recruiter can access and manage only the jobs, candidates, applications, and recruitment data belonging to their account.

---

## 🚀 What HireKarlo Is Capable Of

HireKarlo brings multiple parts of the recruitment workflow into one platform:

**Job Creation**
→ Create and publish job openings

**Candidate Applications**
→ Receive applications through public job links

**Resume Processing**
→ Upload and process candidate resumes

**AI Evaluation**
→ Compare resumes against job requirements

**Candidate Management**
→ Organize candidates inside a recruitment pipeline

**Interview Management**
→ Schedule and manage interviews

**Communication**
→ Send automated candidate notifications

**Recruitment Tracking**
→ Maintain activity history across the hiring process

This makes HireKarlo more than a simple job-posting website — it is designed as an **end-to-end recruitment workflow platform**.

---

## 🧠 AI-Powered Hiring Assistance

One of the core ideas behind HireKarlo is reducing the amount of manual screening recruiters have to perform.

Instead of opening every resume individually, recruiters can use AI-assisted resume analysis to quickly understand how closely a candidate's experience matches the requirements of a particular role.

The AI score is intended to be a **screening aid**, not a final hiring decision.

Recruiters should always review candidate information themselves before making employment decisions.

---

## ⚠️ Disclaimer

HireKarlo is a **personal independent project created and maintained by Aman Samani**.

It is currently developed as a portfolio/product project and is **not an open-source community project**.

### 🚫 Contributions

**Pull requests, feature contributions, unsolicited code changes, and external development contributions are not currently accepted.**

The project is maintained solely by its creator.

You are welcome to explore the project and use the live application, but please do not submit changes expecting them to be merged.

### 🤖 AI Disclaimer

AI-generated resume analysis, scoring, or recommendations may not always be accurate.

HireKarlo should **not be used as the sole basis for hiring, rejection, interview, or employment decisions**.

Recruiters are responsible for reviewing candidate information and making their own decisions.

### 🔒 Data & Privacy

Candidate resumes and personal information may contain sensitive information.

Users should avoid submitting information that they are not authorized to share and should review the application's privacy policies before using the service.

---

## 👨‍💻 About the Project

HireKarlo was designed and built by **Aman Samani** as a personal full-stack project focused on combining:

**Recruitment + AI + Automation + Modern Web Development**

The goal is to explore how AI can assist recruiters while keeping the hiring workflow simple, organized, and efficient.

---

## 🌐 Live Application

**HireKarlo:**
https://hirekarlo.amansamani.me/

---

### Built with ❤️ by Aman Samani


---

## Reviewed SaaS edition

This local edition adds organization-scoped access, restricted interviewer roles, private new resume uploads, transactional application checks, a fourteen-day trial, plan limits, agency client records, workspace switching, optional Stripe billing, and durable email retries. AI assists human review.

It is **not a production-certified deployment**. Existing public resumes, real provider tests, payment eligibility, commercial hosting, operational monitoring and data-processing arrangements must be addressed before paid launch. Razorpay, placement invoicing, client portals, SSO and annual billing are not implemented.

- [Production audit](docs/PRODUCTION-AUDIT.md)
- [Market research and proposed pricing](docs/MARKET-AND-PRICING.md)
- [Launch runbook](docs/LAUNCH-RUNBOOK.md)
- [Pilot plan under ₹3,000/month](docs/BUDGET-PILOT.md)
- [Verification evidence](docs/VERIFICATION.md)
- [Current architecture](docs/architecture.md)

## Development

Use Node 22.12 or newer. Run `npm ci`, copy `.env.example` to `.env`, configure a dedicated PostgreSQL database and strong `AUTH_SECRET`, then run `npm run db:deploy` and `npm run dev`. Keep credentials private. Optional services need their environment variables.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build`, `npm run test:e2e`. Integration fixtures require an isolated database whose URL contains `hirekarlo_audit`; never point them at customer data.

Builds do not automatically migrate a production database. Follow the runbook for a controlled migration release. Default `vercel.json` has daily preview schedules. `vercel.production.json` is a commercial-hosting template; it does not activate a paid plan. Vercel Hobby is for personal, non-commercial use.

Pricing hypotheses: Starter ₹1,499 / $29, Growth ₹3,999 / $79, Agency ₹7,999 / $149 per month. Validate willingness to pay with actual paid pilots and renewals.

## Existing repository context

Repository: https://github.com/amansamani/HireTrack

Existing demo: https://hirekarlo.amansamani.me/ — the live deployment was not upgraded by this local transfer.

Originally built as part of the Digital Heroes Full Stack Developer Trial.

Current access is scoped to organization membership and roles. The original project overview above describes its earlier prototype.
