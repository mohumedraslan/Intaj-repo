import { Resend } from 'resend';

// Initialize the Resend client with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  agent: {
    id: string;
    name: string;
  };
  to: string;
  subject: string;
  body: string;
  html?: string; // Optional HTML content
}

/**
 * Sends an email using the Resend service
 * @param params Email parameters including agent info, recipient, subject, and content
 * @returns Response from the email service
 */
export async function sendEmail(params: SendEmailParams) {
  const { agent, to, subject, body, html } = params;
  
  try {
    // Use a fixed sender address
    const from = 'onboarding@intaj.ai';
    
    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text: body,
      html: html || body, // Use HTML if provided, otherwise use plain text
      tags: [
        {
          name: 'agent_id',
          value: agent.id,
        },
        {
          name: 'agent_name',
          value: agent.name,
        },
      ],
    });

    if (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}