// src/app/api/sendgrid/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

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
 */
async function processWebhookEvent(event: SendGridEvent) {
  console.log('🔄 Processing event:', event.event, 'for', event.email);
  console.log('📧 Event details:', {
    messageId: event['sg_message_id'],
    email: event.email,
    event: event.event
  });

  try {
    // Email Campaign Send Dokument finden - VERBESSERT: Suche mit mehreren Kriterien
    let q = query(
      collection(db, 'email_campaign_sends'),
      where('recipientEmail', '==', event.email)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn('⚠️ No email_campaign_send found for:', event.email);
      console.warn('⚠️ Make sure email_campaign_sends are being created when emails are sent');
      return;
    }

    console.log(`📊 Found ${querySnapshot.size} email_campaign_send documents for:`, event.email);

    // Alle passenden Dokumente aktualisieren (falls mehrere Kampagnen)
    const updates = [];

    for (const docSnapshot of querySnapshot.docs) {
      const sendData = docSnapshot.data();
      console.log('📄 Checking document:', {
        id: docSnapshot.id,
        messageId: sendData.messageId,
        status: sendData.status,
        organizationId: sendData.organizationId
      });
      
      // Nur aktualisieren wenn Message ID übereinstimmt (für Genauigkeit)
      if (event['sg_message_id'] && sendData.messageId && 
          !event['sg_message_id'].includes(sendData.messageId)) {
        continue;
      }

      // Update-Daten basierend auf Event-Typ
      const updateData = createUpdateData(event, sendData);
      
      if (Object.keys(updateData).length > 0) {
        updates.push({
          docId: docSnapshot.id,
          data: updateData
        });
      }
    }

    // Bulk-Update ausführen
    for (const update of updates) {
      const docRef = doc(db, 'email_campaign_sends', update.docId);
      await updateDoc(docRef, update.data);
      console.log('✅ Updated status to', update.data.status, 'for', event.email);
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