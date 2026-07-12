# Case Study — HireTrack

## Problem

Small teams and solo recruiters end up running their hiring pipeline out of spreadsheets 
and email threads — job postings live in one place, resumes get emailed in and pile up in an inbox,
and there's no single view of where each candidate actually is in the process. Screening resumes by 
hand doesn't scale past a handful of applicants, and candidates are usually left wondering if anyone
ever saw their application.

HireTrack solves this for a single recruiter or small hiring team: post a job, share one public link,
and let the system parse and score every incoming resume automatically — so the recruiter opens their 
dashboard to an already-ranked pipeline instead of a pile of unread PDFs.


## Approach

Data model first

Before writing any UI, I mapped out the core entities — `User` (recruiter), `Job`,
`Candidate`, `JobApplication` (the pipeline stage lives here), `Interview`, and `ActivityLog` 
for audit history. Getting the relationships right early (a `Candidate` can apply to multiple 
jobs; a `JobApplication` is the join that carries pipeline state) meant every feature after that 
inherited a stable shape instead of forcing schema churn later.


Auth and authorization as a first-class concern, not an afterthought -

Recruiters authenticate via NextAuth with bcrypt-hashed credentials, but the more 
important decision was enforcing ownership server-side on every single action — every 
read or write re-checks that the requesting user actually owns the job/application in 
question before touching it. I found and fixed two real IDOR (Insecure Direct Object Reference) 
issues during a security pass: one endpoint returned candidates across all recruiters instead of 
just the logged-in user's, and another let any authenticated user view another recruiter's applicants
by guessing a job ID. Both are the kind of bug that looks fine in a demo and only shows up under scrutiny 
— exactly why I went back and audited every action file by hand instead of assuming the first pass was correct.


AI as a real feature, not a bolt-on 

Resume scoring runs entirely server-side: uploaded PDFs/DOCX are parsed with `pdf-parse`/`mammoth`, 
the extracted text plus the job description are sent to Google Gemini's free tier, and the structured response
(skills, estimated experience, a 0 - 100 match score, a short summary) is persisted directly on the application record.
Scoring is wrapped so that if the AI call fails for any reason, the candidate's application still submits
successfully — a third-party API hiccup should never block a real person from applying.


Debugging from evidence, not guesses

A meaningful chunk of the build was working through a chain of real, non-obvious
failures: Next.js 16 renaming `middleware.ts` to `proxy.ts` mid-project, an Edge 
Runtime incompatibility with bcrypt/Prisma that required splitting auth config in two, 
a `pdf-parse` v2 API rewrite, a Gemini model deprecation, and an ESLint 9.39 regression 
that crashed CI with a circular-JSON error unrelated to any of my own code. Each one got 
diagnosed from the actual stack trace and error output rather than a guess, which is the 
only way I found the real root cause every time instead of papering over a symptom.


## Result

- Live, deployed application with real Postgres, real auth, and a CI pipeline that runs lint, type-check, and build on every push
- Full recruiter workflow: post a job → candidate applies via a public link with no account → resume is parsed and AI-scored automatically → recruiter manages the pipeline through a kanban board → candidate receives an email on every stage change
- Server-side authorization enforced on every data access path, closing two real cross-tenant data leaks found during review
- Live URL - https://hire-track-beta.vercel.app/
- GIT repo - https://github.com/amansamani/HireTrack.git


What I'd build next:

Search/filtering on the candidate and job lists (currently flat lists, would get painful past ~50 applicants),
a candidate-facing status page so applicants aren't left guessing, and an automated end-to-end test suite to 
replace the manual click-through testing I relied on this round.


## What I Learned


i learned how the Next.js 16 App Router works under the hood, how to debug and fix Edge Runtime issues,
and how to integrate a third-party AI API into a real-world workflow.
I also learned the importance of designing a data model first,
enforcing server-side authorization, and debugging from evidence rather than guesses.  

