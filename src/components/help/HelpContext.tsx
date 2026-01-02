'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'

interface HelpArticle {
  _id: string
  title: string
  slug: string
  excerpt: string
  tips?: { text: string }[]
  category: { title: string; slug: string }
}

interface HelpContent {
  pageName: string
  mainArticle: HelpArticle | null
  quickTips: { text: string }[]
  featureVideo: {
    title: string
    url: string
    thumbnailUrl?: string
  } | null
  additionalArticles?: HelpArticle[]
}

interface HelpContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  content: HelpContent | null
  loading: boolean
}

const HelpContext = createContext<HelpContextType | null>(null)

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState<HelpContent | null>(null)
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const locale = useLocale()

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // Lade Hilfe-Content wenn sich die Route ändert
  useEffect(() => {
    async function loadHelpContent() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/help?route=${encodeURIComponent(pathname)}&locale=${locale}`,
        )
        if (res.ok) {
          const data = await res.json()
          setContent(data)
        } else {
          setContent(null)
        }
      } catch (error) {
        console.error('Failed to load help content:', error)
        setContent(null)
      } finally {
        setLoading(false)
      }
    }

    loadHelpContent()
  }, [pathname, locale])

  // Keyboard Shortcuts (F1 oder ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoriere wenn in einem Input/Textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === 'F1') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, toggle, close])

  return (
    <HelpContext.Provider
      value={{
        isOpen,
        open,
        close,
        toggle,
        content,
        loading,
      }}
    >
      {children}
    </HelpContext.Provider>
  )
}

export function useHelp() {
  const context = useContext(HelpContext)
  if (!context) {
    throw new Error('useHelp must be used within HelpProvider')
  }
  return context
}
