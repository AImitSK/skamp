// DEBUG API - später entfernen
import { NextRequest, NextResponse } from 'next/server';
import { markenDNAService } from '@/lib/firebase/marken-dna-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const organizationId = searchParams.get('organizationId');

  try {
    if (companyId) {
      // Direkt die Dokumente laden (wie Detail-Seite)
      const documents = await markenDNAService.getDocuments(companyId);
      const status = await markenDNAService.getCompanyStatus(companyId);

      return NextResponse.json({
        source: 'direct',
        companyId,
        documentsCount: documents.length,
        documents: documents.map(d => ({
          type: d.type,
          status: d.status,
          hasContent: !!d.content,
        })),
        computedStatus: status,
      });
    }

    if (organizationId) {
      // Über getAllCustomersStatus (wie Übersicht-Seite)
      const allStatuses = await markenDNAService.getAllCustomersStatus(organizationId);

      return NextResponse.json({
        source: 'getAllCustomersStatus',
        organizationId,
        customersCount: allStatuses.length,
        statuses: allStatuses.map(s => ({
          companyId: s.companyId,
          companyName: s.companyName,
          documents: s.documents,
          isComplete: s.isComplete,
        })),
      });
    }

    return NextResponse.json({ error: 'companyId oder organizationId erforderlich' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
