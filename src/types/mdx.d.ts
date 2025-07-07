// src/types/mdx.d.ts
declare module '*.mdx' {
  import type { MDXProps } from 'mdx/types'
  export default function MDXContent(props: MDXProps): JSX.Element
  export const metadata: any
}

// Globale MDX-Typen
declare module 'mdx/types' {
  export type MDXComponents = {
    [key: string]: React.ComponentType<any>
  }
  
  export type MDXProps = {
    components?: MDXComponents
  }
}