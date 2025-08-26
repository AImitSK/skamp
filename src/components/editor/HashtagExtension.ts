// src/components/editor/HashtagExtension.ts
import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface HashtagOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hashtag: {
      /**
       * Setzt den aktuellen Text als Hashtag
       */
      setHashtag: () => ReturnType
      /**
       * Wechselt zwischen Hashtag und normalem Text
       */
      toggleHashtag: () => ReturnType
      /**
       * Entfernt die Hashtag-Markierung
       */
      unsetHashtag: () => ReturnType
    }
  }
}

/**
 * Hashtag Extension für TipTap v2 - Social-Media-optimierte Pressemitteilungen
 * 
 * Features:
 * - Automatische Erkennung von #Text-Mustern (2-50 Zeichen)
 * - Deutsche Umlaute unterstützt (#TechNähe)
 * - Zahlen und Unterstriche erlaubt (#B2B_Marketing)
 * - CeleroPress Design System v2.0 konform
 * - Keyboard-Shortcut: Strg+Shift+H
 */
export const HashtagExtension = Mark.create<HashtagOptions>({
  name: 'hashtag',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="hashtag"]',
      },
      // Automatische Erkennung von #text Mustern
      {
        tag: 'span',
        getAttrs: (node) => {
          if (typeof node === 'string') return false
          const element = node as HTMLElement
          const text = element.textContent || ''
          
          // Prüfe ob es ein Hashtag-Pattern ist
          const hashtagRegex = /^#[a-zA-ZäöüÄÖÜß0-9_]{1,49}$/
          if (hashtagRegex.test(text) && element.getAttribute('data-type') !== 'hashtag') {
            return { 'data-type': 'hashtag' }
          }
          return false
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'hashtag',
      class: 'hashtag text-blue-600 font-semibold cursor-pointer hover:text-blue-800 transition-colors duration-200'
    }), 0]
  },

  addCommands() {
    return {
      setHashtag: () => ({ commands }) => {
        return commands.setMark(this.name)
      },
      toggleHashtag: () => ({ commands }) => {
        return commands.toggleMark(this.name)
      },
      unsetHashtag: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Strg+Shift+H für Hashtag-Toggle
      'Mod-Shift-h': () => this.editor.commands.toggleHashtag(),
    }
  },

  addProseMirrorPlugins() {
    return [
      // Plugin für automatische Hashtag-Erkennung während des Tippens
      new Plugin({
        key: new PluginKey('hashtagAutoDetection'),
        
        props: {
          handleTextInput: (view, from, to, text) => {
            const { state, dispatch } = view
            const { tr, doc } = state
            
            // Prüfe ob ein Leerzeichen eingegeben wurde (Ende eines Wortes)
            if (text === ' ') {
              const $from = doc.resolve(from)
              const textBefore = $from.parent.textContent || ''
              
              // Finde das letzte Wort vor dem Cursor
              const words = textBefore.split(/\s+/)
              const lastWord = words[words.length - 1]
              
              // Hashtag-Pattern: #[Text] (2-50 Zeichen, deutsche Umlaute, Zahlen, Unterstriche)
              const hashtagRegex = /^#[a-zA-ZäöüÄÖÜß0-9_]{1,49}$/
              
              if (hashtagRegex.test(lastWord)) {
                const wordStart = from - lastWord.length
                const wordEnd = from
                
                // Prüfe ob bereits als Hashtag markiert
                const existingMarks = doc.rangeHasMark(wordStart, wordEnd, this.type)
                
                if (!existingMarks) {
                  // Füge Hashtag-Mark hinzu
                  const hashtagMark = this.type.create()
                  tr.addMark(wordStart, wordEnd, hashtagMark)
                  
                  if (tr.docChanged) {
                    dispatch(tr)
                    return true
                  }
                }
              }
            }
            
            return false
          },
          
          // Dekoration für bessere visuelle Feedback während des Tippens
          decorations: (state) => {
            const { doc } = state
            const decorations: Decoration[] = []
            
            // Durchsuche den gesamten Dokumentinhalt nach möglichen Hashtags
            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const text = node.text
                const hashtagRegex = /#[a-zA-ZäöüÄÖÜß0-9_]{1,49}(?=\s|$|[^\w])/g
                
                let match
                while ((match = hashtagRegex.exec(text)) !== null) {
                  const from = pos + match.index
                  const to = from + match[0].length
                  
                  // Prüfe ob bereits als Hashtag markiert
                  if (!doc.rangeHasMark(from, to, this.type)) {
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: 'hashtag-candidate text-blue-500 font-medium'
                      })
                    )
                  }
                }
              }
              return true
            })
            
            return DecorationSet.create(doc, decorations)
          }
        }
      })
    ]
  }
})