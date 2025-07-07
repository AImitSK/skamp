// src/mdx-components.tsx

import type { MDXComponents } from 'mdx/types'

// Diese Funktion teilt Next.js mit, wie es Standard-HTML-Tags
// aus deinem Markdown rendern soll.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Hier könntest du Standard-Tags überschreiben, z.B. um allen Bildern
    // einen Rahmen zu geben. Fürs Erste lassen wir es aber so.
    ...components,
  }
}