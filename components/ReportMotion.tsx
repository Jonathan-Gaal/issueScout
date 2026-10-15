"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Decorative motion only: content remains visible without JS or animation. */
export default function ReportMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          if (entry.target.classList.contains('scope-metric')) entry.target.classList.remove('motion-seen');
          continue;
        }
        entry.target.classList.add('motion-seen');
        if (!entry.target.classList.contains('scope-metric')) observer.unobserve(entry.target);
      }
    }, { threshold: 0.15 });
    root.current.querySelectorAll('.scene-pair, .finding, .evidence-card-list>li, .scope-metric, #report-next-step').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [children]);
  return <div ref={root} className="report-motion">{children}</div>;
}
