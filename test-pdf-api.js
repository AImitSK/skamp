// test-pdf-api.js - Lokaler Test der PDF-Generation API
const https = require('http');

const testPayload = {
  campaignId: "test_campaign_123",
  organizationId: "test_org_456", 
  title: "Test Campaign PDF",
  mainContent: "<h2>Test Content</h2><p>Dies ist ein Test der PDF-Generation mit umfangreichen Debug-Logs.</p><p>Der Inhalt sollte korrekt formatiert werden.</p>",
  boilerplateSections: [
    {
      id: "contact",
      customTitle: "Kontakt",
      content: "<p>Kontaktinformationen hier...</p>",
      type: "contact"
    }
  ],
  keyVisual: {
    url: "https://via.placeholder.com/800x400/0066cc/ffffff?text=Test+Image",
    alt: "Test KeyVisual",
    caption: "Test Beschreibung"
  },
  clientName: "Test Client",
  userId: "test_user_789",
  fileName: "test_campaign_debug.pdf",
  templateId: "default",
  useSystemTemplate: true,
  options: {
    format: "A4",
    orientation: "portrait",
    printBackground: true,
    waitUntil: "networkidle0"
  }
};

const postData = JSON.stringify(testPayload);

console.log('🧪 STARTE LOKALEN PDF-API TEST');
console.log('📋 Payload Größe:', postData.length, 'bytes');
console.log('📋 Test Campaign ID:', testPayload.campaignId);

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/generate-pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'PDF-API-Test-Script'
  },
  timeout: 30000
};

const startTime = Date.now();

const req = https.request(options, (res) => {
  console.log(`\n📊 RESPONSE STATUS: ${res.statusCode}`);
  console.log('📊 RESPONSE HEADERS:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const responseTime = Date.now() - startTime;
    console.log(`\n⏱️  RESPONSE TIME: ${responseTime}ms`);
    
    try {
      const response = JSON.parse(data);
      console.log('\n✅ RESPONSE DATA:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n🎉 PDF-GENERATION ERFOLGREICH!');
        console.log('📄 PDF URL:', response.pdfUrl);
        console.log('📊 Datei Größe:', response.fileSize);
        console.log('📊 Metadaten:', response.metadata);
      } else {
        console.log('\n❌ PDF-GENERATION FEHLGESCHLAGEN!');
        console.log('❌ Error:', response.error);
      }
    } catch (parseError) {
      console.error('\n❌ JSON PARSE ERROR:', parseError);
      console.log('📋 Raw Response:', data);
    }
    
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (error) => {
  console.error('\n❌ REQUEST ERROR:', error);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('\n❌ REQUEST TIMEOUT (30s)');
  req.destroy();
  process.exit(1);
});

console.log('📤 SENDE REQUEST an http://localhost:3002/api/generate-pdf');
req.write(postData);
req.end();