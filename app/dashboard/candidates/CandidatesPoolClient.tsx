"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
  Search,
  Download,
  Loader2,
  User,
  Mail,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { getAllCandidatesAction, exportCandidatesCsvAction } from "@/actions/candidates-pool";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type GlobalCandidate = {
  id: string;
  fullName: string;
  email: string;
  resumeUrl: string | null;
  applications: Array<{
    stage: string;
    job: { title: string };
  }>;
};

// Keep your existing ResumeLink component
function ResumeLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      Resume
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
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Global Candidate Pool</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search and manage all applicants across every active opening.
        </p>
      </div>

      {/* Search & Export Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Search by candidate name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-11 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            aria-label="Search candidates"
          />
          {isSearching && (
            <Loader2
              className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl text-xs font-semibold self-start sm:self-auto"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      {/* Empty State */}
      {candidates.length === 0 ? (
        <div className="animate-in fade-in-0 zoom-in-95 rounded-2xl border border-dashed border-border/60 bg-card/30 backdrop-blur-sm py-16 text-center duration-300">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-background/50 mb-4">
            <User className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-foreground">
            {searchQuery ? "No candidates match your search" : "No candidates found"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search query."
              : "Candidates will appear here once they apply to your jobs."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 sm:hidden">
            {candidates.map((candidate, i) => {
              const latestApp = candidate.applications[0];
              return (
                <div
                  key={candidate.id}
                  className="animate-in fade-in-0 slide-in-from-top-2 duration-300 fill-mode-backwards rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-4 shadow-sm"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <User className="h-4 w-4 text-primary" aria-hidden="true" />
                        </div>
                        {candidate.fullName}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground ml-10">
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        {candidate.email}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {latestApp?.job?.title || "Unknown Opening"}
                      </div>
                      {latestApp ? (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                          {latestApp.stage}
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          No Active Track
                        </span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <ResumeLink url={candidate.resumeUrl} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background shadow-sm sm:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Candidate Profile
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Applied Position
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Current Stage
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {candidates.map((candidate, i) => {
                  const latestApp = candidate.applications[0];
                  return (
                    <tr
                      key={candidate.id}
                      className="group transition-colors duration-200 hover:bg-muted/20"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                            <User className="h-5 w-5 text-primary" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">
                              {candidate.fullName}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground mt-0.5">
                              <Mail className="h-3 w-3" aria-hidden="true" />
                              {candidate.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {latestApp?.job?.title || "Unknown Opening"}
                        </div>
                      </td>
                      <td className="p-4">
                        {latestApp ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {latestApp.stage}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            No Active Track
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ResumeLink url={candidate.resumeUrl} />
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Load More */}
      {!searchQuery && hasMore && candidates.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl text-xs font-semibold"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}