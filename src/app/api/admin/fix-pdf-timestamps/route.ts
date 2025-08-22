// API Route zum Reparieren von PDF-Version Timestamps
import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 PDF-Version Timestamp Reparatur API gestartet');
    
    let processedCount = 0;
    let fixedCount = 0;
    const results: any[] = [];
    
    // Hole alle PDF-Versionen
    const pdfVersionsRef = collection(db, 'pdf_versions');
    const snapshot = await getDocs(pdfVersionsRef);
    
    console.log(`📊 Gefunden: ${snapshot.size} PDF-Versionen zum Prüfen`);
    
    for (const document of snapshot.docs) {
      processedCount++;
      const data = document.data();
      
      console.log(`🔍 [${processedCount}/${snapshot.size}] Prüfe PDF-Version: ${document.id}`);
      
      if (data.createdAt) {
        // Debug-Info sammeln
        const debugInfo = {
          id: document.id,
          version: data.version,
          campaignId: data.campaignId,
          createdAtType: typeof data.createdAt,
          createdAtKeys: data.createdAt && typeof data.createdAt === 'object' ? Object.keys(data.createdAt) : []
        };
        
        console.log('📄 PDF Version Debug:', debugInfo);
        
        // Prüfe ob es ein falsches Timestamp-Objekt ist
        const isInvalidTimestamp = (
          typeof data.createdAt === 'object' &&
          data.createdAt !== null &&
          typeof data.createdAt.seconds === 'number' &&
          typeof data.createdAt.nanoseconds === 'number' &&
          !data.createdAt._seconds // Firebase Timestamp hat _seconds, unser falsches Objekt hat seconds
        );
        
        if (isInvalidTimestamp) {
          console.log(`🚨 FEHLERHAFTER TIMESTAMP GEFUNDEN in ${document.id}!`);
          
          try {
            // Konvertiere zu korrektem Firebase Timestamp
            const correctTimestamp = Timestamp.fromMillis(
              data.createdAt.seconds * 1000 + Math.floor(data.createdAt.nanoseconds / 1000000)
            );
            
            console.log(`✅ Korrigiere zu: ${correctTimestamp.toDate().toISOString()}`);
            
            // Update das Dokument
            await updateDoc(doc(db, 'pdf_versions', document.id), {
              createdAt: correctTimestamp
            });
            
            fixedCount++;
            
            results.push({
              id: document.id,
              version: data.version,
              campaignId: data.campaignId,
              action: 'fixed',
              oldValue: data.createdAt,
              newValue: correctTimestamp.toDate().toISOString()
            });
          } catch (error) {
            console.error(`❌ Fehler beim Reparieren von ${document.id}:`, error);
            results.push({
              id: document.id,
              action: 'error',
              error: error.message
            });
          }
        } else {
          console.log(`✅ Timestamp korrekt für ${document.id}`);
          results.push({
            id: document.id,
            version: data.version,
            campaignId: data.campaignId,
            action: 'ok'
          });
        }
      } else {
        console.log(`⚠️ Kein createdAt Feld in ${document.id}`);
        results.push({
          id: document.id,
          action: 'no_timestamp'
        });
      }
    }
    
    console.log('🎉 PDF-Version Timestamp Reparatur abgeschlossen');
    console.log(`📊 Geprüft: ${processedCount}, Repariert: ${fixedCount}`);
    
    return NextResponse.json({
      success: true,
      statistics: {
        processed: processedCount,
        fixed: fixedCount,
        total: snapshot.size
      },
      results: results
    });
    
  } catch (error) {
    console.error('❌ Fehler bei PDF-Timestamp Reparatur:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}