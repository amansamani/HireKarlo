# Market and pricing recommendation

Research checked 16 September 2026. These are proposed prices and demand hypotheses, not evidence that customers have agreed to pay.

## Competitor benchmark before setting prices

| Competitor | Verified public pricing | Billing unit and product context |
|---|---|---|
| Manatal | Professional $19 monthly or $15 with annual billing; Enterprise $39 monthly or $35 annual; Plus $59 monthly or $55 annual | Per user. Professional includes 15 jobs per account and 10,000 candidates. Unlimited hiring managers. Mature low-cost ATS alternative. [Official pricing](https://www.manatal.com/pricing) |
| Workable | Displayed Standard $299/month, billed $3,588/year, for the selected small-company configuration | Package varies with company size and selected recruiting/HR products; not a universal per-seat quote. Much broader recruiting offering. [Official pricing](https://www.workable.com/pricing) |
| Zoho Recruit | Current numerical local price not independently confirmed from the dynamic page | Free and paid tiers; Standard shows 10 active jobs per recruiter and Enterprise 20. An older INR PDF is dated 2021 and was not treated as a current price. [Official plans](https://www.zoho.com/recruit/pricing.html) |
| Recruit CRM | Current numerical price not confirmed from the dynamic page | Agency-focused ATS plus CRM, submissions and automation. Obtain a current written quote before a sales comparison. [Official pricing](https://recruitcrm.io/pricing/) |
| Tellent Recruitee | Numerical current price not confirmed; agency custom quote offered | Start includes five active jobs; broader collaboration and growth features. [Official pricing](https://recruitee.com/pricing) |

A two-user Manatal Professional account is $38/month at monthly rates; five users $95; ten users $190. HireKarlo's proposed $29/$79/$149 packages are cheaper at those team sizes, but have different capacities and fewer mature features. Being cheaper alone is not a defensible advantage.

## Positioning and first customer

Start with founder-led agencies and companies using spreadsheets, email and shared folders, with two to ten recruiting users. Interview both segments, then select the one with the strongest repeated problem and paid retention. Companies value coordination and faster review; agencies also need client submissions, placements and commercial tracking. The current client directory covers only the beginning of agency workflow.

Sell a faster, organized hiring workflow, measured against the customer's baseline. Demonstrate applicant intake, a usable shortlist, a scheduled interview and an export. Avoid selling an AI score as a substitute for recruiter judgment. Existing inexpensive competitors make basic ATS functionality and generic AI a weak moat. Service quality, workflow fit and reliable data handling can provide the initial wedge; integrations and repeatable agency workflows can deepen it later.

## Proposed monthly prices

| Plan | INR | USD | Recruiter/admin seats | Active jobs | Stored candidates | AI attempts |
|---|---:|---:|---:|---:|---:|---:|
| Starter | ₹1,499 | $29 | 2 | 5 | 1,000 | 100/month |
| Growth | ₹3,999 | $79 | 5 | 20 | 5,000 | 500/month |
| Agency | ₹7,999 | $149 | 10 | 50 | 15,000 | 1,000/month |

These exact values are implemented in `lib/plans.ts`. Trial: fourteen days, Growth capacity, 100 total AI attempts, no automatic charge. Interviewers do not consume recruiter seats. Paid credits reset per UTC calendar month; actual attempts can consume credits even if the provider fails. Usage is blocked at limits rather than billed unexpectedly. Taxes may apply. INR and USD are separate configured prices, not exchange-rate equivalents; the current checkout allows either currency and does not enforce a customer's country.

Agency is a capacity tier with client records. Do not market it as complete agency CRM or placement billing. Annual discounts, unlimited usage and enterprise SLA are not implemented. Delay annual billing until onboarding, support costs and renewal behavior are understood.

## How much might customers pay?

Initial hypotheses: small Indian teams ₹1,000–₹2,000/month; established five-person teams ₹3,000–₹5,000; larger agencies ₹6,000–₹10,000 if workflow adoption creates value. International equivalents should be tested at $19–$39, $59–$99 and $129–$179 respectively. These are test ranges, not survey results or market facts.

Example ROI, using explicit assumptions: reviewing 80 resumes three minutes faster saves four hours. At an assumed ₹500/hour, that is ₹2,000/month of review capacity. A ₹1,499 subscription is difficult to justify on this benefit alone unless coordination benefits add value. A Growth customer saving twenty hours at that rate gets ₹10,000 of monthly capacity; ₹3,999 captures about 40% of that modeled benefit. Measure time and adoption rather than claiming guaranteed savings or additional placements.

## Cost discipline

Current Gemini 3.5 Flash paid pricing is $1.50 per million input tokens and $9 per million output tokens, including thinking. A modeled 3,000-input/500-output attempt costs $0.009: 500 attempts cost $4.50. A 6,000-input/2,048-output attempt costs about $0.02743: 500 cost about $13.72, before retries and other services. Token limits, thinking, languages and failures change actual cost. Measure billed usage; do not equate characters to tokens. Free-tier data processing differs from paid-tier processing, which matters for candidate documents. [Official Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing).

Illustrative Growth contribution model in USD: $79 revenue minus $4.50 AI, $3 processing, $2 allocated infrastructure, $1 email/storage and $8 support gives $60.50, or 76.6%. These are scenario assumptions, not observed costs or provider quotes; fixed platform costs and founder acquisition time still need coverage. At the higher modeled AI usage it falls to about 65%. Track cost per completed application, attempt, active workspace and support ticket before raising limits. Cheaper models require a quality evaluation before switching.

An 80% contribution target allows $15.80 direct cost on a $79 plan. Shared hosting, database, storage, payment, support and AI all compete for that budget. Early customers may not cover fixed hosting costs. A free personal Vercel account is not a commercial production cost plan.

## Validate with real payments

Recruit ten agencies and ten companies through founder outreach. Observe their current workflow first. Test matched prospects against Starter ₹999/₹1,499/₹1,999 or $19/$29/$39 and Growth ₹2,999/₹3,999/₹4,999 or $59/$79/$99. Keep feature scope and onboarding comparable. These small samples give directional feedback, not statistically proven price elasticity.

Ask for a paid pilot, track time to first job/application/interview, weekly recruiter usage, support burden, cancellations and renewal at 30 and 60 days. Record actual price objections separately from missing-feature objections. If fewer than roughly three of ten qualified prospects pay and use it, revisit the segment/problem before spending on advertisements. This is a proposed decision rule, not a universal benchmark. Offer a clearly time-limited founder discount if needed; avoid lifetime deals that create permanent support liabilities.

## Commercial sequence

1. Complete staging gates and run three to five assisted pilots in one segment.
2. Fix the dominant workflow friction and prove at least a few paid renewals before scaling acquisition.
3. For agencies, prioritize client submissions, placement tracking and permissions only if pilots repeatedly need them. For companies, prioritize calendars, team adoption and reporting.
4. Expand internationally after payment eligibility, data processing arrangements, timezone/language quality and support coverage are verified. Do not promise job-board distribution or local compliance through a pricing page.

Stripe India is invitation-only. The optional implementation should remain disabled until onboarding and test-mode validation succeed. Evaluate Razorpay for an Indian merchant; international and recurring capabilities depend on approval and actual account configuration. No Razorpay adapter is included. [Stripe availability](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india?locale=en-GB), [Razorpay international currencies](https://razorpay.com/docs/payments/international-payments/currency-conversion/?preferred-country=IN).
