/**
 * TaskDescriptionTooltip Component
 *
 * Zeigt die Task-Beschreibung als Tooltip/Popover bei Hover über dem Task-Titel.
 * Verwendet React Portal für korrektes Rendering über anderen Elementen.
 *
 * Features:
 * - Portal-basiertes Rendering (kein Overflow-Problem)
 * - Intelligente Positionierung (viewport-aware)
 * - Hover-Delay für bessere UX
 * - Zeigt nur an wenn Beschreibung vorhanden
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TaskDescriptionTooltipProps {
  description: string | undefined | null;
  children: React.ReactNode;
  className?: string;
  maxWidth?: number;
}

export function TaskDescriptionTooltip({
  description,
  children,
  className = '',
  maxWidth = 320
}: TaskDescriptionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  // Client-side mount check für Portal
  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Tooltip-Höhe schätzen (ca. 80px für kurze Beschreibungen)
    const estimatedTooltipHeight = 100;
    const tooltipWidth = Math.min(maxWidth, viewportWidth - 32);

    // Position berechnen - standardmäßig unter dem Element
    let top = rect.bottom + scrollY + 8;
    let left = rect.left + scrollX;

    // Wenn unten nicht genug Platz, zeige oben
    if (rect.bottom + estimatedTooltipHeight > viewportHeight) {
      top = rect.top + scrollY - estimatedTooltipHeight - 8;
    }

    // Horizontal anpassen wenn nötig
    if (left + tooltipWidth > viewportWidth - 16) {
      left = viewportWidth - tooltipWidth - 16 + scrollX;
    }
    if (left < 16) {
      left = 16 + scrollX;
    }

    setPosition({ top, left });
  }, [maxWidth]);

  const handleMouseEnter = useCallback(() => {
    // Delay von 300ms für bessere UX
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, 300);
  }, [calculatePosition]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  // Keine Beschreibung = kein Tooltip
  if (!description || description.trim() === '') {
    return <div className={className}>{children}</div>;
  }

  const tooltipContent = isVisible && mounted && (
    <div
      className="fixed z-[9999] bg-zinc-900 text-white text-sm rounded-lg shadow-lg px-3 py-2 pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        maxWidth: `${maxWidth}px`
      }}
    >
      <div className="whitespace-pre-wrap break-words">
        {description}
      </div>
      {/* Pfeil/Arrow */}
      <div
        className="absolute w-2 h-2 bg-zinc-900 transform rotate-45 -top-1 left-4"
        style={{ marginLeft: '-4px' }}
      />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={`cursor-default ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {mounted && createPortal(tooltipContent, document.body)}
    </>
  );
}

export default TaskDescriptionTooltip;
