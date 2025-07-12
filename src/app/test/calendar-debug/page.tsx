// src/app/test/calendar-debug/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

export default function CalendarDebugPage() {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [allScheduledEmails, setAllScheduledEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!user) {
      alert('Bitte einloggen!');
      return;
    }

    setLoading(true);
    try {
      // 1. Lade ALLE calendar_events (ohne Filter)
      console.log('Loading ALL calendar events...');
      const calendarRef = collection(db, 'calendar_events');
      const calendarSnapshot = await getDocs(calendarRef);
      const calendarData = calendarSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCalendarEvents(calendarData);
      console.log('Found TOTAL calendar events:', calendarData.length);

      // 2. Lade ALLE scheduled_emails (ohne Filter)
      console.log('Loading ALL scheduled emails...');
      const emailsRef = collection(db, 'scheduled_emails');
      const allEmailsSnapshot = await getDocs(emailsRef);
      const allEmailsData = allEmailsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllScheduledEmails(allEmailsData);
      console.log('Found TOTAL scheduled emails:', allEmailsData.length);

      // 3. Filtere nur die für den aktuellen User
      const userEmails = allEmailsData.filter(email => 
        email.userId === user.uid || email.organizationId === user.uid
      );
      setScheduledEmails(userEmails);
      console.log('Found USER scheduled emails:', userEmails.length);

    } catch (error) {
      console.error('Error loading data:', error);
      alert('Fehler: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleString('de-DE');
    }
    return new Date(date).toLocaleString('de-DE');
  };

  const checkFields = (obj: any) => {
    const fields = ['emailContent', 'senderInfo', 'recipients', 'jobId', 'campaignTitle'];
    return fields.map(field => `${field}: ${obj[field] ? '✅' : '❌'}`).join(' | ');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Calendar Debug - Erweitert</h1>
      
      <button 
        onClick={loadData} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px',
          backgroundColor: '#005fab',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Lade...' : 'ALLE Daten laden'}
      </button>

      {/* Übersicht */}
      <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginBottom: '20px' }}>
        <h3>Übersicht</h3>
        <div>Calendar Events GESAMT: {calendarEvents.length}</div>
        <div>Scheduled Emails GESAMT: {allScheduledEmails.length}</div>
        <div>Scheduled Emails für User {user?.uid}: {scheduledEmails.length}</div>
        <div style={{ marginTop: '10px' }}>
          <strong>Neueste Emails (letzte 5):</strong>
          {allScheduledEmails.slice(0, 5).map((email, idx) => (
            <div key={idx} style={{ fontSize: '11px', marginLeft: '20px' }}>
              {email.id} | {formatDate(email.createdAt)} | Felder: {checkFields(email)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Calendar Events */}
        <div style={{ border: '1px solid #ccc', padding: '10px' }}>
          <h2>Calendar Events ({calendarEvents.length})</h2>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {calendarEvents.map((event) => (
              <div key={event.id} style={{ 
                padding: '10px', 
                margin: '5px 0', 
                backgroundColor: event.userId === user?.uid ? '#e8f5e9' : '#f5f5f5',
                border: '1px solid #ddd',
                fontSize: '12px'
              }}>
                <div><strong>ID:</strong> {event.id}</div>
                <div><strong>Title:</strong> {event.title}</div>
                <div><strong>Type:</strong> {event.type}</div>
                <div><strong>Start:</strong> {formatDate(event.startTime)}</div>
                <div><strong>UserId:</strong> {event.userId} {event.userId === user?.uid ? '✅' : '❌'}</div>
                <div><strong>OrgId:</strong> {event.organizationId}</div>
                {event.metadata && (
                  <div>
                    <strong>Metadata:</strong>
                    <pre style={{ fontSize: '10px' }}>{JSON.stringify(event.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Emails */}
        <div style={{ border: '1px solid #ccc', padding: '10px' }}>
          <h2>Scheduled Emails für User ({scheduledEmails.length} von {allScheduledEmails.length})</h2>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {scheduledEmails.map((email) => (
              <div key={email.id} style={{ 
                padding: '10px', 
                margin: '5px 0', 
                backgroundColor: email.calendarEventId ? '#e8f5e9' : '#ffebee',
                border: '1px solid #ddd',
                fontSize: '12px'
              }}>
                <div><strong>ID:</strong> {email.id}</div>
                <div><strong>Job ID:</strong> {email.jobId || '❌ FEHLT'}</div>
                <div><strong>Campaign:</strong> {email.campaignTitle || '❌ FEHLT'}</div>
                <div><strong>Status:</strong> {email.status}</div>
                <div><strong>Scheduled:</strong> {formatDate(email.scheduledAt)}</div>
                <div><strong>CalendarEventId:</strong> {email.calendarEventId || '❌ FEHLT'}</div>
                <div><strong>UserId:</strong> {email.userId}</div>
                <div><strong>OrgId:</strong> {email.organizationId}</div>
                <div style={{ color: 'red' }}>
                  <strong>Felder:</strong> {checkFields(email)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Firestore Direkt-Check */}
      <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Firestore Direkt-Check</h2>
        <button onClick={async () => {
          // Lade die neueste scheduled_email direkt
          const emailsRef = collection(db, 'scheduled_emails');
          const q = query(emailsRef, orderBy('createdAt', 'desc'), limit(1));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            console.log('Neueste scheduled_email:', doc.id);
            console.log('Daten:', data);
            console.log('Hat emailContent?', !!data.emailContent);
            console.log('Hat senderInfo?', !!data.senderInfo);
            console.log('Hat recipients?', !!data.recipients);
            alert('Check Console für Details!');
          }
        }}>
          Neueste Email direkt laden
        </button>
      </div>
    </div>
  );
}