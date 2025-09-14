import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { decrypt } from '@/lib/security/encryption';

interface EmailReaderParams {
  agentId: string;
  userId: string;
}

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
}

/**
 * Reads recent emails for a given agent's connected Google account.
 * @param params - The agentId and userId.
 * @returns A formatted string of recent emails or an error message.
 */
export async function readEmailsForAgent({ agentId, userId }: EmailReaderParams): Promise<string> {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Fetch the connection details from the database
  const { data: connection, error: connError } = await supabase
    .from('connections')
    .select('credentials')
    .eq('chatbot_id', agentId)
    .eq('user_id', userId)
    .eq('platform', 'google')
    .single();

  if (connError || !connection || !connection.credentials) {
    console.error('No valid Google connection found for agent:', agentId, connError);
    return 'Error: Could not find a valid Google connection for this agent. Please connect your Google account in the agent settings.';
  }

  try {
    // 2. Decrypt the stored refresh token
    const refreshToken = decrypt(connection.credentials as string);

    // 3. Initialize Google OAuth2 client and set credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // 4. Create a Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 5. Fetch the list of recent messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread', // Fetch unread emails
      maxResults: 5, // Limit to the 5 most recent
    });

    const messages = listResponse.data.messages;
    if (!messages || messages.length === 0) {
      return 'No unread emails found.';
    }

    // 6. Fetch details for each message
    const emailPromises = messages.map(async (message) => {
      if (message.id) {
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata', // We only need headers and a snippet
          metadataHeaders: ['From', 'Subject'],
        });

        const headers = msgResponse.data.payload?.headers;
        const fromHeader = headers?.find(h => h.name === 'From');
        const subjectHeader = headers?.find(h => h.name === 'Subject');

        return {
          id: msgResponse.data.id,
          from: fromHeader?.value || 'Unknown Sender',
          subject: subjectHeader?.value || 'No Subject',
          snippet: msgResponse.data.snippet || '',
        };
      }
      return null;
    });

    const emails = (await Promise.all(emailPromises)).filter(Boolean) as Email[];

    // 7. Format the emails into a string for the AI context
    if (emails.length === 0) {
      return 'No unread emails found.';
    }

    let formattedEmails = 'Here are the most recent unread emails:\n\n';
    for (const email of emails) {
      formattedEmails += `From: ${email.from}\n`;
      formattedEmails += `Subject: ${email.subject}\n`;
      formattedEmails += `Snippet: ${email.snippet}\n\n`;
    }

    return formattedEmails;

  } catch (error) {
    console.error('Error reading emails for agent:', agentId, error);
    // This could be due to an expired refresh token or insufficient permissions.
    // In a real app, we might want to prompt the user to re-authenticate.
    return 'Error: Failed to read emails. The connection may have expired. Please try reconnecting your Google account.';
  }
}
