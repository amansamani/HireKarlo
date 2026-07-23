"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md ring-1 ring-border">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
          <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            This part of the dashboard hit an unexpected error. Your data is safe — try again.
          </p>
          <Button onClick={() => reset()} className="gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}