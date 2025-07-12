// src/app/test/scheduled-emails/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api/api-client';

export default function ScheduledEmailsViewer() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  const loadEmails = async () => {
    if (!user) {
      alert('Bitte einloggen!');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get('/api/email/schedule') as any;
      if (response.emails) {
        setEmails(response.emails);
      }
    } catch (error) {
      console.error('Fehler:', error);
      alert('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('de-DE');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Scheduled Emails Viewer</h1>
      
      <button 
        onClick={loadEmails} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px',
          backgroundColor: '#005fab',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Lade...' : 'Emails laden'}
      </button>

      <div style={{ marginTop: '20px' }}>
        <h2>Gefundene Emails: {emails.length}</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          {/* Liste */}
          <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px', maxHeight: '600px', overflow: 'auto' }}>
            <h3>Email Liste</h3>
            {emails.map((email, index) => (
              <div 
                key={email.id || index}
                onClick={() => setSelectedEmail(email)}
                style={{ 
                  padding: '10px', 
                  margin: '5px 0', 
                  backgroundColor: selectedEmail?.id === email.id ? '#e0e0e0' : '#f5f5f5',
                  cursor: 'pointer',
                  border: '1px solid #ddd'
                }}
              >
                <div><strong>ID:</strong> {email.id}</div>
                <div><strong>Job ID:</strong> {email.jobId}</div>
                <div><strong>Kampagne:</strong> {email.campaignTitle}</div>
                <div><strong>Status:</strong> {email.status}</div>
                <div><strong>Geplant für:</strong> {formatDate(email.scheduledAt)}</div>
                <div><strong>Empfänger:</strong> {email.recipients?.totalCount || 0}</div>
                <div style={{ marginTop: '5px' }}>
                  <strong>Felder vorhanden:</strong>
                  <div>emailContent: {email.emailContent ? '✅' : '❌'}</div>
                  <div>senderInfo: {email.senderInfo ? '✅' : '❌'}</div>
                  <div>recipients: {email.recipients ? '✅' : '❌'}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px', maxHeight: '600px', overflow: 'auto' }}>
            <h3>Details</h3>
            {selectedEmail ? (
              <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selectedEmail, null, 2)}
              </pre>
            ) : (
              <p>Wähle eine Email aus der Liste</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}