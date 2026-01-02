import type { SchemaTypeDefinition } from 'sanity'

import { authorType } from './types/author'
import { blockContentType } from './types/block-content'
import { categoryType } from './types/category'
import { helpArticleType } from './types/help-article'
import { helpCategoryType } from './types/help-category'
import { helpPageMappingType } from './types/help-page-mapping'
import { postType } from './types/post'
import { tagType } from './types/tag'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Content Types
    blockContentType,
    // Blog
    postType,
    categoryType,
    tagType,
    authorType,
    // Help Center
    helpCategoryType,
    helpArticleType,
    helpPageMappingType,
  ],
}
