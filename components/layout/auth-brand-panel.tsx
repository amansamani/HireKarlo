import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Point = {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
};

export function AuthBrandPanel({
  heading,
  subheading,
  points,
}: {
  heading: string;
  subheading: string;
  points: Point[];
}) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border/40 bg-gradient-to-br from-background via-card to-background p-12 lg:flex">
      {/* Animated gradient orbs */}
      <div
        className="animate-pulse pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="animate-pulse pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Background image overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url(/hero-bg.webp)] bg-cover bg-center"
        aria-hidden="true"
      />

      <Link
        href="/"
        className="animate-in fade-in-0 relative z-10 flex items-center gap-2.5 group duration-700"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl group-hover:blur-2xl transition-all duration-300" />
          <Image
            src="/logo.webp"
            alt="HireKarlo Logo"
            width={112}
            height={28}
            className="relative h-8 w-auto object-contain"
            priority
          />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          HireKarlo
        </span>
      </Link>

      <div className="relative z-10 max-w-md space-y-8">
        <div className="animate-in fade-in-0 slide-in-from-left-4 space-y-4 duration-700 fill-mode-backwards">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            AI-Powered Recruitment
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {heading}
            </span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {subheading}
          </p>
        </div>

        <ul className="space-y-4">
          {points.map((point, i) => {
            const Icon = point.icon;
            return (
              <li
                key={i}
                className="animate-in fade-in-0 slide-in-from-left-4 flex items-start gap-4 duration-700 fill-mode-backwards group"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15 group-hover:border-primary/30">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium leading-relaxed text-foreground/90 pt-2">
                  {point.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative z-10 flex items-center gap-4 pt-8 border-t border-border/40">
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold",
                i === 1 && "bg-primary/20 text-primary",
                i === 2 && "bg-chart-2/20 text-chart-2",
                i === 3 && "bg-warning/20 text-warning",
                i === 4 && "bg-success/20 text-success"
              )}
            >
              {String.fromCharCode(64 + i)}
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">
            Trusted by recruiters
          </p>
          <p className="text-[11px] text-muted-foreground">
            AI-scored applicants, one pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}