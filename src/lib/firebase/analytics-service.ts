// src/lib/firebase/analytics-service.ts
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { EmailCampaignSend } from '@/types/email';

export interface CampaignAnalytics {
  campaignId: string;
  campaignTitle?: string;
  
  // Basis-Metriken
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  
  // Raten (in Prozent)
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  
  // Engagement-Metriken
  uniqueOpens: number;
  totalOpens: number;
  uniqueClicks: number;
  totalClicks: number;
  
  // Zeitbasierte Daten
  firstOpenAt?: Date;
  lastOpenAt?: Date;
  firstClickAt?: Date;
  lastClickAt?: Date;
  
  // Top-Performance
  topLinks: Array<{
    url: string;
    clicks: number;
  }>;
  
  // Geräte/Browser Insights
  topUserAgents: Array<{
    userAgent: string;
    count: number;
  }>;
}

export interface RecipientAnalytics {
  recipientEmail: string;
  recipientName: string;
  status: string;
  
  // Timestamps
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  
  // Engagement-Details
  openCount: number;
  clickCount: number;
  lastOpenedAt?: Date;
  lastClickedAt?: Date;
  lastClickedUrl?: string;
  
  // Technical Info
  userAgent?: string;
  ipAddress?: string;
  bounceReason?: string;
  errorMessage?: string;
}

export interface OverallAnalytics {
  // Gesamt-Statistiken
  totalCampaigns: number;
  totalEmailsSent: number;
  totalRecipients: number;
  
  // Durchschnittliche Raten
  avgDeliveryRate: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  
  // Zeitbasierte Trends
  campaignsThisWeek: number;
  campaignsThisMonth: number;
  emailsThisWeek: number;
  emailsThisMonth: number;
  
  // Top Performer
  bestPerformingCampaign?: {
    campaignId: string;
    title: string;
    openRate: number;
    clickRate: number;
  };
  
  // Engagement-Trends
  engagementTrend: Array<{
    date: string;
    opens: number;
    clicks: number;
  }>;
}

export const analyticsService = {
  
  /**
   * Analytics für eine spezifische Kampagne laden
   */
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    try {
      console.log('📊 Loading analytics for campaign:', campaignId);
      
      // Alle E-Mail-Sends für diese Kampagne laden
      const q = query(
        collection(db, 'email_campaign_sends'),
        where('campaignId', '==', campaignId),
        orderBy('sentAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const sends = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailCampaignSend[];
      
      if (sends.length === 0) {
        return null;
      }
      
      return this.calculateCampaignMetrics(campaignId, sends);
      
    } catch (error) {
      console.error('❌ Error loading campaign analytics:', error);
      throw error;
    }
  },
  
  /**
   * Detaillierte Empfänger-Analytics für eine Kampagne
   */
  async getRecipientAnalytics(campaignId: string): Promise<RecipientAnalytics[]> {
    try {
      const q = query(
        collection(db, 'email_campaign_sends'),
        where('campaignId', '==', campaignId),
        orderBy('sentAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data() as EmailCampaignSend;
        
        return {
          recipientEmail: data.recipientEmail,
          recipientName: data.recipientName,
          status: data.status,
          
          sentAt: data.sentAt?.toDate(),
          deliveredAt: data.deliveredAt?.toDate(),
          openedAt: data.openedAt?.toDate(),
          clickedAt: data.clickedAt?.toDate(),
          bouncedAt: data.bouncedAt?.toDate(),
          
          openCount: data.openCount || 0,
          clickCount: data.clickCount || 0,
          lastOpenedAt: data.lastOpenedAt?.toDate(),
          lastClickedAt: data.lastClickedAt?.toDate(),
          lastClickedUrl: data.lastClickedUrl,
          
          userAgent: data.lastUserAgent,
          ipAddress: data.lastIpAddress,
          bounceReason: data.bounceReason,
          errorMessage: data.errorMessage
        } as RecipientAnalytics;
      });
      
    } catch (error) {
      console.error('❌ Error loading recipient analytics:', error);
      throw error;
    }
  },
  
  /**
   * Übergreifende Analytics für alle Kampagnen eines Users
   */
  async getOverallAnalytics(userId: string): Promise<OverallAnalytics> {
    try {
      // Alle Kampagnen des Users laden
      const campaignsQuery = query(
        collection(db, 'pr_campaigns'),
        where('userId', '==', userId)
      );
      
      const campaignsSnapshot = await getDocs(campaignsQuery);
      const campaigns = campaignsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Alle E-Mail-Sends laden
      const sendsQuery = query(
        collection(db, 'email_campaign_sends'),
        where('userId', '==', userId)
      );
      
      const sendsSnapshot = await getDocs(sendsQuery);
      const sends = sendsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailCampaignSend[];
      
      return this.calculateOverallMetrics(campaigns, sends);
      
    } catch (error) {
      console.error('❌ Error loading overall analytics:', error);
      throw error;
    }
  },
  
  /**
   * Kampagnen-Metriken berechnen
   */
  calculateCampaignMetrics(campaignId: string, sends: EmailCampaignSend[]): CampaignAnalytics {
    const totalSent = sends.length;
    const delivered = sends.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length;
    const opened = sends.filter(s => s.status === 'opened' || s.status === 'clicked').length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const bounced = sends.filter(s => s.status === 'bounced').length;
    const failed = sends.filter(s => s.status === 'failed').length;
    
    // Raten berechnen
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;
    
    // Engagement-Metriken
    const totalOpens = sends.reduce((sum, s) => sum + (s.openCount || 0), 0);
    const totalClicks = sends.reduce((sum, s) => sum + (s.clickCount || 0), 0);
    
    // Top-Links analysieren
    const linkClicks = new Map<string, number>();
    sends.forEach(send => {
      if (send.lastClickedUrl) {
        linkClicks.set(send.lastClickedUrl, (linkClicks.get(send.lastClickedUrl) || 0) + (send.clickCount || 0));
      }
    });
    
    const topLinks = Array.from(linkClicks.entries())
      .map(([url, clicks]) => ({ url, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);
    
    // Top User Agents
    const userAgents = new Map<string, number>();
    sends.forEach(send => {
      if (send.lastUserAgent) {
        userAgents.set(send.lastUserAgent, (userAgents.get(send.lastUserAgent) || 0) + 1);
      }
    });
    
    const topUserAgents = Array.from(userAgents.entries())
      .map(([userAgent, count]) => ({ userAgent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Zeitstempel
    const openDates = sends.filter(s => s.openedAt).map(s => s.openedAt!.toDate()).sort();
    const clickDates = sends.filter(s => s.clickedAt).map(s => s.clickedAt!.toDate()).sort();
    
    return {
      campaignId,
      totalSent,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      uniqueOpens: opened,
      totalOpens,
      uniqueClicks: clicked,
      totalClicks,
      firstOpenAt: openDates[0],
      lastOpenAt: openDates[openDates.length - 1],
      firstClickAt: clickDates[0],
      lastClickAt: clickDates[clickDates.length - 1],
      topLinks,
      topUserAgents
    };
  },
  
  /**
   * Gesamt-Metriken berechnen
   */
  calculateOverallMetrics(campaigns: any[], sends: EmailCampaignSend[]): OverallAnalytics {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Basis-Zahlen
    const totalCampaigns = campaigns.length;
    const totalEmailsSent = sends.length;
    const uniqueRecipients = new Set(sends.map(s => s.recipientEmail)).size;
    
    // Durchschnittliche Raten
    const delivered = sends.filter(s => ['delivered', 'opened', 'clicked'].includes(s.status)).length;
    const opened = sends.filter(s => ['opened', 'clicked'].includes(s.status)).length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const bounced = sends.filter(s => s.status === 'bounced').length;
    
    const avgDeliveryRate = totalEmailsSent > 0 ? (delivered / totalEmailsSent) * 100 : 0;
    const avgOpenRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const avgClickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const avgBounceRate = totalEmailsSent > 0 ? (bounced / totalEmailsSent) * 100 : 0;
    
    // Zeitbasierte Counts
    const campaignsThisWeek = campaigns.filter(c => 
      c.createdAt && c.createdAt.toDate() >= oneWeekAgo
    ).length;
    
    const campaignsThisMonth = campaigns.filter(c => 
      c.createdAt && c.createdAt.toDate() >= oneMonthAgo
    ).length;
    
    const emailsThisWeek = sends.filter(s => 
      s.sentAt && s.sentAt.toDate() >= oneWeekAgo
    ).length;
    
    const emailsThisMonth = sends.filter(s => 
      s.sentAt && s.sentAt.toDate() >= oneMonthAgo
    ).length;
    
    // Engagement-Trend (letzte 7 Tage)
    const engagementTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOpens = sends.filter(s => 
        s.openedAt && s.openedAt.toDate().toDateString() === date.toDateString()
      ).length;
      
      const dayClicks = sends.filter(s => 
        s.clickedAt && s.clickedAt.toDate().toDateString() === date.toDateString()
      ).length;
      
      engagementTrend.push({
        date: dateStr,
        opens: dayOpens,
        clicks: dayClicks
      });
    }
    
    return {
      totalCampaigns,
      totalEmailsSent,
      totalRecipients: uniqueRecipients,
      avgDeliveryRate: Math.round(avgDeliveryRate * 100) / 100,
      avgOpenRate: Math.round(avgOpenRate * 100) / 100,
      avgClickRate: Math.round(avgClickRate * 100) / 100,
      avgBounceRate: Math.round(avgBounceRate * 100) / 100,
      campaignsThisWeek,
      campaignsThisMonth,
      emailsThisWeek,
      emailsThisMonth,
      engagementTrend
    };
  }
};