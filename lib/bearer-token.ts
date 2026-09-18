import { createHash } from "crypto";
export function hashBearerToken(token: string) {
  return `sha256:${createHash("sha256").update(token).digest("hex")}`;
}
export function bearerTokenCandidates(token: string) {
  // Never allow a database hash itself to become a usable bearer credential.
  if (typeof token !== "string" || !/^[a-zA-Z0-9_-]{24,200}$/.test(token)) return [];
  // Raw compatibility lasts only until existing short-lived links expire.
  return [hashBearerToken(token), token];
}
