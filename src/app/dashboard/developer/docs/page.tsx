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
  const [apiKey, setApiKey] = useState<string>('');
  const [spec, setSpec] = useState<any>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

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
    // Füge Authorization Header hinzu wenn API Key vorhanden
    if (apiKey) {
      req.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    // Setze Base URL für API calls, aber nicht für OpenAPI spec
    if (req.url.startsWith('/') && !req.url.includes('openapi.yaml')) {
      req.url = `${window.location.origin}/api${req.url}`;
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
              {/* API Key Status */}
              <div className="flex items-center space-x-3">
                {apiKey ? (
                  <div className="text-sm">
                    <span className="text-gray-600">API Key: </span>
                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded">
                      {apiKey.substring(0, 15)}...
                    </code>
                    <button
                      onClick={() => setApiKey('')}
                      className="ml-2 text-xs text-red-600 hover:text-red-500"
                    >
                      Entfernen
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowApiKeyInput(true)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                  >
                    API Key eingeben
                  </button>
                )}
              </div>
              
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

      {/* API Key Input Modal */}
      {showApiKeyInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-lg font-semibold mb-4">API Key eingeben</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Gib deinen CeleroPress API Key ein, um die interaktiven Tests zu nutzen. 
              Du findest deine API Keys unter <strong>Einstellungen → API</strong>.
            </p>
            <input
              type="password"
              placeholder="cp_test_... oder cp_live_..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    setApiKey(value);
                    setShowApiKeyInput(false);
                  }
                }
              }}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-4 py-2 text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                  const value = input?.value.trim();
                  if (value) {
                    setApiKey(value);
                    setShowApiKeyInput(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-md px-4 py-2 text-sm font-medium"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swagger UI */}
      <div className="swagger-ui-wrapper">
        {!apiKey && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium mb-2">⚠️ API Key erforderlich</p>
            <p className="text-yellow-700 text-sm">
              Um die API-Endpoints zu testen, musst du zunächst einen API Key eingeben. 
              Klicke auf "API Key eingeben" oben rechts.
            </p>
          </div>
        )}
        
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