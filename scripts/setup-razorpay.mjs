import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { PLANS } from "../lib/plans.ts";

// Run from the project root. Never print credentials or provider response bodies.
dotenv.config({ quiet: true });
const check = process.argv.includes("--check");
const envPath = new URL("../.env", import.meta.url);
let contents;
try { contents = readFileSync(envPath, "utf8"); } catch { console.error("Create the private .env file first."); process.exit(1); }
const updates = {};
const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
const mode = process.env.RAZORPAY_MODE || "test";
if (!keyId?.startsWith(`rzp_${mode}_`) || !secret || !["test", "live"].includes(mode)) {
  console.error("Set matching RAZORPAY_MODE, RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET privately in .env."); process.exit(1);
}
if (!check && mode !== "test") { console.error("Automatic plan creation is restricted to Test Mode. Create Live plans in the dashboard, configure their IDs, then run razorpay:check."); process.exit(1); }
async function request(path, body) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Razorpay returned HTTP ${response.status}. Check credentials and Subscriptions availability in your dashboard.`);
  return response.json();
}
function save() {
  for (const [name, value] of Object.entries(updates)) {
    const pattern = new RegExp(`^${name}=.*$`, "m");
    contents = pattern.test(contents) ? contents.replace(pattern, `${name}=${value}`) : `${contents.trimEnd()}\n${name}=${value}\n`;
  }
  const temporary = new URL("../.env.razorpay-tmp", import.meta.url);
  writeFileSync(temporary, contents, { mode: 0o600 }); renameSync(temporary, envPath);
}
const valid = (remote, plan) => /^plan_[a-zA-Z0-9]+$/.test(remote?.id) && remote.period === "monthly" && remote.interval === 1 && remote.item?.currency === "INR" && remote.item?.amount === plan.inr * 100;
try {
  let available;
  for (const [id, plan] of Object.entries(PLANS)) {
    const variable = `RAZORPAY_PLAN_${id}_INR`;
    let remote;
    if (process.env[variable]) {
      if (!/^plan_[a-zA-Z0-9]+$/.test(process.env[variable])) throw new Error(`Invalid ${variable}.`);
      remote = await request(`plans/${process.env[variable]}`);
    } else if (check) throw new Error(`Configure ${variable} first.`);
    else {
      if (!available) {
        available = [];
        for (let page = 0; page < 10; page++) {
          const result = await request(`plans?count=100&skip=${page * 100}`);
          if (!Array.isArray(result.items)) throw new Error("Unexpected plan response.");
          available.push(...result.items);
          if (result.items.length < 100) break;
          if (page === 9) throw new Error("Too many plans to safely search; configure plan IDs manually.");
        }
      }
      const name = `HireKarlo ${plan.name} INR Monthly`;
      const matches = available.filter(item => item.item?.name === name && valid(item, plan));
      if (matches.length > 1) throw new Error(`Multiple ${plan.name} plans exist; choose the correct ID in .env.`);
      remote = matches[0] || await request("plans", { period: "monthly", interval: 1, item: { name, amount: plan.inr * 100, currency: "INR" }, notes: { product: "hirekarlo", plan: id } });
      if (!valid(remote, plan)) throw new Error(`${plan.name} plan does not match the application price.`);
      updates[variable] = remote.id; save(); // Preserve each success if a later request fails.
    }
    if (!valid(remote, plan)) throw new Error(`${plan.name} must match the application's INR monthly price.`);
    console.log(`${plan.name}: verified INR ${plan.inr}/month (${mode}).`);
  }
  if (!check && !process.env.RAZORPAY_WEBHOOK_SECRET) { updates.RAZORPAY_WEBHOOK_SECRET = randomBytes(32).toString("hex"); save(); }
  if (check && !process.env.RAZORPAY_WEBHOOK_SECRET) throw new Error("Set a separate RAZORPAY_WEBHOOK_SECRET and configure the same value in the dashboard.");
  console.log("Plans verified. Complete the webhook and checkout checks in docs/razorpay-setup.md; this does not verify webhook delivery or payment capture.");
} catch (error) {
  console.error(error instanceof Error && !error.message.includes("fetch") ? error.message : "Provider connection failed. No automatic retry was made; rerun to recover existing plans.");
  process.exitCode = 1;
}
