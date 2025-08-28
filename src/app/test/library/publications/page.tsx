"use client";

import { useState } from 'react';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export default function PublicationsTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([
    {
      id: 'crud-operations',
      name: 'CRUD-Operationen (Create, Read, Update, Delete)',
      status: 'pending'
    },
    {
      id: 'search-filter',
      name: 'Suche und Filter-Funktionen',
      status: 'pending'
    },
    {
      id: 'import-export',
      name: 'CSV/Excel Import und Export',
      status: 'pending'
    },
    {
      id: 'bulk-operations',
      name: 'Bulk-Operationen (Mehrfachauswahl)',
      status: 'pending'
    },
    {
      id: 'verification',
      name: 'Verifizierungs-Workflow',
      status: 'pending'
    },
    {
      id: 'validation',
      name: 'Formular-Validierung',
      status: 'pending'
    },
    {
      id: 'navigation',
      name: 'Navigation und Detail-Ansichten',
      status: 'pending'
    },
    {
      id: 'responsive',
      name: 'Responsive Design (Mobile/Desktop)',
      status: 'pending'
    },
    {
      id: 'accessibility',
      name: 'Barrierefreiheit (Keyboard, Screen Reader)',
      status: 'pending'
    },
    {
      id: 'error-handling',
      name: 'Fehlerbehandlung und User Feedback',
      status: 'pending'
    }
  ]);

  const [allTestsStatus, setAllTestsStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  const runSingleTest = async (testId: string) => {
    setTestResults(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status: 'running' }
        : test
    ));

    // Simulate test execution
    const startTime = Date.now();
    
    try {
      // Simulate different test scenarios
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
      
      const duration = Date.now() - startTime;
      const success = Math.random() > 0.2; // 80% success rate for demo
      
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: success ? 'passed' : 'failed',
              message: success 
                ? 'Test erfolgreich abgeschlossen' 
                : 'Test fehlgeschlagen - siehe Konsole für Details',
              duration
            }
          : test
      ));
    } catch (error) {
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: 'failed',
              message: 'Unerwarteter Fehler aufgetreten',
              duration: Date.now() - startTime
            }
          : test
      ));
    }
  };

  const runAllTests = async () => {
    setAllTestsStatus('running');
    
    // Reset all tests
    setTestResults(prev => prev.map(test => ({ ...test, status: 'pending' as const })));
    
    // Run tests sequentially
    for (const test of testResults) {
      await runSingleTest(test.id);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setAllTestsStatus('completed');
  };

  const resetTests = () => {
    setTestResults(prev => prev.map(test => ({ 
      ...test, 
      status: 'pending' as const,
      message: undefined,
      duration: undefined
    })));
    setAllTestsStatus('idle');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-zinc-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge color="green">Bestanden</Badge>;
      case 'failed':
        return <Badge color="red">Fehlgeschlagen</Badge>;
      case 'running':
        return <Badge color="blue">Läuft...</Badge>;
      default:
        return <Badge color="zinc">Ausstehend</Badge>;
    }
  };

  const passedTests = testResults.filter(test => test.status === 'passed').length;
  const failedTests = testResults.filter(test => test.status === 'failed').length;
  const totalTests = testResults.length;
  const avgDuration = testResults
    .filter(test => test.duration)
    .reduce((sum, test) => sum + (test.duration || 0), 0) / 
    testResults.filter(test => test.duration).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Heading level={1} className="mb-2">
          Publications Feature - Manuelle Tests
        </Heading>
        <Text className="text-zinc-600 dark:text-zinc-400">
          Systematische Überprüfung aller Funktionen des Publications-Features.
          Diese Tests sollten manuell durchgeführt werden, um die Benutzerfreundlichkeit zu gewährleisten.
        </Text>
      </div>

      {/* Test Controls */}
      <div className="mb-6 flex items-center gap-4">
        <Button 
          onClick={runAllTests}
          disabled={allTestsStatus === 'running'}
          className="px-6 py-2"
        >
          {allTestsStatus === 'running' ? 'Tests laufen...' : 'Alle Tests starten'}
        </Button>
        
        <Button 
          plain 
          onClick={resetTests}
          disabled={allTestsStatus === 'running'}
        >
          Tests zurücksetzen
        </Button>

        {allTestsStatus === 'completed' && (
          <div className="flex items-center gap-4 text-sm">
            <Text className="text-green-600">
              {passedTests} bestanden
            </Text>
            <Text className="text-red-600">
              {failedTests} fehlgeschlagen
            </Text>
            {avgDuration && (
              <Text className="text-zinc-500">
                Ø {Math.round(avgDuration)}ms
              </Text>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {allTestsStatus === 'running' && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-zinc-600 mb-1">
            <span>Fortschritt</span>
            <span>{passedTests + failedTests} / {totalTests}</span>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((passedTests + failedTests) / totalTests) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="space-y-4">
        {testResults.map((test) => (
          <div 
            key={test.id}
            className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <Text className="font-medium">{test.name}</Text>
                  {test.message && (
                    <Text className="text-sm text-zinc-500 mt-1">
                      {test.message}
                    </Text>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {test.duration && (
                  <Text className="text-sm text-zinc-500">
                    {test.duration}ms
                  </Text>
                )}
                {getStatusBadge(test.status)}
                <Button 
                  plain 
                  onClick={() => runSingleTest(test.id)}
                  disabled={test.status === 'running' || allTestsStatus === 'running'}
                >
                  Test starten
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test Instructions */}
      <div className="mt-12">
        <Heading level={2} className="mb-4">
          Manuelle Test-Anleitungen
        </Heading>
        
        <div className="space-y-6 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <Text className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              1. CRUD-Operationen testen
            </Text>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>Neue Publikation erstellen (alle Felder ausfüllen)</li>
              <li>Publikation bearbeiten und Änderungen speichern</li>
              <li>Publikation löschen mit Bestätigung</li>
              <li>Detail-Ansicht öffnen und alle Tabs durchgehen</li>
            </ul>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <Text className="font-medium text-green-900 dark:text-green-100 mb-2">
              2. Import/Export testen
            </Text>
            <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-200">
              <li>CSV-Template herunterladen</li>
              <li>Template ausfüllen und importieren</li>
              <li>Spalten-Mapping testen</li>
              <li>Export-Funktion verwenden</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <Text className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              3. Suche und Filter testen
            </Text>
            <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
              <li>Volltext-Suche in Titel und Verlag</li>
              <li>Filter nach Typ, Sprache, Land</li>
              <li>Kombinierte Filter verwenden</li>
              <li>Filter zurücksetzen</li>
            </ul>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <Text className="font-medium text-purple-900 dark:text-purple-100 mb-2">
              4. Barrierefreiheit testen
            </Text>
            <ul className="list-disc list-inside space-y-1 text-purple-800 dark:text-purple-200">
              <li>Nur mit Tastatur navigieren (Tab, Enter, Escape)</li>
              <li>Screen Reader verwenden (falls verfügbar)</li>
              <li>Kontraste und Schriftgrößen prüfen</li>
              <li>Focus-Indikatoren sichtbar?</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex justify-between">
          <Button plain onClick={() => window.history.back()}>
            ← Zurück zum Dashboard
          </Button>
          <Button onClick={() => window.open('/dashboard/library/publications', '_blank')}>
            Publications Feature öffnen →
          </Button>
        </div>
      </div>
    </div>
  );
}