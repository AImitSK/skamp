'use client'

import { PortableText } from 'next-sanity'
import { image } from '@/sanity/image'
import Link from 'next/link'
import { LightBulbIcon } from '@heroicons/react/24/outline'

interface Tip {
  text: string
}

interface Video {
  title: string
  url: string
}

interface RelatedArticle {
  title: string
  slug: string
  category?: { slug: string }
}

interface ArticleContentProps {
  content: unknown
  tips?: Tip[]
  videos?: Video[]
  relatedArticles?: RelatedArticle[]
  locale: string
  categorySlug: string
}

// Portable Text Komponenten für Support-Artikel
const portableTextComponents = {
  block: {
    normal: ({ children }: { children: React.ReactNode }) => (
      <p className="my-4 text-base text-gray-700 dark:text-zinc-300 first:mt-0 last:mb-0">
        {children}
      </p>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className="mt-8 mb-4 text-xl font-semibold text-gray-900 dark:text-white first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="mt-6 mb-3 text-lg font-medium text-gray-900 dark:text-white">
        {children}
      </h3>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="my-6 border-l-4 border-primary-500 pl-4 text-gray-600 dark:text-zinc-400 italic">
        {children}
      </blockquote>
    ),
  },
  types: {
    image: ({ value }: { value: { alt?: string } }) => (
      <img
        alt={value.alt || ''}
        src={image(value).width(1200).url()}
        className="w-full rounded-lg my-6"
      />
    ),
    separator: ({ value }: { value: { style?: string } }) => {
      switch (value.style) {
        case 'line':
          return <hr className="my-8 border-t border-gray-200 dark:border-zinc-700" />
        case 'space':
          return <div className="my-8" />
        default:
          return null
      }
    },
  },
  list: {
    bullet: ({ children }: { children: React.ReactNode }) => (
      <ul className="my-4 list-disc pl-6 text-gray-700 dark:text-zinc-300 space-y-2">
        {children}
      </ul>
    ),
    number: ({ children }: { children: React.ReactNode }) => (
      <ol className="my-4 list-decimal pl-6 text-gray-700 dark:text-zinc-300 space-y-2">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }: { children: React.ReactNode }) => (
      <li>{children}</li>
    ),
    number: ({ children }: { children: React.ReactNode }) => (
      <li>{children}</li>
    ),
  },
  marks: {
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="font-semibold text-gray-900 dark:text-white">
        {children}
      </strong>
    ),
    em: ({ children }: { children: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    code: ({ children }: { children: React.ReactNode }) => (
      <code className="px-1.5 py-0.5 text-sm bg-gray-100 dark:bg-zinc-800 rounded font-mono">
        {children}
      </code>
    ),
    link: ({ value, children }: { value: { href: string }; children: React.ReactNode }) => (
      <a
        href={value.href}
        className="text-primary-600 dark:text-primary-400 underline hover:no-underline"
        target={value.href.startsWith('http') ? '_blank' : undefined}
        rel={value.href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
  },
}

export function ArticleContent({
  content,
  tips,
  videos,
  relatedArticles,
  locale,
  categorySlug,
}: ArticleContentProps) {
  return (
    <div className="space-y-8">
      {/* Main Content */}
      {content && (
        <div className="prose dark:prose-invert max-w-none">
          <PortableText value={content as never} components={portableTextComponents} />
        </div>
      )}

      {/* Tips Section */}
      {tips && tips.length > 0 && (
        <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
            <LightBulbIcon className="h-5 w-5 text-yellow-500" />
            {locale === 'de' ? 'Tipps' : 'Tips'}
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-gray-700 dark:text-zinc-300"
              >
                <span className="text-yellow-500 mt-1">•</span>
                <span>{tip.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Videos Section */}
      {videos && videos.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {locale === 'de' ? 'Video-Tutorials' : 'Video Tutorials'}
          </h3>
          <div className="grid gap-4">
            {videos.map((video, index) => (
              <a
                key={index}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {video.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Articles */}
      {relatedArticles && relatedArticles.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-zinc-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {locale === 'de' ? 'Verwandte Artikel' : 'Related Articles'}
          </h3>
          <ul className="space-y-2">
            {relatedArticles.map((article, index) => (
              <li key={index}>
                <Link
                  href={`/support/${locale}/${article.category?.slug || categorySlug}/${article.slug}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
