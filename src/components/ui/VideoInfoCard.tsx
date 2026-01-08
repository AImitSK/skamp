// src/components/ui/VideoInfoCard.tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  PlayIcon,
  CheckIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { toastService } from '@/lib/utils/toast';

/**
 * Props fuer die VideoInfoCard Komponente
 */
export interface VideoInfoCardProps {
  /** YouTube Video ID (z.B. 'yTfquGkL4cg' aus https://youtu.be/yTfquGkL4cg) */
  videoId: string;
  /** i18n Namespace fuer Titel und Beschreibung */
  i18nNamespace?: string;
  /** Fallback-Titel wenn kein i18n */
  title?: string;
  /** Fallback-Beschreibung wenn kein i18n */
  description?: string;
  /** Feature-Liste (i18n Keys oder direkte Strings) */
  features?: string[];
  /** Primaere Aktion */
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Sekundaere Aktion */
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Variante der Darstellung */
  variant?: 'default' | 'compact' | 'hero';
  /** Zusaetzliche CSS-Klassen */
  className?: string;
  /** Optional: Close-Handler fuer ausblendbare Karte */
  onClose?: () => void;
}

/**
 * VideoInfoCard - Wiederverwendbare Komponente fuer Video-Erklaerungen
 *
 * Zeigt ein YouTube-Video mit begleitenden Informationen an.
 * Unterstuetzt verschiedene Varianten fuer unterschiedliche Einsatzorte.
 *
 * @example
 * ```tsx
 * <VideoInfoCard
 *   videoId="yTfquGkL4cg"
 *   i18nNamespace="markenDna.video"
 *   features={['feature1', 'feature2', 'feature3']}
 *   primaryAction={{ label: 'Jetzt starten', href: '/start' }}
 *   variant="hero"
 * />
 * ```
 */
export function VideoInfoCard({
  videoId,
  i18nNamespace = 'videoInfoCard',
  title,
  description,
  features = [],
  primaryAction,
  secondaryAction,
  variant = 'default',
  className = '',
  onClose
}: VideoInfoCardProps) {
  const t = useTranslations(i18nNamespace);
  const tCommon = useTranslations('videoInfoCard');
  const tToast = useTranslations('toasts');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // YouTube URL
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

  // Link kopieren Handler
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(youtubeUrl);
      toastService.success(tToast('video.linkCopied'));
    } catch {
      toastService.error(tToast('video.copyFailed'));
    }
  }, [youtubeUrl, tToast]);

  // Auf YouTube oeffnen
  const handleOpenYouTube = useCallback(() => {
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  }, [youtubeUrl]);

  // Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Titel und Beschreibung (i18n mit Fallback)
  const displayTitle = title || t('title');
  const displayDescription = description || t('description');

  // Varianten-spezifische Klassen
  const variantClasses = {
    default: 'p-6',
    compact: 'p-4',
    hero: 'p-8'
  };

  const videoSizeClasses = {
    default: 'aspect-video',
    compact: 'aspect-video max-h-48',
    hero: 'aspect-video'
  };

  const gridClasses = {
    default: 'lg:grid-cols-2 gap-6',
    compact: 'lg:grid-cols-5 gap-4',
    hero: 'lg:grid-cols-2 gap-8'
  };

  return (
    <>
      {/* Hauptkarte */}
      <div
        className={`
          rounded-xl border border-zinc-200 shadow-sm relative
          bg-gradient-to-r from-blue-100 to-white
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {/* Close-Button oben rechts */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors z-10"
            title={tCommon('close')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}

        <div className={`grid grid-cols-1 ${gridClasses[variant]}`}>
          {/* Video-Bereich */}
          <div className={variant === 'compact' ? 'lg:col-span-2' : ''}>
            <div
              className={`
                relative rounded-lg overflow-hidden bg-zinc-900
                ${videoSizeClasses[variant]}
                cursor-pointer group
              `}
              onClick={() => setIsPlaying(true)}
            >
              {!isPlaying ? (
                <>
                  {/* Thumbnail mit Play-Button */}
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt={displayTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback zu Standard-Thumbnail
                      (e.target as HTMLImageElement).src =
                        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                  />
                  {/* Play-Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <PlayIcon className="w-8 h-8 lg:w-10 lg:h-10 text-[#005fab] ml-1" />
                    </div>
                  </div>
                  {/* Fullscreen-Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                    title={tCommon('fullscreen')}
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <iframe
                  src={`${embedUrl}&autoplay=1`}
                  title={displayTitle}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            {/* Video-Aktionen (nur bei default/hero) */}
            {variant !== 'compact' && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <ClipboardIcon className="w-4 h-4" />
                  {tCommon('copyLink')}
                </button>
                <button
                  onClick={handleOpenYouTube}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  {tCommon('openYouTube')}
                </button>
              </div>
            )}
          </div>

          {/* Info-Bereich (vertikal zentriert) */}
          <div className={`flex flex-col justify-center ${variant === 'compact' ? 'lg:col-span-3' : ''}`}>
            {/* Titel */}
            <h3 className={`
              font-semibold text-zinc-900
              ${variant === 'hero' ? 'text-2xl' : variant === 'compact' ? 'text-lg' : 'text-xl'}
            `}>
              {displayTitle}
            </h3>

            {/* Beschreibung */}
            <p className={`
              text-zinc-600 mt-2
              ${variant === 'compact' ? 'text-sm' : 'text-base'}
            `}>
              {displayDescription}
            </p>

            {/* Feature-Liste */}
            {features.length > 0 && (
              <ul className={`mt-4 space-y-2 ${variant === 'compact' ? 'mt-3' : ''}`}>
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className={`text-zinc-700 ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Aktionen */}
            {(primaryAction || secondaryAction) && (
              <div className={`
                flex flex-wrap gap-3 mt-auto pt-4
                ${variant === 'compact' ? 'pt-3' : 'pt-6'}
              `}>
                {primaryAction && (
                  primaryAction.href ? (
                    <a href={primaryAction.href}>
                      <Button color="primary">
                        {primaryAction.label}
                      </Button>
                    </a>
                  ) : (
                    <Button
                      color="primary"
                      onClick={primaryAction.onClick}
                    >
                      {primaryAction.label}
                    </Button>
                  )
                )}
                {secondaryAction && (
                  secondaryAction.href ? (
                    <a href={secondaryAction.href}>
                      <Button color="secondary">
                        {secondaryAction.label}
                      </Button>
                    </a>
                  ) : (
                    <Button
                      color="secondary"
                      onClick={secondaryAction.onClick}
                    >
                      {secondaryAction.label}
                    </Button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={toggleFullscreen}
        >
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <div
            className="w-full max-w-6xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`${embedUrl}&autoplay=1`}
              title={displayTitle}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}

export default VideoInfoCard;
