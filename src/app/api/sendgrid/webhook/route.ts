// src/app/api/sendgrid/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// SendGrid Event Types
interface SendGridEvent {
  email: string;
  timestamp: number;
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'deferred' | 'blocked';
  'smtp-id'?: string;
  'sg_message_id'?: string;
  url?: string; // Für click events
  reason?: string; // Für bounce events
  ip?: string;
  useragent?: string;
  category?: string[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 SendGrid Webhook received');
    
    // Events aus dem Request Body parsen
    const events: SendGridEvent[] = await request.json();
    
    if (!Array.isArray(events)) {
      console.error('❌ Invalid webhook payload - not an array');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    console.log('📊 Processing', events.length, 'events');

    // Jedes Event verarbeiten
    for (const event of events) {
      try {
        await processWebhookEvent(event);
      } catch (error) {
        console.error('❌ Error processing event:', event.event, 'for', event.email, error);
        // Weitermachen mit anderen Events, auch wenn eines fehlschlägt
      }
    }

    console.log('✅ Webhook processing completed');
    return NextResponse.json({ success: true, processed: events.length });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

/**
 * Einzelnes SendGrid Event verarbeiten
 * Nutzt Admin SDK für direkten Firestore-Zugriff
 */
async function processWebhookEvent(event: SendGridEvent) {
  console.log('🔄 Processing event:', event.event, 'for', event.email);
  console.log('📧 Event details:', {
    messageId: event['sg_message_id'],
    email: event.email,
    event: event.event
  });

  try {
    // 1. Find documents via Admin SDK
    const sendsRef = adminDb.collection('email_campaign_sends');
    const snapshot = await sendsRef.where('recipientEmail', '==', event.email).get();

    if (snapshot.empty) {
      console.warn('⚠️ No email_campaign_send found for:', event.email);
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents for:`, event.email);

    // 2. Update each document
    for (const doc of snapshot.docs) {
      const sendData = doc.data();

      // Check message ID match
      if (event['sg_message_id'] && sendData.messageId &&
          !event['sg_message_id'].includes(sendData.messageId)) {
        continue;
      }

      // Create update data
      const updateData = createUpdateData(event, sendData);
      if (Object.keys(updateData).length === 0) continue;

      // Convert Dates to Firestore Timestamps
      const firestoreUpdateData: any = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value instanceof Date) {
          firestoreUpdateData[key] = Timestamp.fromDate(value);
        } else if (key === 'updatedAt') {
          firestoreUpdateData[key] = FieldValue.serverTimestamp();
        } else {
          firestoreUpdateData[key] = value;
        }
      }

      // Update via Admin SDK
      await doc.ref.update(firestoreUpdateData);
      console.log('✅ Updated document for', event.email, '- Fields:', Object.keys(updateData).join(', '));
    }

  } catch (error) {
    console.error('❌ Error processing webhook event:', error);
    throw error;
  }
}

/**
 * Update-Daten basierend auf Event-Typ erstellen
 */
function createUpdateData(event: SendGridEvent, currentData: any): any {
  const baseUpdate = {
    updatedAt: new Date(),
    lastEventAt: new Date(event.timestamp * 1000)
  };

  // Event-spezifische Updates
  switch (event.event) {
    case 'delivered':
      // Nur updaten wenn noch nicht delivered
      if (currentData.status === 'sent') {
        return {
          ...baseUpdate,
          status: 'delivered',
          deliveredAt: new Date(event.timestamp * 1000)
        };
      }
      break;

    case 'open':
      const updateData: any = {
        ...baseUpdate,
        openedAt: new Date(event.timestamp * 1000),
        openCount: (currentData.openCount || 0) + 1,
        lastOpenedAt: new Date(event.timestamp * 1000)
      };
      
      // Status zu "opened" ändern wenn noch nicht geöffnet
      if (currentData.status !== 'opened' && currentData.status !== 'clicked') {
        updateData.status = 'opened';
      }
      
      // User Agent und IP für Insights
      if (event.useragent) updateData.lastUserAgent = event.useragent;
      if (event.ip) updateData.lastIpAddress = event.ip;
      
      return updateData;

    case 'click':
      return {
        ...baseUpdate,
        status: 'clicked',
        clickedAt: new Date(event.timestamp * 1000),
        clickCount: (currentData.clickCount || 0) + 1,
        lastClickedAt: new Date(event.timestamp * 1000),
        lastClickedUrl: event.url,
        lastUserAgent: event.useragent,
        lastIpAddress: event.ip
      };

    case 'bounce':
      return {
        ...baseUpdate,
        status: 'bounced',
        bouncedAt: new Date(event.timestamp * 1000),
        bounceReason: event.reason
      };

    case 'dropped':
    case 'blocked':
      return {
        ...baseUpdate,
        status: 'failed',
        errorMessage: event.reason || `Email ${event.event}`,
        failedAt: new Date(event.timestamp * 1000)
      };

    case 'deferred':
      // Deferred ist temporär - Status nicht ändern
      return {
        ...baseUpdate,
        deferredAt: new Date(event.timestamp * 1000),
        deferredReason: event.reason
      };

    default:
      console.log('📝 Unhandled event type:', event.event);
      return {};
  }

  return {};
}

/**
 * GET-Handler für Webhook-Verification (falls SendGrid das braucht)
 */
export async function GET(request: NextRequest) {
  // SendGrid Webhook Verification
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ 
    status: 'SendGrid Webhook Endpoint Active',
    timestamp: new Date().toISOString()
  });
}