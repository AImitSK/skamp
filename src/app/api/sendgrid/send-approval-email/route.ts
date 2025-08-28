// src/app/api/sendgrid/send-approval-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIMiddleware } from '@/lib/api/api-middleware';

interface SendApprovalEmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    try {
      const { to, subject, html, text } = await request.json() as SendApprovalEmailRequest;

    // Validierung
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Fehlende erforderliche Felder: to, subject, html' },
        { status: 400 }
      );
    }

    // E-Mail-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // SendGrid Setup
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY ist nicht konfiguriert');
      return NextResponse.json(
        { error: 'E-Mail-Service nicht konfiguriert' },
        { status: 500 }
      );
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // E-Mail-Konfiguration
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@celeropress.com',
        name: 'CeleroPress Freigaben'
      },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback: HTML zu Text
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: false
        },
        openTracking: {
          enable: true
        }
      },
      mailSettings: {
        sandboxMode: {
          enable: process.env.NODE_ENV !== 'production'
        }
      }
    };

    console.log('Sende Approval-E-Mail:', {
      to,
      subject,
      sandboxMode: process.env.NODE_ENV !== 'production'
    });

    // E-Mail senden
    const result = await sgMail.send(msg);
    
    return NextResponse.json({
      success: true,
      messageId: result[0]?.headers?.['x-message-id'],
      message: 'Approval-E-Mail erfolgreich gesendet'
    });

    } catch (error: any) {
    console.error('Fehler beim Senden der Approval-E-Mail:', error);
    
    // SendGrid-spezifische Fehlerbehandlung
    if (error?.response?.body?.errors) {
      return NextResponse.json(
        {
          error: 'SendGrid Fehler',
          details: error.response.body.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Fehler beim Senden der E-Mail',
        details: error.message
      },
      { status: 500 }
    );
    }
  },
  ['publications:write'] // Required permissions
);