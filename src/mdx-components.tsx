// src/mdx-components.tsx
import type { MDXComponents } from 'mdx/types'
import Link from 'next/link'

// Diese Funktion teilt Next.js mit, wie es Standard-HTML-Tags
// aus deinem Markdown rendern soll.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Überschreibe Standard-HTML-Elemente mit eigenen Styles
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-gray-700 mt-6 mb-3">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-600 leading-relaxed mb-4">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-gray-600 mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-gray-600">{children}</li>
    ),
    // Links mit Next.js Link-Komponente
    a: ({ href, children }) => {
      const isInternal = href && (href.startsWith('/') || href.startsWith('#'))
      
      if (isInternal) {
        return (
          <Link href={href} className="text-blue-600 hover:text-blue-800 underline">
            {children}
          </Link>
        )
      }
      
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
          {children}
        </a>
      )
    },
    // Code-Blöcke mit schönem Styling
    pre: ({ children }) => (
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 font-mono text-sm">
        {children}
      </code>
    ),
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">
        {children}
      </blockquote>
    ),
    // Horizontale Linie
    hr: () => <hr className="border-gray-200 my-8" />,
    
    // Behalte alle anderen Komponenten bei
    ...components,
  }
}