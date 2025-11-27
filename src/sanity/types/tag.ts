import { TagIcon } from '@heroicons/react/24/outline'
import { defineField, defineType } from 'sanity'

export const tagType = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  icon: TagIcon,
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
        Rule.required().error('Ein Slug ist erforderlich für die Tag-URL.'),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 2,
      description: 'Optionale Beschreibung für SEO',
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
    prepare({ title }) {
      return {
        title,
        subtitle: 'Tag',
      }
    },
  },
})
