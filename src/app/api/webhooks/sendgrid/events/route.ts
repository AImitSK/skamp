// src/app/api/webhooks/sendgrid/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

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
      const sendsRef = adminDb.collection('email_campaign_sends');
      const snapshot = await sendsRef.where('messageId', '==', event.sg_message_id).get();

      if (snapshot.empty) {
        console.warn('⚠️ No send record found for message ID:', event.sg_message_id);
        continue;
      }

      const sendDoc = snapshot.docs[0];
      const sendRef = adminDb.collection('email_campaign_sends').doc(sendDoc.id);

      // Update basierend auf Event-Typ
      switch (event.event) {
        case 'delivered':
          await sendRef.update({
            status: 'delivered',
            deliveredAt: Timestamp.fromDate(new Date(event.timestamp * 1000)),
            updatedAt: FieldValue.serverTimestamp()
          });
          console.log('✅ Updated to delivered:', sendDoc.id);
          break;

        case 'open':
          const currentData = sendDoc.data();
          const updateData: any = {
            status: 'opened',
            lastOpenedAt: Timestamp.fromDate(new Date(event.timestamp * 1000)),
            openCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
          };

          // Setze openedAt nur beim ersten Mal
          if (!currentData.openedAt) {
            updateData.openedAt = Timestamp.fromDate(new Date(event.timestamp * 1000));
          }

          await sendRef.update(updateData);
          console.log('👁️ Updated to opened:', sendDoc.id);
          break;

        case 'click':
          const clickData = sendDoc.data();
          const clickUpdateData: any = {
            status: 'clicked',
            lastClickedAt: Timestamp.fromDate(new Date(event.timestamp * 1000)),
            clickCount: FieldValue.increment(1),
            lastClickedUrl: event.url,
            updatedAt: FieldValue.serverTimestamp()
          };

          // Setze clickedAt nur beim ersten Mal
          if (!clickData.clickedAt) {
            clickUpdateData.clickedAt = Timestamp.fromDate(new Date(event.timestamp * 1000));
          }

          await sendRef.update(clickUpdateData);
          console.log('🖱️ Updated to clicked:', sendDoc.id);
          break;

        case 'bounce':
          await sendRef.update({
            status: 'bounced',
            bouncedAt: Timestamp.fromDate(new Date(event.timestamp * 1000)),
            bounceReason: event.reason,
            updatedAt: FieldValue.serverTimestamp()
          });
          console.log('⚠️ Updated to bounced:', sendDoc.id);
          break;

        case 'dropped':
          await sendRef.update({
            status: 'failed',
            failedAt: Timestamp.fromDate(new Date(event.timestamp * 1000)),
            errorMessage: event.reason,
            updatedAt: FieldValue.serverTimestamp()
          });
          console.log('❌ Updated to dropped:', sendDoc.id);
          break;

        case 'spam_report':
          await sendRef.update({
            status: 'spam',
            spamReportedAt: Timestamp.fromDate(new Date(event.timestamp * 1000)),
            updatedAt: FieldValue.serverTimestamp()
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