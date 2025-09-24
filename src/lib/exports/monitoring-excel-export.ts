import * as XLSX from 'xlsx';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { prService } from '@/lib/firebase/pr-service';

interface ExcelExportData {
  campaignTitle: string;
  sends: EmailCampaignSend[];
  clippings: MediaClipping[];
  summary: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
    totalClippings: number;
    totalReach: number;
    totalAVE: number;
    positiveClippings: number;
    neutralClippings: number;
    negativeClippings: number;
  };
}

class MonitoringExcelExport {
  async collectData(
    campaignId: string,
    organizationId: string
  ): Promise<ExcelExportData> {
    const campaign = await prService.getById(campaignId);

    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    const [sends, clippings] = await Promise.all([
      emailCampaignService.getSends(campaignId, { organizationId }),
      clippingService.getByCampaignId(campaignId, { organizationId })
    ]);

    const totalSent = sends.length;
    const delivered = sends.filter(s =>
      s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
    ).length;
    const opened = sends.filter(s =>
      s.status === 'opened' || s.status === 'clicked'
    ).length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const bounced = sends.filter(s => s.status === 'bounced').length;

    const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);

    return {
      campaignTitle: campaign.title || 'Unbekannte Kampagne',
      sends,
      clippings,
      summary: {
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        openRate: totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        totalClippings: clippings.length,
        totalReach,
        totalAVE,
        positiveClippings: clippings.filter(c => c.sentiment === 'positive').length,
        neutralClippings: clippings.filter(c => c.sentiment === 'neutral').length,
        negativeClippings: clippings.filter(c => c.sentiment === 'negative').length
      }
    };
  }

  async generateExcel(
    campaignId: string,
    organizationId: string
  ): Promise<Blob> {
    const data = await this.collectData(campaignId, organizationId);

    const workbook = XLSX.utils.book_new();

    const summaryData = [
      { Metrik: 'Kampagne', Wert: data.campaignTitle },
      { Metrik: 'Exportiert am', Wert: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
      { Metrik: '', Wert: '' },
      { Metrik: '📧 E-Mail Performance', Wert: '' },
      { Metrik: 'Gesamt versendet', Wert: data.summary.totalSent },
      { Metrik: 'Zugestellt', Wert: data.summary.delivered },
      { Metrik: 'Geöffnet', Wert: data.summary.opened },
      { Metrik: 'Geklickt', Wert: data.summary.clicked },
      { Metrik: 'Bounced', Wert: data.summary.bounced },
      { Metrik: 'Öffnungsrate', Wert: `${data.summary.openRate}%` },
      { Metrik: 'Klickrate', Wert: `${data.summary.clickRate}%` },
      { Metrik: '', Wert: '' },
      { Metrik: '📰 Clipping Performance', Wert: '' },
      { Metrik: 'Gesamt Clippings', Wert: data.summary.totalClippings },
      { Metrik: 'Gesamtreichweite', Wert: data.summary.totalReach },
      { Metrik: 'Gesamt AVE', Wert: data.summary.totalAVE > 0 ? `${data.summary.totalAVE.toLocaleString('de-DE')} €` : '-' },
      { Metrik: '', Wert: '' },
      { Metrik: '💭 Sentiment', Wert: '' },
      { Metrik: 'Positiv', Wert: data.summary.positiveClippings },
      { Metrik: 'Neutral', Wert: data.summary.neutralClippings },
      { Metrik: 'Negativ', Wert: data.summary.negativeClippings }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Zusammenfassung');

    const emailData = data.sends.map(send => ({
      'Empfänger': send.recipientEmail || '-',
      'Name': send.recipientName || '-',
      'Status': this.getStatusLabel(send.status),
      'Geöffnet': send.openCount || 0,
      'Klicks': send.clickCount || 0,
      'Letzte Öffnung': send.lastOpenedAt ? new Date(send.lastOpenedAt.toDate()).toLocaleDateString('de-DE') : '-',
      'Veröffentlichung': send.clippingId ? 'Ja' : 'Nein'
    }));

    const emailSheet = XLSX.utils.json_to_sheet(emailData);
    XLSX.utils.book_append_sheet(workbook, emailSheet, 'E-Mail Details');

    if (data.clippings.length > 0) {
      const clippingsData = data.clippings.map(clipping => ({
        'Datum': clipping.publishedAt?.toDate ? clipping.publishedAt.toDate().toLocaleDateString('de-DE') : '-',
        'Titel': clipping.title || '-',
        'Medium': clipping.outletName || '-',
        'Typ': clipping.outletType || '-',
        'Reichweite': clipping.reach || 0,
        'AVE': clipping.ave || 0,
        'Sentiment': this.getSentimentLabel(clipping.sentiment),
        'URL': clipping.url || '-'
      }));

      const clippingsSheet = XLSX.utils.json_to_sheet(clippingsData);
      XLSX.utils.book_append_sheet(workbook, clippingsSheet, 'Veröffentlichungen');
    }

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  downloadExcel(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'sent': return 'Versendet';
      case 'delivered': return 'Zugestellt';
      case 'opened': return 'Geöffnet';
      case 'clicked': return 'Geklickt';
      case 'bounced': return 'Bounced';
      case 'failed': return 'Fehlgeschlagen';
      default: return status;
    }
  }

  private getSentimentLabel(sentiment: 'positive' | 'neutral' | 'negative'): string {
    switch (sentiment) {
      case 'positive': return 'Positiv';
      case 'neutral': return 'Neutral';
      case 'negative': return 'Negativ';
      default: return sentiment;
    }
  }
}

export const monitoringExcelExport = new MonitoringExcelExport();