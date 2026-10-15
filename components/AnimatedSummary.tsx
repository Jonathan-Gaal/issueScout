"use client";
import { useEffect, useRef, useState } from "react";

export default function AnimatedSummary({ text }: { text: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element || finished || !('IntersectionObserver' in window)) return;
    const shell = element.closest('.workspace-app');
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    let started = false;
    const stop = () => { clearInterval(timer); setVisible(null); };
    const allowed = () => !preference.matches && !!shell?.classList.contains('motion-on');
    const check = () => { if (!allowed()) stop(); };
    const observer = new IntersectionObserver(entries => {
      if (started || !entries.some(entry => entry.isIntersecting) || !allowed()) return;
      started = true;
      let count = 0;
      setVisible(0);
      const step = Math.max(1, Math.ceil(text.length / 65));
      timer = setInterval(() => {
        count = Math.min(text.length, count + step);
        setVisible(count);
        if (count === text.length) { clearInterval(timer); setFinished(true); }
      }, 24);
    }, { threshold: .5 });
    observer.observe(element);
    const mutations = new MutationObserver(check);
    if (shell) mutations.observe(shell, { attributes: true, attributeFilter: ['class'] });
    preference.addEventListener('change', check);
    return () => { clearInterval(timer); observer.disconnect(); mutations.disconnect(); preference.removeEventListener('change', check); };
  }, [text, finished]);
  const typing = visible !== null && visible < text.length && !finished;
  return <div className="animated-summary" ref={root}>
    <p className="summary-accessible">{text}</p>
    <p className="summary-type-layout" aria-hidden="true"><span className="summary-reserve">{text}</span><span className="summary-typed">{typing ? text.slice(0, visible) : text}{typing && <span className="summary-cursor">▎</span>}</span></p>
    {typing && <button type="button" className="summary-show-all" onClick={() => setFinished(true)}>Show all</button>}
  </div>;
}
