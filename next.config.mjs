// next.config.mjs
import createMDX from '@next/mdx'

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

// Merge MDX config with Next.js config
export default withMDX(nextConfig)