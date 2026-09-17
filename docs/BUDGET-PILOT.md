# Launch with a budget under ₹3,000/month

Aman confirmed this budget on 16 September 2026. Aim for three to five assisted pilot businesses, not unrestricted signup or a mature enterprise service. No hosting purchase or deployment has been made.

## Practical cost envelope

Vercel Pro currently starts at **$20/month**, excluding applicable taxes and usage. Check your actual invoice conversion and spend controls before committing. This consumes much of a ₹3,000 budget. Keep one paid developer seat, use the existing domain, and avoid optional infrastructure until paid usage justifies it. Hobby is not a commercial launch option. [Current Vercel pricing](https://vercel.com/pricing), [Hobby restrictions](https://vercel.com/docs/plans/hobby).

Reserve roughly ₹300–₹500 for AI and ₹200–₹400 for contingency as planning allocations. Your remaining database, email and Cloudinary costs must fit the balance. These allocations are not vendor quotes, and a sub-₹3,000 total is not guaranteed. The existing PostgreSQL host/plan and storage/email quotas are unknown. Confirm commercial permission, backups, quotas and invoice estimates before selecting hosting; do not migrate merely to chase a free tier.

If hosting plus the existing database/storage already exceeds the ceiling, keep a noncommercial preview and collect customer commitments while evaluating another commercial host. Do not promise production service on free personal hosting. Founder time, legal review, monitoring and payment fees also have costs even if they do not appear on the infrastructure bill.

## Enforced and operational controls

- Set `PILOT_SIGNUP_EMAILS` to a comma-separated list of approved account emails. Registration rejects other accounts while the list is nonempty. Include invited team members who need accounts. Leaving it empty permits public registration. This controls new accounts; it does not remove existing accounts or independently cap existing workspace creation.
- Keep the initial trial AI allowance at 100 attempts per workspace and approve only a few workspaces. Do not promise unlimited screening. Review provider usage daily and disable AI by removing its key if the budget is at risk; candidate applications can proceed without configured AI.
- Set provider quotas and hosting spend controls where available. Budget alerts alone do not universally stop charges; there is no global hard rupee-denominated cap in the application.
- Enable frequent cron only on the commercial host, verify email retries, and supervise dead letters. Gmail and free storage/database tiers require their own commercial and quota checks.
- Conduct onboarding yourself. Use no paid advertising during validation. Charge only after the production gates and real merchant tests pass; two Starter customers would generate ₹2,998/month before taxes, payment fees, support and other costs, not profit.

Keep Starter ₹1,499 and Growth ₹3,999 as price tests. Do not cut subscription prices merely because infrastructure is inexpensive: willingness to pay depends on actual workflow value and alternatives. Reinvest early renewals into the AI worker, protected legacy storage and reliable operations before expanding acquisition.
