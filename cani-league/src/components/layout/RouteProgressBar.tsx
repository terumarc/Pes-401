"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

export function RouteProgressBar() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress on pathname change
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Intercept internal link clicks to trigger instant visual feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // If clicking the current path without hash or query difference, skip
        if (href === window.location.pathname) return;

        setIsNavigating(true);
        setProgress(25);

        // Simulate smooth initial progress while waiting for RSC
        const step1 = setTimeout(() => setProgress(65), 100);
        const step2 = setTimeout(() => setProgress(85), 300);

        return () => {
          clearTimeout(step1);
          clearTimeout(step2);
        };
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-emerald-400 to-primary transition-all duration-200 ease-out shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}
