import { DocumentTextIcon } from '@heroicons/react/16/solid'
import { defineField, defineType } from 'sanity'

export const helpArticleType = defineType({
  name: 'helpArticle',
  title: 'Hilfe-Artikel',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    { name: 'german', title: 'Deutsch', default: true },
    { name: 'english', title: 'English' },
    { name: 'meta', title: 'Meta' },
    { name: 'extras', title: 'Extras' },
  ],
  fields: [
    // === DEUTSCH ===
    defineField({
      name: 'title',
      title: 'Titel',
      type: 'string',
      group: 'german',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Kurzbeschreibung',
      type: 'text',
      rows: 2,
      group: 'german',
      description: 'Für Suchergebnisse und Vorschau',
    }),
    defineField({
      name: 'content',
      title: 'Inhalt',
      type: 'blockContent',
      group: 'german',
    }),
    // === ENGLISCH ===
    defineField({
      name: 'titleEn',
      title: 'Title',
      type: 'string',
      group: 'english',
    }),
    defineField({
      name: 'excerptEn',
      title: 'Short Description',
      type: 'text',
      rows: 2,
      group: 'english',
    }),
    defineField({
      name: 'contentEn',
      title: 'Content',
      type: 'blockContent',
      group: 'english',
    }),
    // === META ===
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Kategorie',
      type: 'reference',
      to: [{ type: 'helpCategory' }],
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'onboardingStep',
      title: 'Onboarding-Schritt',
      type: 'string',
      group: 'meta',
      description: 'Nur für Erste Schritte: z.B. "1.1", "1.2", "2.1"',
    }),
    defineField({
      name: 'keywords',
      title: 'Suchbegriffe',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      group: 'meta',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Veröffentlicht am',
      type: 'datetime',
      group: 'meta',
    }),
    defineField({
      name: 'updatedAt',
      title: 'Aktualisiert am',
      type: 'datetime',
      group: 'meta',
    }),
    // === EXTRAS ===
    defineField({
      name: 'tips',
      title: 'Tipps',
      type: 'array',
      group: 'extras',
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
    }),
    defineField({
      name: 'videos',
      title: 'Videos',
      type: 'array',
      group: 'extras',
      of: [
        {
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
              title: 'Video-URL (YouTube/Vimeo)',
              type: 'url',
            },
            {
              name: 'duration',
              title: 'Dauer (Minuten)',
              type: 'number',
            },
          ],
          preview: {
            select: { title: 'title', duration: 'duration' },
            prepare({ title, duration }) {
              return {
                title,
                subtitle: duration ? `${duration} Min` : '',
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'relatedArticles',
      title: 'Verwandte Artikel',
      type: 'array',
      group: 'extras',
      of: [{ type: 'reference', to: [{ type: 'helpArticle' }] }],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category.title',
      step: 'onboardingStep',
    },
    prepare({ title, category, step }) {
      return {
        title: step ? `${step} - ${title}` : title,
        subtitle: category,
      }
    },
  },
  orderings: [
    {
      name: 'onboardingStepAsc',
      title: 'Onboarding-Schritt',
      by: [{ field: 'onboardingStep', direction: 'asc' }],
    },
    {
      name: 'titleAsc',
      title: 'Titel A-Z',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
