import type { SchemaTypeDefinition } from 'sanity'

import { authorType } from './types/author'
import { blockContentType } from './types/block-content'
import { categoryType } from './types/category'
import { postType } from './types/post'
import { tagType } from './types/tag'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [blockContentType, postType, categoryType, tagType, authorType],
}
