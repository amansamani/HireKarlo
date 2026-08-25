# HireKarlo

> A lightweight applicant tracking system for recruiters — post jobs, collect applications, and let AI score every resume against the role before you even open it.

Live demo → https://hirekarlo.amansamani.me/

## Features

- Post job openings and share a public application link candidates can use with no account
- Applicants upload a resume (PDF/DOC/DOCX); it's automatically parsed and scored against the job description using AI
- Kanban-style pipeline (Applied → Technical → HR → Offer → Rejected) with one-click stage moves
- Interview scheduling with automatic activity logging
- Email notifications sent to candidates on every stage change and interview booking
- Recruiter-scoped data isolation — every recruiter only ever sees their own jobs and candidates
- Full audit trail of every pipeline action per job

## Tech Stack

Next.js (App Router) · TypeScript (strict) · PostgreSQL (Prisma) · NextAuth · Tailwind CSS · Google Gemini API · Nodemailer · Vercel

## Quick Start

\`\`\`bash
git clone https://github.com/amansamani/HireKarlo.git
cd HireKarlo
cp .env.example .env   # then fill in values, see table below
npm install
npx prisma migrate dev
npm run dev             # http://localhost:3000
\`\`\`

## Environment Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth session signing secret — generate with `npx auth secret` |
| `GEMINI_API_KEY` | Google Gemini API key (free tier) — from [Google AI Studio](https://aistudio.google.com/apikey) |
| `EMAIL_USER` | Gmail address used to send candidate notification emails |
| `EMAIL_PASS` | Gmail App Password (not your normal password) — generate at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |

## Demo Credentials

You're welcome to register your own recruiter account on the live demo — registration is open and takes a few seconds. A shared read-only login isn't provided since every recruiter's data (jobs, candidates) is private and scoped to their own account.

## Architecture

Recruiters authenticate via NextAuth (credentials + bcrypt), and every server action re-checks that the requesting user owns the job/application before returning or mutating data — there is no client-trusted role check. Candidates never authenticate at all; they interact only through a public, unauthenticated apply route (`/jobs/[id]`) that writes directly into the same Postgres database via a dedicated server action. Resume files are parsed server-side (`pdf-parse` / `mammoth`) and scored against the job description with the Gemini API, with the result persisted on the application record so recruiters see it instantly in the pipeline view. See [docs/architecture.md](docs/architecture.md) for the data model and further notes.

## Testing

Manual end-to-end testing was performed across the full recruiter and candidate flows (auth, job creation, public application, resume scoring, pipeline stage changes, email delivery) on the live deployment. Automated tests are on the roadmap — see below.

## Roadmap

- [x] Auth, job CRUD, application pipeline
- [x] AI resume parsing and scoring
- [x] Email notifications on stage change
- [ ] Automated end-to-end test suite
- [ ] Candidate-facing application status page
- [ ] Search/filter on candidate and job lists

## Screenshots

_Add 3–5 screenshots of the dashboard, pipeline view, and public apply form here._

## License

MIT — see [LICENSE](LICENSE).

---
Built as part of the Digital Heroes Full Stack Developer Trial.

## Production security env

Set `GOOGLE_TOKEN_ENCRYPTION_KEY` to a long random secret before connecting Google Calendar. Existing plaintext Google refresh tokens are accepted only for migration compatibility; reconnect the Google Calendar integration after setting this key so the token is stored encrypted.

Set `CRON_SECRET` in the deployment; Vercel Cron uses it for interview reminders and expired resume cleanup.
