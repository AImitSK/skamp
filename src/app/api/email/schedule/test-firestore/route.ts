// src/app/api/email/schedule/test-firestore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Test verschiedene Methoden um Daten zu speichern
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      console.log('🧪 FIRESTORE TEST - Start');
      
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];
      
      if (!token) {
        return NextResponse.json({ error: 'No token' }, { status: 401 });
      }

      // Test 1: Einfaches Dokument
      const testDoc1 = {
        fields: {
          testString: { stringValue: 'Hello World' },
          testNumber: { integerValue: '123' },
          testBoolean: { booleanValue: true },
          testDate: { timestampValue: new Date().toISOString() }
        }
      };

      console.log('📝 Test 1 - Simple document:', JSON.stringify(testDoc1, null, 2));

      const docId1 = `test_simple_${Date.now()}`;
      const response1 = await fetch(
        `${FIRESTORE_BASE_URL}/scheduled_emails?documentId=${docId1}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(testDoc1)
        }
      );

      const result1 = await response1.text();
      console.log('✅ Test 1 Result:', result1);

      // Test 2: Verschachteltes Dokument
      const testDoc2 = {
        fields: {
          testString: { stringValue: 'Test with nested' },
          nestedObject: {
            mapValue: {
              fields: {
                innerString: { stringValue: 'Inner value' },
                innerNumber: { integerValue: '456' }
              }
            }
          },
          arrayField: {
            arrayValue: {
              values: [
                { stringValue: 'Item 1' },
                { stringValue: 'Item 2' }
              ]
            }
          }
        }
      };

      console.log('📝 Test 2 - Nested document:', JSON.stringify(testDoc2, null, 2));

      const docId2 = `test_nested_${Date.now()}`;
      const response2 = await fetch(
        `${FIRESTORE_BASE_URL}/scheduled_emails?documentId=${docId2}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(testDoc2)
        }
      );

      const result2 = await response2.text();
      console.log('✅ Test 2 Result:', result2);

      // Test 3: Komplettes scheduled_email Dokument
      const scheduledEmailTest = {
        fields: {
          jobId: { stringValue: `job_test_${Date.now()}` },
          campaignId: { stringValue: 'test_campaign_123' },
          campaignTitle: { stringValue: 'Test Campaign' },
          userId: { stringValue: auth.userId },
          organizationId: { stringValue: auth.organizationId },
          scheduledAt: { timestampValue: new Date(Date.now() + 3600000).toISOString() },
          timezone: { stringValue: 'Europe/Berlin' },
          status: { stringValue: 'pending' },
          emailContent: {
            mapValue: {
              fields: {
                subject: { stringValue: 'Test Subject' },
                greeting: { stringValue: 'Sehr geehrte Damen und Herren' },
                introduction: { stringValue: 'Dies ist eine Test-Einleitung.' },
                pressReleaseHtml: { stringValue: '<p>Test Pressemitteilung</p>' },
                closing: { stringValue: 'Mit freundlichen Grüßen' },
                signature: { stringValue: 'Test Signature' }
              }
            }
          },
          senderInfo: {
            mapValue: {
              fields: {
                name: { stringValue: 'Test Sender' },
                title: { stringValue: 'Test Title' },
                company: { stringValue: 'Test Company' },
                phone: { stringValue: '+49 123 456789' },
                email: { stringValue: 'test@example.com' }
              }
            }
          },
          recipients: {
            mapValue: {
              fields: {
                listIds: {
                  arrayValue: {
                    values: [
                      { stringValue: 'list_123' }
                    ]
                  }
                },
                listNames: {
                  arrayValue: {
                    values: [
                      { stringValue: 'Test List' }
                    ]
                  }
                },
                manualRecipients: {
                  arrayValue: {
                    values: []
                  }
                },
                totalCount: { integerValue: '5' }
              }
            }
          },
          mediaShareUrl: { stringValue: '' },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      };

      console.log('📝 Test 3 - Full scheduled_email:', JSON.stringify(scheduledEmailTest, null, 2));

      const docId3 = `test_full_${Date.now()}`;
      const response3 = await fetch(
        `${FIRESTORE_BASE_URL}/scheduled_emails?documentId=${docId3}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(scheduledEmailTest)
        }
      );

      const result3 = await response3.text();
      console.log('✅ Test 3 Result:', result3);

      // Parse results
      let parsedResult3;
      try {
        parsedResult3 = JSON.parse(result3);
      } catch (e) {
        parsedResult3 = result3;
      }

      return NextResponse.json({
        success: true,
        tests: {
          simple: {
            docId: docId1,
            success: response1.ok,
            status: response1.status
          },
          nested: {
            docId: docId2,
            success: response2.ok,
            status: response2.status
          },
          full: {
            docId: docId3,
            success: response3.ok,
            status: response3.status,
            result: parsedResult3
          }
        },
        message: 'Check console logs for detailed results'
      });

    } catch (error: any) {
      console.error('❌ Test error:', error);
      return NextResponse.json({
        error: error.message,
        stack: error.stack
      }, { status: 500 });
    }
  });
}

// GET - Teste das Lesen der Dokumente
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.split('Bearer ')[1];
      
      if (!token) {
        return NextResponse.json({ error: 'No token' }, { status: 401 });
      }

      // Lade die letzten scheduled_emails
      const response = await fetch(
        `${FIRESTORE_BASE_URL}/scheduled_emails?pageSize=5`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      console.log('📄 Raw Firestore response:', JSON.stringify(data, null, 2));

      // Analysiere die Struktur
      const documents = data.documents || [];
      const analysis = documents.map((doc: any) => {
        const fields = doc.fields || {};
        return {
          name: doc.name,
          fieldCount: Object.keys(fields).length,
          fields: Object.keys(fields),
          hasEmailContent: !!fields.emailContent,
          hasSenderInfo: !!fields.senderInfo,
          hasRecipients: !!fields.recipients,
          sample: JSON.stringify(fields).substring(0, 200) + '...'
        };
      });

      return NextResponse.json({
        success: true,
        documentCount: documents.length,
        analysis,
        rawSample: documents[0] // Ein vollständiges Beispiel
      });

    } catch (error: any) {
      console.error('❌ GET test error:', error);
      return NextResponse.json({
        error: error.message
      }, { status: 500 });
    }
  });
}