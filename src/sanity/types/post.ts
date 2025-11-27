import { DocumentIcon } from '@heroicons/react/16/solid'
import { groq } from 'next-sanity'
import { defineField, defineType } from 'sanity'
import { apiVersion } from '../env'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: 'title',
      },
      validation: (Rule) =>
        Rule.required().error('A slug is required for the post URL.'),
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      validation: (Rule) =>
        Rule.required().error(
          'A publication date is required for ordering posts.',
        ),
    }),
    defineField({
      name: 'isFeatured',
      type: 'boolean',
      initialValue: false,
      validation: (Rule) =>
        Rule.custom(async (isFeatured, { getClient }) => {
          if (isFeatured !== true) {
            return true
          }

          let featuredPosts = await getClient({ apiVersion })
            .withConfig({ perspective: 'previewDrafts' })
            .fetch<number>(
              groq`count(*[_type == 'post' && isFeatured == true])`,
            )

          return featuredPosts > 3
            ? 'Only 3 posts can be featured at a time.'
            : true
        }),
    }),
    defineField({
      name: 'author',
      type: 'reference',
      to: { type: 'author' },
    }),
    defineField({
      name: 'mainImage',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
        },
      ],
    }),
    defineField({
      name: 'categories',
      title: 'Kategorien',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'category' } }],
      description: 'Primäre Kategorien (max. 2-3 empfohlen)',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'tag' } }],
      description: 'Spezifische Tags für bessere Auffindbarkeit und SEO',
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body',
      type: 'blockContent',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      description: 'Suchmaschinenoptimierung - überschreibt Standard-Werte',
      options: {
        collapsible: true,
        collapsed: false,
      },
      fields: [
        {
          name: 'metaTitle',
          title: 'SEO Titel',
          type: 'string',
          description: 'Überschreibt den Post-Titel für Suchmaschinen (max. 60 Zeichen empfohlen)',
          validation: (Rule) => Rule.max(60).warning('SEO-Titel sollten unter 60 Zeichen sein'),
        },
        {
          name: 'metaDescription',
          title: 'Meta-Beschreibung',
          type: 'text',
          rows: 3,
          description: 'Überschreibt den Excerpt für Suchmaschinen (max. 160 Zeichen empfohlen)',
          validation: (Rule) => Rule.max(160).warning('Meta-Beschreibungen sollten unter 160 Zeichen sein'),
        },
        {
          name: 'metaKeywords',
          title: 'Keywords/Tags',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'SEO-Keywords für diesen Post',
          options: {
            layout: 'tags',
          },
        },
        {
          name: 'ogImage',
          title: 'Open Graph Bild',
          type: 'image',
          description: 'Bild für Social Media (Facebook, LinkedIn). Falls leer, wird das Haupt-Bild verwendet.',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alternative text',
            },
          ],
        },
        {
          name: 'ogTitle',
          title: 'Open Graph Titel',
          type: 'string',
          description: 'Titel für Social Media Shares. Falls leer, wird der SEO-Titel oder Post-Titel verwendet.',
        },
        {
          name: 'ogDescription',
          title: 'Open Graph Beschreibung',
          type: 'text',
          rows: 2,
          description: 'Beschreibung für Social Media Shares. Falls leer, wird Meta-Beschreibung oder Excerpt verwendet.',
        },
        {
          name: 'twitterCard',
          title: 'Twitter Card Typ',
          type: 'string',
          options: {
            list: [
              { title: 'Summary', value: 'summary' },
              { title: 'Summary Large Image', value: 'summary_large_image' },
            ],
            layout: 'radio',
          },
          initialValue: 'summary_large_image',
        },
        {
          name: 'noIndex',
          title: 'Nicht indexieren',
          type: 'boolean',
          description: 'Verhindert, dass Suchmaschinen diesen Post indexieren',
          initialValue: false,
        },
        {
          name: 'noFollow',
          title: 'Links nicht folgen',
          type: 'boolean',
          description: 'Verhindert, dass Suchmaschinen Links in diesem Post folgen',
          initialValue: false,
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      author: 'author.name',
      isFeatured: 'isFeatured',
    },
    prepare({ title, author, media, isFeatured }) {
      return {
        title,
        subtitle: [isFeatured && 'Featured', author && `By ${author}`]
          .filter(Boolean)
          .join(' | '),
        media,
      }
    },
  },
  orderings: [
    {
      name: 'isFeaturedAndPublishedAtDesc',
      title: 'Featured & Latest Published',
      by: [
        { field: 'isFeatured', direction: 'desc' },
        { field: 'publishedAt', direction: 'desc' },
      ],
    },
  ],
})
