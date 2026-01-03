'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'

interface SupportContextType {
  basePath: string
  buildPath: (path: string) => string
  isSubdomain: boolean
}

const SupportContext = createContext<SupportContextType>({
  basePath: '/support',
  buildPath: (path) => `/support${path}`,
  isSubdomain: false,
})

export function SupportProvider({ children }: { children: ReactNode }) {
  const [isSubdomain, setIsSubdomain] = useState(false)

  useEffect(() => {
    // Prüfe ob wir auf der Subdomain sind
    const hostname = window.location.hostname
    setIsSubdomain(hostname === 'support.celeropress.com')
  }, [])

  const basePath = isSubdomain ? '' : '/support'

  const buildPath = (path: string) => {
    // path sollte ohne /support beginnen, z.B. "/de/kategorie"
    return `${basePath}${path}`
  }

  return (
    <SupportContext.Provider value={{ basePath, buildPath, isSubdomain }}>
      {children}
    </SupportContext.Provider>
  )
}

export function useSupportPath() {
  return useContext(SupportContext)
}

// Convenience-Komponente für Support-Links
interface SupportLinkProps {
  href: string // Pfad ohne /support, z.B. "/de/kategorie"
  children: React.ReactNode
  className?: string
}

export function SupportLink({ href, children, className }: SupportLinkProps) {
  const { buildPath } = useSupportPath()
  return (
    <Link href={buildPath(href)} className={className}>
      {children}
    </Link>
  )
}
