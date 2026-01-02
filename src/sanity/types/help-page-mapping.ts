import { LinkIcon } from '@heroicons/react/16/solid'
import { defineField, defineType } from 'sanity'

export const helpPageMappingType = defineType({
  name: 'helpPageMapping',
  title: 'Seiten-Zuordnung',
  type: 'document',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'pageName',
      title: 'Seiten-Name',
      type: 'string',
      description: 'Interner Name zur Identifikation (z.B. "CRM - Verlage")',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'routes',
      title: 'App-Routen',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'z.B. /dashboard/projects, /dashboard/projects/[id]/* - Wildcard * am Ende für Unterseiten',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'mainArticle',
      title: 'Haupt-Artikel',
      type: 'reference',
      to: [{ type: 'helpArticle' }],
      description: 'Wird im Panel als FAQ angezeigt',
    }),
    defineField({
      name: 'quickTips',
      title: 'Quick-Tipps',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'tip',
              title: 'Tipp (DE)',
              type: 'string',
            },
            {
              name: 'tipEn',
              title: 'Tip (EN)',
              type: 'string',
            },
          ],
          preview: {
            select: { title: 'tip' },
          },
        },
      ],
      description: 'Kurze Tipps speziell für diese Seite',
    }),
    defineField({
      name: 'featureVideo',
      title: 'Feature-Video',
      type: 'object',
      fields: [
        {
          name: 'title',
          title: 'Titel (DE)',
          type: 'string',
        },
        {
          name: 'titleEn',
          title: 'Title (EN)',
          type: 'string',
        },
        {
          name: 'url',
          title: 'Video-URL',
          type: 'url',
        },
        {
          name: 'thumbnailUrl',
          title: 'Thumbnail-URL',
          type: 'url',
        },
      ],
    }),
    defineField({
      name: 'additionalArticles',
      title: 'Weitere Artikel',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'helpArticle' }] }],
      description: 'Zusätzliche relevante Artikel für diese Seite',
    }),
  ],
  preview: {
    select: {
      title: 'pageName',
      routes: 'routes',
      mainArticle: 'mainArticle.title',
    },
    prepare({ title, routes, mainArticle }) {
      return {
        title,
        subtitle: `${routes?.[0] || 'Keine Route'} ${mainArticle ? `→ ${mainArticle}` : ''}`,
      }
    },
  },
  orderings: [
    {
      name: 'pageNameAsc',
      title: 'Seiten-Name A-Z',
      by: [{ field: 'pageName', direction: 'asc' }],
    },
  ],
})
