// src/app/api/webhooks/sendgrid/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client-init';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'deferred' | 'processed' | 'spam_report' | 'unsubscribe';
  sg_message_id: string;
  campaignId?: string;
  url?: string;
  reason?: string;
  status?: string;
}

export async function POST(request: NextRequest) {
  try {
    const events: SendGridEvent[] = await request.json();

    console.log('📨 Received SendGrid webhook events:', events.length);

    for (const event of events) {
      console.log('🔔 Processing event:', {
        type: event.event,
        email: event.email,
        messageId: event.sg_message_id,
        timestamp: new Date(event.timestamp * 1000).toISOString()
      });

      // Finde den entsprechenden Send-Eintrag anhand der Message ID
      const sendsRef = collection(db, 'email_campaign_sends');
      const q = query(sendsRef, where('messageId', '==', event.sg_message_id));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn('⚠️ No send record found for message ID:', event.sg_message_id);
        continue;
      }

      const sendDoc = snapshot.docs[0];
      const sendRef = doc(db, 'email_campaign_sends', sendDoc.id);

      // Update basierend auf Event-Typ
      switch (event.event) {
        case 'delivered':
          await updateDoc(sendRef, {
            status: 'delivered',
            deliveredAt: new Date(event.timestamp * 1000),
            updatedAt: serverTimestamp()
          });
          console.log('✅ Updated to delivered:', sendDoc.id);
          break;

        case 'open':
          await updateDoc(sendRef, {
            status: 'opened',
            openedAt: new Date(event.timestamp * 1000),
            lastOpenedAt: new Date(event.timestamp * 1000),
            openCount: increment(1),
            updatedAt: serverTimestamp()
          });
          console.log('👁️ Updated to opened:', sendDoc.id);
          break;

        case 'click':
          await updateDoc(sendRef, {
            status: 'clicked',
            clickedAt: new Date(event.timestamp * 1000),
            lastClickedAt: new Date(event.timestamp * 1000),
            clickCount: increment(1),
            clickedUrl: event.url,
            updatedAt: serverTimestamp()
          });
          console.log('🖱️ Updated to clicked:', sendDoc.id);
          break;

        case 'bounce':
          await updateDoc(sendRef, {
            status: 'bounced',
            bouncedAt: new Date(event.timestamp * 1000),
            bounceReason: event.reason,
            updatedAt: serverTimestamp()
          });
          console.log('⚠️ Updated to bounced:', sendDoc.id);
          break;

        case 'dropped':
          await updateDoc(sendRef, {
            status: 'failed',
            failedAt: new Date(event.timestamp * 1000),
            failureReason: event.reason,
            updatedAt: serverTimestamp()
          });
          console.log('❌ Updated to dropped:', sendDoc.id);
          break;

        case 'spam_report':
          await updateDoc(sendRef, {
            status: 'spam',
            spamReportedAt: new Date(event.timestamp * 1000),
            updatedAt: serverTimestamp()
          });
          console.log('🚫 Updated to spam:', sendDoc.id);
          break;

        default:
          console.log('ℹ️ Unhandled event type:', event.event);
      }
    }

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error) {
    console.error('❌ Error processing SendGrid webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}