// src/app/test/email-scheduling/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { apiClient } from '@/lib/api/api-client';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  CalendarIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/20/solid';
import { Select } from '@/components/select';
import { useAuth } from '@/context/AuthContext';

interface ScheduledEmail {
  id: string;
  jobId: string;
  campaignId: string;
  campaignTitle: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled' | 'processing';
  scheduledAt: Date | { _seconds: number };
  recipients: {
    totalCount: number;
  };
  calendarEventId?: string;
  createdAt: Date | { _seconds: number };
}

interface Stats {
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  processing: number;
  nextScheduled?: Date;
}

// Alert Component - using the same pattern as in campaigns page
function Alert({ 
  type = 'info', 
  title, 
  message, 
  action 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>{message}</Text>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailSchedulingTestPage() {
  const { user } = useAuth();
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      setError('Bitte melden Sie sich an, um diese Seite zu nutzen.');
    }
  }, [user]);

  // Hilfsfunktion zum Konvertieren von Firestore Timestamps
  const convertDate = (date: Date | { _seconds: number } | any): Date => {
    if (date?._seconds) {
      return new Date(date._seconds * 1000);
    }
    if (date?.seconds) {
      return new Date(date.seconds * 1000);
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
    return date instanceof Date ? date : new Date();
  };

  // Hilfsfunktion zum Formatieren von Datum
  const formatDate = (date: Date | any): string => {
    const d = convertDate(date);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Lade geplante Emails
  const loadScheduledEmails = async () => {
    if (!user) {
      setError('Nicht authentifiziert');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading scheduled emails...');
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await apiClient.get(`/api/email/schedule${params}`) as any;
      
      if (response.success) {
        setScheduledEmails(response.emails || []);
        setStats(response.stats || null);
        setSuccess('Geplante Emails erfolgreich geladen');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.error || 'Fehler beim Laden');
      }
    } catch (err: any) {
      console.error('❌ Load error:', err);
      setError(err.message || 'Fehler beim Laden der geplanten Emails');
    } finally {
      setLoading(false);
    }
  };

  // Email stornieren
  const cancelScheduledEmail = async (jobId: string) => {
    if (!confirm('Möchten Sie diesen geplanten Versand wirklich stornieren?')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.delete(`/api/email/schedule?jobId=${jobId}`) as any;
      
      if (response.success) {
        setSuccess('Email-Versand erfolgreich storniert');
        setTimeout(() => setSuccess(null), 3000);
        // Neu laden
        loadScheduledEmails();
      } else {
        throw new Error(response.error || 'Fehler beim Stornieren');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Stornieren des Email-Versands');
    } finally {
      setLoading(false);
    }
  };

  // Test-Email planen (für Demo-Zwecke)
  const scheduleTestEmail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Erstelle Test-Daten
      const scheduledDate = new Date();
      scheduledDate.setMinutes(scheduledDate.getMinutes() + 30); // 30 Minuten in der Zukunft
      
      const testData = {
        campaignId: 'MiyJR0A8XLD7UwkcZ7Ek', // Deine eigene Campaign ID
        emailContent: {
          subject: 'Test Email Scheduling',
          greeting: 'Sehr geehrte Damen und Herren',
          introduction: 'Dies ist eine Test-Email für das Scheduling-System.',
          pressReleaseHtml: '<p>Test Pressemitteilung</p>',
          closing: 'Mit freundlichen Grüßen',
          signature: 'Test Sender'
        },
        senderInfo: {
          name: 'Test Sender',
          title: 'Test Position',
          company: 'Test Company',
          email: 'test@example.com'
        },
        recipients: {
          listIds: ['test-list'],
          listNames: ['Test Liste'],
          manualRecipients: [],
          totalCount: 5
        },
        scheduledDate: scheduledDate.toISOString(),
        timezone: 'Europe/Berlin'
      };
      
      const response = await apiClient.post('/api/email/schedule', testData) as any;
      
      if (response.success) {
        setSuccess(`Test-Email erfolgreich geplant! Job-ID: ${response.jobId}`);
        setTimeout(() => setSuccess(null), 5000);
        // Neu laden
        loadScheduledEmails();
      } else {
        throw new Error(response.error || 'Fehler beim Planen');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Planen der Test-Email');
    } finally {
      setLoading(false);
    }
  };

  // Lade beim Start
  useEffect(() => {
    if (user) {
      loadScheduledEmails();
    }
  }, [statusFilter, user]);

  const getStatusBadge = (status: string) => {
    type BadgeColor = "blue" | "green" | "red" | "zinc" | "yellow" | "orange" | "amber" | "lime" | "emerald" | "teal" | "cyan" | "sky" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose";
    
    const statusMap: Record<string, { color: BadgeColor; icon: React.ElementType; label: string }> = {
      pending: { color: 'blue', icon: ClockIcon, label: 'Ausstehend' },
      sent: { color: 'green', icon: CheckCircleIcon, label: 'Gesendet' },
      failed: { color: 'red', icon: XCircleIcon, label: 'Fehlgeschlagen' },
      cancelled: { color: 'zinc', icon: TrashIcon, label: 'Storniert' },
      processing: { color: 'yellow', icon: ArrowPathIcon, label: 'In Bearbeitung' }
    };
    
    const config = statusMap[status] || statusMap.pending;
    const Icon = config.icon;
    
    return (
      <Badge color={config.color} className="inline-flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <Heading level={2}>Authentifizierung erforderlich</Heading>
          <Text className="mt-2">Bitte melden Sie sich an, um diese Seite zu nutzen.</Text>
          <Button href="/login" className="mt-4">
            Zur Anmeldung
          </Button>
        </div>
      </div>
    );
  }

  if (loading && scheduledEmails.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade geplante Emails...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Heading level={1}>Email Scheduling Test Dashboard</Heading>
        <Text className="mt-2">Teste und überwache geplante Email-Versände</Text>
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="mb-4">
          <Alert type="error" title="Fehler" message={error} />
        </div>
      )}
      
      {success && (
        <div className="mb-4">
          <Alert type="success" title="Erfolg" message={success} />
        </div>
      )}

      {/* Statistiken */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <Text className="text-sm text-gray-600">Ausstehend</Text>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <Text className="text-sm text-gray-600">Gesendet</Text>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <Text className="text-sm text-gray-600">Fehlgeschlagen</Text>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
            <Text className="text-sm text-gray-600">Storniert</Text>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.processing}</div>
            <Text className="text-sm text-gray-600">In Bearbeitung</Text>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <Text className="text-sm font-medium">Nächster Versand</Text>
            <Text className="text-sm text-gray-600">
              {stats.nextScheduled 
                ? formatDate(stats.nextScheduled)
                : 'Keine geplant'
              }
            </Text>
          </div>
        </div>
      )}

      {/* Aktionen */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button plain onClick={loadScheduledEmails}>
          <ArrowPathIcon className={`${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
        
        <Button plain onClick={scheduleTestEmail}>
          <PaperAirplaneIcon />
          Test-Email planen
        </Button>
        
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Alle Status</option>
          <option value="pending">Ausstehend</option>
          <option value="sent">Gesendet</option>
          <option value="failed">Fehlgeschlagen</option>
          <option value="cancelled">Storniert</option>
          <option value="processing">In Bearbeitung</option>
        </Select>
      </div>

      {/* Email-Liste */}
      <div className="bg-white border rounded-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Geplante Email-Versände ({scheduledEmails.length})</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {scheduledEmails.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Keine geplanten Emails gefunden
              </div>
            ) : (
              scheduledEmails.map((email) => (
                <div key={email.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{email.campaignTitle}</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div>Job-ID: <code className="bg-gray-100 px-1 rounded">{email.jobId}</code></div>
                        <div>Campaign-ID: <code className="bg-gray-100 px-1 rounded">{email.campaignId}</code></div>
                        <div>Empfänger: {email.recipients.totalCount}</div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          Geplant für: {formatDate(email.scheduledAt)}
                        </div>
                        <div>
                          Erstellt: {formatDate(email.createdAt)}
                        </div>
                        {email.calendarEventId && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            Kalender-Eintrag: <code className="bg-gray-100 px-1 rounded">{email.calendarEventId}</code>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(email.status)}
                      {email.status === 'pending' && (
                        <Button
                          color="zinc"
                          onClick={() => cancelScheduledEmail(email.jobId)}
                          className="text-sm"
                        >
                          <TrashIcon />
                          Stornieren
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}