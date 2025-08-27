// src/components/editor/CTAExtension.ts
import { Mark, mergeAttributes } from '@tiptap/core'

export interface CTAOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaText: {
      setCTA: () => ReturnType
      toggleCTA: () => ReturnType
      unsetCTA: () => ReturnType
    }
  }
}

export const CTAExtension = Mark.create<CTAOptions>({
  name: 'ctaText',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="cta-text"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'cta-text',
      class: 'cta-text font-bold text-black'
    }), 0]
  },

  addCommands() {
    return {
      setCTA: () => ({ commands }) => {
        return commands.setMark(this.name)
      },
      toggleCTA: () => ({ commands }) => {
        return commands.toggleMark(this.name)
      },
      unsetCTA: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => this.editor.commands.toggleCTA(),
    }
  },
})