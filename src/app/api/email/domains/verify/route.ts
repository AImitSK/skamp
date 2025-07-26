// src/app/api/email/domains/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import sgClient from '@sendgrid/client';
import { DnsRecord, DomainStatus } from '@/types/email-domains-enhanced';

// Initialize SendGrid client
sgClient.setApiKey(process.env.SENDGRID_API_KEY!);

/**
 * Extract DNS records from SendGrid validation response
 */
function extractDnsRecords(validationData: any): DnsRecord[] {
  const records: DnsRecord[] = [];
  
  // Mail CNAME
  if (validationData.mail_cname) {
    records.push({
      type: 'CNAME',
      host: validationData.mail_cname.host,
      data: validationData.mail_cname.data,
      valid: validationData.mail_cname.valid || false
    });
  }
  
  // DKIM1 CNAME
  if (validationData.dkim1) {
    records.push({
      type: 'CNAME',
      host: validationData.dkim1.host,
      data: validationData.dkim1.data,
      valid: validationData.dkim1.valid || false
    });
  }
  
  // DKIM2 CNAME
  if (validationData.dkim2) {
    records.push({
      type: 'CNAME',
      host: validationData.dkim2.host,
      data: validationData.dkim2.data,
      valid: validationData.dkim2.valid || false
    });
  }
  
  return records;
}

/**
 * Determine domain status based on validation results
 */
function determineStatus(validationData: any): DomainStatus {
  const mailValid = validationData.mail_cname?.valid || false;
  const dkim1Valid = validationData.dkim1?.valid || false;
  const dkim2Valid = validationData.dkim2?.valid || false;
  
  // All records must be valid for domain to be verified
  if (mailValid && dkim1Valid && dkim2Valid) {
    return 'verified';
  }
  
  // If validation explicitly failed
  if (validationData.valid === false) {
    return 'failed';
  }
  
  // Otherwise still pending
  return 'pending';
}

/**
 * POST /api/email/domains/verify
 * Verify a domain with SendGrid
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();
      
      if (!data.sendgridDomainId) {
        return NextResponse.json(
          { success: false, error: 'SendGrid Domain ID is required' },
          { status: 400 }
        );
      }

      // First, trigger validation at SendGrid
      try {
        await sgClient.request({
          method: 'POST',
          url: `/v3/whitelabel/domains/${data.sendgridDomainId}/validate`
        });
      } catch (validateError: any) {
        console.error('Validation trigger error:', validateError);
        // Continue even if validation trigger fails - we can still check status
      }

      // Wait a moment for SendGrid to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get current domain status from SendGrid
      const [response] = await sgClient.request({
        method: 'GET',
        url: `/v3/whitelabel/domains/${data.sendgridDomainId}`
      });

      const domainData = response.body as any;
      
      // Extract DNS records with current validation status
      const dnsRecords = extractDnsRecords(domainData.dns);
      
      // Determine overall status
      const status = determineStatus(domainData.dns);
      
      // Prepare detailed response
      const verificationResponse = {
        success: true,
        status,
        dnsRecords,
        valid: domainData.valid || false,
        details: {
          mail_cname: domainData.dns.mail_cname?.valid || false,
          dkim1: domainData.dns.dkim1?.valid || false,
          dkim2: domainData.dns.dkim2?.valid || false
        },
        message: status === 'verified' 
          ? 'Domain erfolgreich verifiziert' 
          : status === 'failed'
          ? 'Domain-Verifizierung fehlgeschlagen'
          : 'Domain-Verifizierung läuft noch'
      };

      return NextResponse.json(verificationResponse);

    } catch (error: any) {
      console.error('Domain verification error:', error);
      
      // Handle SendGrid specific errors
      if (error.response?.body) {
        const errorMessage = error.response.body.errors?.[0]?.message || 'SendGrid verification error';
        
        // Check for specific error cases
        if (error.code === 404) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Domain nicht bei SendGrid gefunden',
              status: 'failed'
            },
            { status: 404 }
          );
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage,
            status: 'failed'
          },
          { status: error.code || 500 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Verifizierung fehlgeschlagen',
          status: 'failed'
        },
        { status: 500 }
      );
    }
  });
}