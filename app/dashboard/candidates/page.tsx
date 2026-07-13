"use client";

import { useEffect, useState } from "react";
import { Search, User, Mail, Briefcase, FileDown, ExternalLink } from "lucide-react";
import { getAllCandidatesAction } from "@/actions/candidates-pool";
import { Input } from "@/components/ui/input";

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

export default function CandidatesPoolPage() {
  const [candidates, setCandidates] = useState<GlobalCandidate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPool() {
      const res = await getAllCandidatesAction();
      if (res.candidates) setCandidates(res.candidates as any);
      setLoading(false);
    }
    loadPool();
  }, []);

  const filteredCandidates = candidates.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Global Candidate Pool</h2>
        <p className="text-sm text-muted-foreground">Search and manage all applicants across every active opening.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="text"
          placeholder="Search by candidate name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9"
          aria-label="Search candidates"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 py-12 text-center">
          <p className="italic text-muted-foreground">No candidates match your search query.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 sm:hidden">
            {filteredCandidates.map((candidate) => {
              const latestApp = candidate.applications[0];
              return (
                <div key={candidate.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
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
                {filteredCandidates.map((candidate) => {
                  const latestApp = candidate.applications[0];
                  return (
                    <tr key={candidate.id} className="transition-colors hover:bg-muted/30">
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
    </div>
  );
}