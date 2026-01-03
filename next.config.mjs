// next.config.mjs
import createMDX from '@next/mdx'
import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  // Optionally, add any other Next.js config below

  // Temporarily ignore TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Subdomain Routing: support.celeropress.com → /support
  // Wichtig: _next, api und statische Assets ausschließen
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)',
          has: [{ type: 'host', value: 'support.celeropress.com' }],
          destination: '/support/:path*',
        },
      ],
    }
  },

  // Webpack Config für Genkit/Node.js Kompatibilität
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-Bundle: Externalize Node.js native modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http2: false,
        stream: false,
        crypto: false,
        path: false,
        os: false,
        child_process: false,
      };

      // Externalize problematische Packages komplett
      config.externals = config.externals || [];
      config.externals.push({
        '@google/generative-ai': 'commonjs @google/generative-ai',
        '@genkit-ai/google-genai': 'commonjs @genkit-ai/google-genai',
        '@genkit-ai/core': 'commonjs @genkit-ai/core',
        'genkit': 'commonjs genkit',
        '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
        '@opentelemetry/sdk-node': 'commonjs @opentelemetry/sdk-node',
        '@opentelemetry/exporter-trace-otlp-grpc': 'commonjs @opentelemetry/exporter-trace-otlp-grpc',
      });
    }

    return config;
  },
}

const withMDX = createMDX({
  // Add markdown plugins here, as desired
})

// next-intl Plugin mit Pfad zur Request-Konfiguration
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// Merge MDX config mit Next.js config, dann next-intl
export default withNextIntl(withMDX(nextConfig))