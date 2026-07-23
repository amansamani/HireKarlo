"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { acceptInviteAction } from "@/actions/team";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function AcceptInviteContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(() =>
    token ? "loading" : "error"
  );
  const [message, setMessage] = useState(() => (token ? "" : "Missing invite token."));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    acceptInviteAction(token).then((res) => {
      if (cancelled) return;
      if (res.error) {
        setStatus("error");
        setMessage(res.error);
      } else {
        setStatus("success");
        setMessage(res.success ?? "Joined!");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-4 text-center">
      {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />}
      {status === "success" && <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />}
      {status === "error" && <XCircle className="h-8 w-8 text-destructive" aria-hidden="true" />}
      <p className="text-sm text-foreground">{status === "loading" ? "Joining team..." : message}</p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-foreground">Joining team...</p>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}