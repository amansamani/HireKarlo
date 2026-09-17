export function missingRequiredEnvironment(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const required = ["DATABASE_URL", "AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];
  const missing = required.filter(name => !env[name]?.trim());
  if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32) missing.push("AUTH_SECRET_MIN_32_CHARACTERS");
  if (env.NEXT_PUBLIC_APP_URL) {
    try { const url = new URL(env.NEXT_PUBLIC_APP_URL); if (!["http:", "https:"].includes(url.protocol) || (env.NODE_ENV === "production" && url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1")) missing.push("APP_URL_VALID_HTTPS"); }
    catch { missing.push("APP_URL_VALID_HTTPS"); }
  }
  return missing;
}
