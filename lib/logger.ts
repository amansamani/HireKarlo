// Only allow fixed event names and non-sensitive diagnostic codes.
export function logError(event: string, error?: unknown) {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{1,30}$/.test(error.code) ? error.code : "UNEXPECTED";
  console.error(JSON.stringify({ level: "error", event, code }));
}
