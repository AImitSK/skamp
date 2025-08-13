'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Dynamisch laden um SSR-Probleme zu vermeiden
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });
import 'swagger-ui-react/swagger-ui.css';

export default function APIDocumentation() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Lade OpenAPI Spec
    fetch('/openapi.yaml')
      .then(res => res.text())
      .then(yamlText => {
        // Parse YAML to JSON (vereinfacht - normalerweise würde man js-yaml verwenden)
        setSpec('/openapi.yaml');
      })
      .catch(error => console.error('Fehler beim Laden der OpenAPI Spec:', error));
  }, [user]);

  const requestInterceptor = (req: any) => {
    // Korrigiere URL für API calls - verwende Production Server
    if (req.url && req.url.includes('/api/v1/')) {
      // Wenn es bereits eine vollständige URL ist, lasse sie unverändert
      if (!req.url.startsWith('http')) {
        // Für relative URLs, verwende die Production API
        req.url = `https://skamp.vercel.app${req.url}`;
      }
    }
    
    return req;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link
                href="/dashboard/developer"
                className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Zurück zum Developer Portal
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">API Dokumentation</h1>
                <p className="text-sm text-gray-600">
                  Interaktive OpenAPI 3.0 Dokumentation mit Live-Testing
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/openapi.yaml"
                download
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Download OpenAPI Spec
              </a>
            </div>
          </div>
        </div>
      </div>


      {/* Swagger UI */}
      <div className="swagger-ui-wrapper">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 font-medium mb-2">🔑 API Key für Tests</p>
          <p className="text-blue-700 text-sm">
            Um die API-Endpoints zu testen, klicke auf den grünen <strong>"Authorize"</strong> Button 
            in der Swagger UI unten und gib deinen API Key ein. 
            Du findest deine API Keys unter <strong>Einstellungen → API</strong>.
          </p>
        </div>
        
        {spec && (
          <SwaggerUI
            url={spec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            requestInterceptor={requestInterceptor}
            persistAuthorization={true}
            supportedSubmitMethods={['get', 'post', 'put', 'delete', 'patch']}
          />
        )}
      </div>

      <style jsx global>{`
        .swagger-ui-wrapper {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .swagger-ui .topbar {
          display: none;
        }
        
        .swagger-ui .info {
          margin: 2rem 0;
        }
        
        .swagger-ui .scheme-container {
          background: #f7fafc;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        
        .swagger-ui .btn {
          border-radius: 0.375rem;
        }
        
        .swagger-ui .btn.authorize {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        
        .swagger-ui .btn.authorize:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        
        .swagger-ui .btn.execute {
          background-color: #10b981;
          border-color: #10b981;
        }
        
        .swagger-ui .btn.execute:hover {
          background-color: #059669;
          border-color: #059669;
        }
        
        .swagger-ui select {
          border-radius: 0.375rem;
          border: 1px solid #d1d5db;
        }
        
        .swagger-ui .opblock.opblock-get .opblock-summary {
          border-color: #3b82f6;
        }
        
        .swagger-ui .opblock.opblock-post .opblock-summary {
          border-color: #10b981;
        }
        
        .swagger-ui .opblock.opblock-put .opblock-summary {
          border-color: #f59e0b;
        }
        
        .swagger-ui .opblock.opblock-delete .opblock-summary {
          border-color: #ef4444;
        }
      `}</style>
    </div>
  );
}