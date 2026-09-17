export function assertAuditDatabase(connection: string | undefined = process.env.DATABASE_URL) {
  if (!connection) throw new Error("Configure an isolated audit database");
  const url = new URL(connection);
  if (url.pathname !== "/hirekarlo_audit" || !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Tests require local hirekarlo_audit; never customer data");
}
