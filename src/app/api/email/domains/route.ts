// src/app/api/email/domains/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgClient from '@sendgrid/client';
import { DnsRecord } from '@/types/email-domains-enhanced';

// Initialize SendGrid client
sgClient.setApiKey(process.env.SENDGRID_API_KEY!);

/**
 * Extract DNS records from SendGrid response
 */
function extractDnsRecords(sendgridDomain: any): DnsRecord[] {
  const records: DnsRecord[] = [];
  
  // Mail CNAME
  if (sendgridDomain.dns?.mail_cname) {
    records.push({
      type: 'CNAME',
      host: sendgridDomain.dns.mail_cname.host,
      data: sendgridDomain.dns.mail_cname.data,
      valid: sendgridDomain.dns.mail_cname.valid || false
    });
  }
  
  // DKIM1 CNAME
  if (sendgridDomain.dns?.dkim1) {
    records.push({
      type: 'CNAME',
      host: sendgridDomain.dns.dkim1.host,
      data: sendgridDomain.dns.dkim1.data,
      valid: sendgridDomain.dns.dkim1.valid || false
    });
  }
  
  // DKIM2 CNAME
  if (sendgridDomain.dns?.dkim2) {
    records.push({
      type: 'CNAME',
      host: sendgridDomain.dns.dkim2.host,
      data: sendgridDomain.dns.dkim2.data,
      valid: sendgridDomain.dns.dkim2.valid || false
    });
  }
  
  return records;
}

/**
 * POST /api/email/domains
 * Create a new domain in SendGrid
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();
      
      if (!data.domain) {
        return NextResponse.json(
          { success: false, error: 'Domain is required' },
          { status: 400 }
        );
      }

      // Generate unique subdomain with timestamp
      const subdomain = `em${Date.now()}`;
      
      // Create domain in SendGrid
      const [response] = await sgClient.request({
        method: 'POST',
        url: '/v3/whitelabel/domains',
        body: {
          domain: data.domain.toLowerCase(),
          subdomain: subdomain,
          // username entfernt - nicht nötig für normale Accounts
          ips: [], // Empty array for automatic IP assignment
          automatic_security: true,
          custom_spf: false,
          default: false
        }
      });

      const sendgridDomain = response.body as any;
      
      // Extract DNS records
      const dnsRecords = extractDnsRecords(sendgridDomain);

      // Prepare domain data for Firebase (client will save this)
      const domainData = {
        domain: data.domain.toLowerCase(),
        subdomain: subdomain,
        organizationId: auth.organizationId,
        userId: auth.userId,
        sendgridDomainId: sendgridDomain.id,
        sendgridDomainData: sendgridDomain,
        dnsRecords,
        status: 'pending',
        verificationAttempts: 0,
        provider: data.provider,
        detectedProvider: data.provider
      };

      return NextResponse.json({
        success: true,
        sendgridDomainId: sendgridDomain.id,
        dnsRecords,
        domainData,
        subdomain
      });

    } catch (error: any) {
      console.error('SendGrid domain creation error:', error);
      console.error('Error details:', error.response?.body); // Log the full error body
      
      // Handle SendGrid specific errors
      if (error.response?.body) {
        const errorMessage = error.response.body.errors?.[0]?.message || 'SendGrid error occurred';
        const errorField = error.response.body.errors?.[0]?.field;
        
        console.error('SendGrid Error:', errorMessage);
        console.error('Error Field:', errorField);
        
        // Check for common errors
        if (errorMessage.includes('already exists')) {
          return NextResponse.json(
            { success: false, error: 'Diese Domain ist bereits bei SendGrid registriert' },
            { status: 409 }
          );
        }
        
        if (errorMessage.includes('invalid domain')) {
          return NextResponse.json(
            { success: false, error: 'Ungültige Domain' },
            { status: 400 }
          );
        }
        
        if (errorMessage.includes('rate limit') || error.response.headers['x-ratelimit-remaining'] === '0') {
          return NextResponse.json(
            { success: false, error: 'SendGrid Rate-Limit erreicht. Bitte versuchen Sie es in ein paar Minuten erneut.' },
            { status: 429 }
          );
        }
        
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: error.code || 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to create domain at SendGrid' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/email/domains/:id
 * Delete a domain from SendGrid
 * Note: Using POST with _method parameter as DELETE doesn't work well with body in Next.js
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Extract domainId from URL
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const domainId = pathParts[pathParts.length - 1];

      if (!domainId || domainId === 'domains') {
        return NextResponse.json(
          { success: false, error: 'Domain ID is required' },
          { status: 400 }
        );
      }

      // For DELETE requests with body, we need to read it differently
      let sendgridDomainId: number | undefined;
      
      try {
        const body = await req.json();
        sendgridDomainId = body.sendgridDomainId;
      } catch {
        // If no body, that's okay - we'll skip SendGrid deletion
      }

      if (!sendgridDomainId) {
        // No SendGrid ID provided, just return success
        // Client will handle Firebase deletion
        return NextResponse.json({
          success: true,
          message: 'No SendGrid domain to delete'
        });
      }

      // Delete from SendGrid
      try {
        await sgClient.request({
          method: 'DELETE',
          url: `/v3/whitelabel/domains/${sendgridDomainId}`
        });
        
        return NextResponse.json({
          success: true,
          message: 'Domain deleted from SendGrid'
        });
        
      } catch (sgError: any) {
        console.error('SendGrid deletion error:', sgError);
        
        // If domain not found at SendGrid, that's okay
        if (sgError.code === 404) {
          return NextResponse.json({
            success: true,
            message: 'Domain not found at SendGrid (already deleted)'
          });
        }
        
        // For other errors, log but don't fail the request
        return NextResponse.json({
          success: true,
          message: 'SendGrid deletion failed, but proceeding',
          warning: sgError.response?.body?.errors?.[0]?.message || 'Unknown SendGrid error'
        });
      }

    } catch (error: any) {
      console.error('Domain deletion error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete domain' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/email/domains
 * This endpoint is not used - domains are fetched directly from Firebase on the client
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use client-side Firebase for listing domains',
    info: 'This endpoint is deprecated. Fetch domains directly from Firebase.'
  }, { status: 200 });
}