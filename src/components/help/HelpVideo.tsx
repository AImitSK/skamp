'use client'

import { PlayCircleIcon, FilmIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

interface HelpVideoProps {
  video: {
    title: string
    url: string
    thumbnailUrl?: string
  }
}

export function HelpVideo({ video }: HelpVideoProps) {
  const t = useTranslations('help')

  // Extrahiere YouTube Video ID für Thumbnail Fallback
  const getYouTubeThumbnail = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/,
    )
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
  }

  const thumbnailUrl = video.thumbnailUrl || getYouTubeThumbnail(video.url)

  return (
    <div className="p-4">
      <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-3">
        <FilmIcon className="h-5 w-5 text-red-500" />
        {t('sections.video')}
      </h3>

      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 aspect-video">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-zinc-700">
              <FilmIcon className="h-12 w-12 text-gray-400 dark:text-zinc-500" />
            </div>
          )}
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 rounded-full p-3 group-hover:bg-primary-600/90 transition-colors">
              <PlayCircleIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {video.title}
        </p>
      </a>
    </div>
  )
}
