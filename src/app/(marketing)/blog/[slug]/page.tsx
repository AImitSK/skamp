import { Button } from '@/components/marketing/Button'
import { Container } from '@/components/marketing/Container'
import { Footer } from '@/components/marketing/Footer'
import { GradientBackground } from '@/components/marketing/gradient'
import { Link } from '@/components/marketing/link'
import { Navbar } from '@/components/marketing/navbar'
import { Heading, Subheading } from '@/components/marketing/text'
import { image } from '@/sanity/image'
import { getPost } from '@/sanity/queries'
import { ChevronLeftIcon } from '@heroicons/react/16/solid'
import dayjs from 'dayjs'
import type { Metadata } from 'next'
import { PortableText } from 'next-sanity'
import { notFound } from 'next/navigation'

// Revalidate alle 60 Sekunden, um Änderungen an Blog-Posts anzuzeigen
export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  let { data: post } = await getPost((await params).slug)

  if (!post) return {}

  // SEO-Daten mit Fallbacks
  const metaTitle = post.seo?.metaTitle || post.title
  const metaDescription = post.seo?.metaDescription || post.excerpt
  const ogTitle = post.seo?.ogTitle || metaTitle
  const ogDescription = post.seo?.ogDescription || metaDescription
  const ogImageUrl = post.seo?.ogImage
    ? image(post.seo.ogImage).width(1200).height(630).url()
    : post.mainImage
    ? image(post.mainImage).width(1200).height(630).url()
    : undefined

  const keywords = post.seo?.metaKeywords?.join(', ')
  const robots = [
    post.seo?.noIndex ? 'noindex' : 'index',
    post.seo?.noFollow ? 'nofollow' : 'follow',
  ].join(', ')

  return {
    title: metaTitle,
    description: metaDescription,
    keywords,
    robots,
    authors: post.author?.name ? [{ name: post.author.name }] : undefined,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: post.seo?.twitterCard || 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  }
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  let { data: post } = await getPost((await params).slug)
  if (!post) notFound()

  return (
    <main className="overflow-hidden">
      <GradientBackground />
      <Container>
        <Navbar />
        <Subheading className="mt-16">
          {dayjs(post.publishedAt).format('dddd, MMMM D, YYYY')}
        </Subheading>
        <Heading as="h1" className="mt-2">
          {post.title}
        </Heading>
        <div className="mt-16 grid grid-cols-1 gap-8 pb-24 lg:grid-cols-[15rem_1fr] xl:grid-cols-[15rem_1fr_15rem]">
          <div className="flex flex-wrap items-center gap-8 max-lg:justify-between lg:flex-col lg:items-start">
            {post.author && (
              <div className="flex items-center gap-3">
                {post.author.image && (
                  <img
                    alt=""
                    src={image(post.author.image).size(64, 64).url()}
                    className="aspect-square size-6 rounded-full object-cover"
                  />
                )}
                <div className="text-sm/5 text-gray-700">
                  {post.author.name}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {Array.isArray(post.categories) && post.categories.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Kategorien
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.categories.map((category: { slug: string; title: string }) => (
                      <Link
                        key={category.slug}
                        href={`/blog?category=${category.slug}`}
                        className="rounded-full border border-dotted border-gray-300 bg-gray-50 px-3 py-1 text-sm/6 font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        {category.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: { slug: string; title: string }) => (
                      <Link
                        key={tag.slug}
                        href={`/blog?tag=${tag.slug}`}
                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        #{tag.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-gray-700">
            <div className="max-w-2xl xl:mx-auto">
              {post.mainImage && (
                <img
                  alt={post.mainImage.alt || ''}
                  src={image(post.mainImage).size(2016, 1344).url()}
                  className="mb-10 aspect-3/2 w-full rounded-2xl object-cover shadow-xl"
                />
              )}
              {post.body && (
                <PortableText
                  value={post.body}
                  components={{
                    block: {
                      normal: ({ children }) => (
                        <p className="my-10 text-base/8 first:mt-0 last:mb-0">
                          {children}
                        </p>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mt-12 mb-10 text-2xl/8 font-medium tracking-tight text-gray-950 first:mt-0 last:mb-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mt-12 mb-10 text-xl/8 font-medium tracking-tight text-gray-950 first:mt-0 last:mb-0">
                          {children}
                        </h3>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="my-10 border-l-2 border-l-gray-300 pl-6 text-base/8 text-gray-950 first:mt-0 last:mb-0">
                          {children}
                        </blockquote>
                      ),
                    },
                    types: {
                      image: ({ value }) => (
                        <img
                          alt={value.alt || ''}
                          src={image(value).width(2000).url()}
                          className="w-full rounded-2xl"
                        />
                      ),
                      separator: ({ value }) => {
                        switch (value.style) {
                          case 'line':
                            return (
                              <hr className="my-8 border-t border-gray-200" />
                            )
                          case 'space':
                            return <div className="my-8" />
                          default:
                            return null
                        }
                      },
                    },
                    list: {
                      bullet: ({ children }) => (
                        <ul className="list-disc pl-4 text-base/8 marker:text-gray-400">
                          {children}
                        </ul>
                      ),
                      number: ({ children }) => (
                        <ol className="list-decimal pl-4 text-base/8 marker:text-gray-400">
                          {children}
                        </ol>
                      ),
                    },
                    listItem: {
                      bullet: ({ children }) => {
                        return (
                          <li className="my-2 pl-2 has-[br]:mb-8">
                            {children}
                          </li>
                        )
                      },
                      number: ({ children }) => {
                        return (
                          <li className="my-2 pl-2 has-[br]:mb-8">
                            {children}
                          </li>
                        )
                      },
                    },
                    marks: {
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-950">
                          {children}
                        </strong>
                      ),
                      code: ({ children }) => (
                        <>
                          <span aria-hidden>`</span>
                          <code className="text-[15px]/8 font-semibold text-gray-950">
                            {children}
                          </code>
                          <span aria-hidden>`</span>
                        </>
                      ),
                      link: ({ value, children }) => {
                        return (
                          <Link
                            href={value.href}
                            className="font-medium text-gray-950 underline decoration-gray-400 underline-offset-4 data-hover:decoration-gray-600"
                          >
                            {children}
                          </Link>
                        )
                      },
                    },
                  }}
                />
              )}
              <div className="mt-10">
                <Button variant="outline" href="/blog">
                  <ChevronLeftIcon className="size-4" />
                  Zurück zum Blog
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
      <Footer />
    </main>
  )
}
