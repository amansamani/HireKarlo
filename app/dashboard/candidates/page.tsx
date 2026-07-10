"use client";

import { useEffect, useState } from "react";
import { Search, User, Mail, Briefcase, FileDown, ExternalLink, Loader2 } from "lucide-react";
import { getAllCandidatesAction } from "@/actions/candidates-pool";

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

  const filteredCandidates = candidates.filter((c) =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-zinc-100 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Global Candidate Pool</h2>
        <p className="text-sm text-zinc-400">Search and manage all job applicants across every active opening.</p>
      </div>

      {/* Search Input Bar Bar Control */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by candidate name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-800 bg-zinc-900/50 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-600"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          Loading candidate system records...
        </div>
      ) : (
        <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-medium select-none">
                <th className="p-4">Candidate Profile</th>
                <th className="p-4">Applied Position</th>
                <th className="p-4">Current Stage</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-600 italic">
                    No candidates match your search query.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => {
                  const latestApp = candidate.applications[0];
                  return (
                    <tr key={candidate.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="p-4 space-y-0.5">
                        <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          <User className="h-3 w-3 text-zinc-500" /> {candidate.fullName}
                        </div>
                        <div className="text-zinc-500 flex items-center gap-1.5 font-mono text-[11px]">
                          <Mail className="h-3 w-3 text-zinc-600" /> {candidate.email}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Briefcase className="h-3 w-3 text-zinc-500" />
                          {latestApp?.job?.title || "Unknown Opening"}
                        </div>
                      </td>
                      <td className="p-4">
                        {latestApp ? (
                          <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300 border border-zinc-700/60">
                            {latestApp.stage}
                          </span>
                        ) : (
                          <span className="text-zinc-600 italic">No Active Track</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {candidate.resumeUrl ? (
                          <a
                            href={candidate.resumeUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-200 font-medium transition-colors"
                          >
                            <FileDown className="h-3 w-3" /> Resume <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-900">No Document</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}