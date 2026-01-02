'use client'

import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import type { StructureBuilder } from 'sanity/structure'
import { apiVersion, dataset, projectId } from './src/sanity/env'
import { schema } from './src/sanity/schema'

const structure = (S: StructureBuilder) =>
  S.list()
    .title('Inhalt')
    .items([
      // === BLOG ===
      S.listItem()
        .title('Blog')
        .child(
          S.list()
            .title('Blog')
            .items([
              S.documentTypeListItem('post').title('Beiträge'),
              S.documentTypeListItem('category').title('Kategorien'),
              S.documentTypeListItem('tag').title('Tags'),
              S.documentTypeListItem('author').title('Autoren'),
            ]),
        ),
      S.divider(),
      // === HILFE-CENTER ===
      S.listItem()
        .title('Hilfe-Center')
        .child(
          S.list()
            .title('Hilfe-Center')
            .items([
              S.documentTypeListItem('helpCategory').title('Kategorien'),
              S.documentTypeListItem('helpArticle').title('Artikel'),
              S.documentTypeListItem('helpPageMapping').title('Seiten-Zuordnung'),
            ]),
        ),
    ])

export default defineConfig({
  name: 'CeleroPress',
  title: 'CeleroPress CMS',
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
})
