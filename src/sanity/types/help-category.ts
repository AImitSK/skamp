import { FolderIcon } from '@heroicons/react/16/solid'
import { defineField, defineType } from 'sanity'

export const helpCategoryType = defineType({
  name: 'helpCategory',
  title: 'Hilfe-Kategorie',
  type: 'document',
  icon: FolderIcon,
  fields: [
    // === DEUTSCH ===
    defineField({
      name: 'title',
      title: 'Titel',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Beschreibung',
      type: 'text',
      rows: 2,
    }),
    // === ENGLISCH ===
    defineField({
      name: 'titleEn',
      title: 'Title (English)',
      type: 'string',
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Description (English)',
      type: 'text',
      rows: 2,
    }),
    // === META ===
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'string',
      description: 'Heroicon Name (z.B. "RocketLaunchIcon", "UserGroupIcon")',
    }),
    defineField({
      name: 'order',
      title: 'Sortierung',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'appSection',
      title: 'App-Bereich',
      type: 'string',
      options: {
        list: [
          { title: 'Erste Schritte', value: 'onboarding' },
          { title: 'CRM', value: 'crm' },
          { title: 'Bibliothek', value: 'library' },
          { title: 'Projekte', value: 'projects' },
          { title: 'Analytics', value: 'analytics' },
          { title: 'Kommunikation', value: 'communication' },
          { title: 'Einstellungen', value: 'settings' },
          { title: 'Account', value: 'account' },
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      icon: 'icon',
      order: 'order',
    },
    prepare({ title, icon, order }) {
      return {
        title,
        subtitle: `${order ?? 0} | ${icon || 'Kein Icon'}`,
      }
    },
  },
  orderings: [
    {
      name: 'orderAsc',
      title: 'Sortierung',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
})
