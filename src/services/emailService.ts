import type { Communication } from '../types/database';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  tenant_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
}

export interface EmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<Communication>;
}

/**
 * Mock Email Provider for POC
 * Simulates real email delivery by recording formatted HTML email communications into database store
 */
export class MockEmailProvider implements EmailProvider {
  async sendEmail(payload: SendEmailPayload): Promise<Communication> {
    const newComm: Communication = {
      id: 'comm-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tenant_id: payload.tenant_id,
      recipient: payload.to,
      subject: payload.subject,
      communication_type: 'Email',
      template: payload.template,
      content_html: payload.html,
      content_text: payload.text,
      status: 'Demo Sent', // POC delivery status
      related_entity_type: payload.related_entity_type,
      related_entity_id: payload.related_entity_id,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    console.log(`[MockEmailProvider] Email simulated for ${payload.to}: ${payload.subject}`);
    return newComm;
  }
}

/**
 * Future Resend Email Provider (Placeholder for Production integration)
 */
export class ResendEmailProvider implements EmailProvider {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (import.meta as any).env?.VITE_RESEND_API_KEY;
  }

  async sendEmail(payload: SendEmailPayload): Promise<Communication> {
    if (!this.apiKey) {
      throw new Error("Resend API key missing. Please set VITE_RESEND_API_KEY in environment variables.");
    }
    // Future integration logic with Resend API
    throw new Error("Resend provider is not activated in POC environment. Using MockEmailProvider.");
  }
}

// Active provider instance (MockEmailProvider default for POC)
export const emailProvider: EmailProvider = new MockEmailProvider();
