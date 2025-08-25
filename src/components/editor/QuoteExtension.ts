// src/components/editor/QuoteExtension.ts
import { Node, mergeAttributes } from '@tiptap/core'

export interface QuoteOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    quote: {
      setQuote: () => ReturnType
      toggleQuote: () => ReturnType
      unsetQuote: () => ReturnType
    }
  }
}

export const QuoteExtension = Node.create<QuoteOptions>({
  name: 'quote',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  content: 'inline*',

  parseHTML() {
    return [
      {
        tag: 'blockquote[data-type="pr-quote"]',
      },
      {
        tag: 'blockquote',
        getAttrs: (node) => {
          // Akzeptiere auch normale blockquotes ohne data-type
          return {}
        }
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'pr-quote',
      class: 'pr-quote border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4'
    }), 0]
  },

  addCommands() {
    return {
      setQuote: () => ({ commands }) => {
        return commands.setNode(this.name)
      },
      toggleQuote: () => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph')
      },
      unsetQuote: () => ({ commands }) => {
        return commands.setNode('paragraph')
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-q': () => this.editor.commands.toggleQuote(),
    }
  },
})