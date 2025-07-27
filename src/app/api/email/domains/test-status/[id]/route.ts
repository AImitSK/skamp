// src/app/api/email/domains/test-status/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { domainService } from '@/lib/firebase/domain-service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/email/domains/test-status/[id]
 * Status eines Inbox-Tests abrufen
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const { id: testId } = await params;
      
      if (!testId) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Test ID ist erforderlich' 
          },
          { status: 400 }
        );
      }

      console.log('🔍 Checking test status for:', testId);

      // Alle Domains des Users durchsuchen nach dem Test
      const domains = await domainService.getAll(auth.organizationId);
      
      let foundTest = null;
      let foundDomain = null;

      for (const domain of domains) {
        if (domain.inboxTests) {
          const test = domain.inboxTests.find(t => t.id === testId);
          if (test) {
            foundTest = test;
            foundDomain = domain;
            break;
          }
        }
      }

      if (!foundTest) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Test nicht gefunden' 
          },
          { status: 404 }
        );
      }

      // SendGrid Events prüfen (falls Test noch pending ist)
      if (foundTest.deliveryStatus === 'pending') {
        try {
          // Suche nach email_campaign_sends mit der Test-Email
          const sendsQuery = query(
            collection(db, 'email_campaign_sends'),
            where('recipientEmail', '==', foundTest.testEmail),
            where('createdAt', '>=', foundTest.timestamp)
          );
          
          const sendsSnapshot = await getDocs(sendsQuery);
          
          if (!sendsSnapshot.empty) {
            const latestSend = sendsSnapshot.docs[0].data();
            
            // Status mapping
            let newStatus: 'delivered' | 'spam' | 'blocked' | 'pending' = 'pending';
            let deliveryTime = undefined;
            let spamScore = undefined;
            let recommendations: string[] = [];

            switch (latestSend.status) {
              case 'delivered':
                newStatus = 'delivered';
                deliveryTime = latestSend.deliveredAt ? 
                  latestSend.deliveredAt.toDate().getTime() - foundTest.timestamp.toDate().getTime() : 
                  undefined;
                
                // Spam-Score simulieren basierend auf Delivery-Zeit
                if (deliveryTime && deliveryTime < 5000) {
                  spamScore = 1; // Sehr gut
                } else if (deliveryTime && deliveryTime < 30000) {
                  spamScore = 3; // Gut
                } else {
                  spamScore = 5; // OK
                }
                break;
                
              case 'bounced':
                newStatus = 'blocked';
                recommendations.push('Prüfen Sie die E-Mail-Adresse auf Tippfehler');
                recommendations.push('Stellen Sie sicher, dass die E-Mail-Adresse existiert');
                break;
                
              case 'opened':
              case 'clicked':
                newStatus = 'delivered';
                spamScore = 2; // Sehr gut, da geöffnet
                break;
                
              case 'failed':
                newStatus = 'blocked';
                recommendations.push('Die E-Mail wurde vom Empfänger-Server abgelehnt');
                break;
            }

            // Test-Ergebnis aktualisieren
            if (newStatus !== 'pending' && foundDomain) {
              const updatedTest = {
                ...foundTest,
                deliveryStatus: newStatus,
                deliveryTime,
                spamScore,
                recommendations: recommendations.length > 0 ? recommendations : undefined
              };

              // In Firebase aktualisieren
              const updatedTests = foundDomain.inboxTests!.map(t => 
                t.id === testId ? updatedTest : t
              );
              
              await domainService.update(foundDomain.id!, {
                inboxTests: updatedTests
              });

              foundTest = updatedTest;
            }
          }
        } catch (eventError) {
          console.warn('⚠️ Could not check SendGrid events:', eventError);
        }
      }

      // Analyse und Empfehlungen
      const analysis = analyzeTestResult(foundTest);

      return NextResponse.json({
        success: true,
        testId: foundTest.id,
        deliveryStatus: foundTest.deliveryStatus,
        deliveryTime: foundTest.deliveryTime,
        spamScore: foundTest.spamScore || analysis.estimatedSpamScore,
        recommendations: foundTest.recommendations || analysis.recommendations,
        provider: foundTest.provider,
        timestamp: foundTest.timestamp.toDate().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Test status error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message || 'Test-Status konnte nicht abgerufen werden' 
        },
        { status: 500 }
      );
    }
  });
}

/**
 * Test-Ergebnis analysieren und Empfehlungen generieren
 */
function analyzeTestResult(test: any) {
  const recommendations: string[] = [];
  let estimatedSpamScore = 5;

  switch (test.deliveryStatus) {
    case 'delivered':
      estimatedSpamScore = 2;
      recommendations.push('Ihre Domain-Authentifizierung funktioniert einwandfrei');
      
      if (test.deliveryTime && test.deliveryTime > 60000) {
        recommendations.push('Die Zustellung dauerte länger als erwartet. Prüfen Sie Ihre SPF-Records');
        estimatedSpamScore += 2;
      }
      break;

    case 'spam':
      estimatedSpamScore = 7;
      recommendations.push('Fügen Sie Ihre Domain zur SPF-Whitelist hinzu');
      recommendations.push('Erstellen Sie einen DMARC-Record für zusätzliche Authentifizierung');
      recommendations.push('Vermeiden Sie Spam-Trigger-Wörter in Ihren E-Mails');
      break;

    case 'blocked':
      estimatedSpamScore = 10;
      recommendations.push('Überprüfen Sie, ob alle DNS-Records korrekt gesetzt sind');
      recommendations.push('Kontaktieren Sie den Support für weitere Unterstützung');
      break;

    case 'pending':
      recommendations.push('Der Test läuft noch. Bitte warten Sie noch einen Moment');
      break;
  }

  // Provider-spezifische Empfehlungen
  switch (test.provider) {
    case 'gmail':
      if (test.deliveryStatus !== 'delivered') {
        recommendations.push('Gmail hat strenge Spam-Filter. Stellen Sie sicher, dass Ihre SPF- und DKIM-Records korrekt sind');
      }
      break;
      
    case 'outlook':
      if (test.deliveryStatus !== 'delivered') {
        recommendations.push('Outlook/Microsoft benötigt oft zusätzlich einen DMARC-Record');
      }
      break;
  }

  return {
    estimatedSpamScore,
    recommendations
  };
}