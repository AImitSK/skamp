// src/components/InfoTooltip.tsx
"use client";

import { InformationCircleIcon } from '@heroicons/react/20/solid';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className = "" }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isAbove, setIsAbove] = useState(true);
  const [mounted, setMounted] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isVisible && iconRef.current && tooltipRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Position above the icon by default
      let top = iconRect.top - tooltipRect.height - 8;
      let left = iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2);
      let above = true;
      
      // Check if tooltip goes outside viewport
      if (top < 0) {
        // Position below if not enough space above
        top = iconRect.bottom + 8;
        above = false;
      }
      
      if (left < 0) {
        left = 8;
      } else if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      
      setPosition({ top, left });
      setIsAbove(above);
    }
  }, [isVisible]);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="fixed z-[10000] px-3 py-2 text-sm text-white bg-zinc-800 dark:bg-zinc-700 rounded-lg shadow-lg max-w-xs pointer-events-none"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {content}
      {/* Arrow */}
      <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 dark:bg-zinc-700 rotate-45 ${
        isAbove ? '-bottom-1' : '-top-1'
      }`} />
    </div>
  );

  return (
    <>
      <span
        ref={iconRef}
        className={`inline-flex items-center justify-center ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <InformationCircleIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-400 cursor-help" />
      </span>
      
      {mounted && isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
}