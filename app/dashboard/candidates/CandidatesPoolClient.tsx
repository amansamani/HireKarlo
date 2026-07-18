"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, Mail, Briefcase, FileDown, ExternalLink, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAllCandidatesAction, exportCandidatesCsvAction } from "@/actions/candidates-pool";
import { toast } from "sonner";

type GlobalCandidate = {
  id: string;
  fullName: string;
  email: string;
  resumeUrl: string | null;
  createdAt: Date | string;
  applications: Array<{
    stage: string;
    job: { title: string };
  }>;
};

function ResumeLink({ url }: { url: string | null }) {
  if (!url) {
    return (
      <span className="rounded border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
        No Document
      </span>
    );
  }
  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-muted/70"
    >
      <FileDown className="h-3 w-3" aria-hidden="true" /> Resume <ExternalLink className="h-2.5 w-2.5 opacity-50" aria-hidden="true" />
    </a>
  );
}

export default function CandidatesPoolClient({
  initialCandidates,
  initialHasMore,
}: {
  initialCandidates: GlobalCandidate[];
  initialHasMore: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<GlobalCandidate[]>(initialCandidates);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await getAllCandidatesAction(1, searchQuery);
      setIsSearching(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setCandidates(res.candidates as GlobalCandidate[]);
      setPage(1);
      setHasMore(res.hasMore);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await getAllCandidatesAction(nextPage, searchQuery);
    if (res.error) {
      toast.error(res.error);
    } else {
      setCandidates((current) => [...current, ...res.candidates]);
      setPage(nextPage);
      setHasMore(res.hasMore);
    }
    setIsLoadingMore(false);
  }, [page, searchQuery]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    const res = await exportCandidatesCsvAction();
    setIsExporting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const blob = new Blob([res.csv!], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []); 

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Global Candidate Pool</h2>
        <p className="text-sm text-muted-foreground">Search and manage all applicants across every active opening.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search by candidate name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
            aria-label="Search candidates"
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
          Export CSV
        </Button>
      </div>

      {candidates.length === 0 ? (
        <div className="animate-in fade-in-0 zoom-in-95 rounded-xl border border-border bg-card/40 py-12 text-center duration-300">
          <p className="italic text-muted-foreground">
            {searchQuery ? "No candidates match your search query." : "No candidates found."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {candidates.map((candidate, i) => {
              const latestApp = candidate.applications[0];
              return (
                <div
                  key={candidate.id}
                  className="animate-in fade-in-0 slide-in-from-top-2 space-y-3 rounded-xl border border-border bg-card p-4 duration-300 fill-mode-backwards"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> {candidate.fullName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3" aria-hidden="true" /> {candidate.email}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                      <Briefcase className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      {latestApp?.job?.title || "Unknown Opening"}
                    </div>
                    {latestApp ? (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground/80">
                        {latestApp.stage}
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">No Active Track</span>
                    )}
                  </div>
                  <div className="flex justify-end text-xs">
                    <ResumeLink url={candidate.resumeUrl} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50 font-medium text-muted-foreground select-none">
                  <th className="p-4">Candidate Profile</th>
                  <th className="p-4">Applied Position</th>
                  <th className="p-4">Current Stage</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {candidates.map((candidate, i) => {
                  const latestApp = candidate.applications[0];
                  return (
                    <tr
                      key={candidate.id}
                      className="animate-in fade-in-0 slide-in-from-left-1 fill-mode-backwards transition-colors duration-300 hover:bg-muted/30"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="space-y-0.5 p-4">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <User className="h-3 w-3 text-muted-foreground" aria-hidden="true" /> {candidate.fullName}
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <Mail className="h-3 w-3" aria-hidden="true" /> {candidate.email}
                        </div>
                      </td>
                      <td className="p-4 text-foreground/90">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Briefcase className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          {latestApp?.job?.title || "Unknown Opening"}
                        </div>
                      </td>
                      <td className="p-4">
                        {latestApp ? (
                          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground/80">
                            {latestApp.stage}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">No Active Track</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <ResumeLink url={candidate.resumeUrl} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!searchQuery && hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}