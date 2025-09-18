import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { decrypt } from '@/lib/security/encryption';

interface EmailActionParams {
  agentId: string;
  userId: string;
  action: 'mark_read' | 'archive' | 'delete' | 'reply' | 'sort';
  emailId?: string;
  category?: string;
  replyContent?: string;
}

/**
 * Performs email management actions for a given agent's connected Google account.
 * @param params - The action parameters including agentId, userId, and action type.
 * @returns A success message or error.
 */
export async function performEmailAction({ 
  agentId, 
  userId, 
  action, 
  emailId, 
  category, 
  replyContent 
}: EmailActionParams): Promise<string> {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Fetch the connection details from the database
  const { data: connection, error: connError } = await supabase
    .from('connections')
    .select('credentials')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .eq('platform', 'google')
    .single();

  if (connError || !connection || !connection.credentials) {
    console.error('No valid Google connection found for agent:', agentId, connError);
    return 'Error: Could not find a valid Google connection for this agent.';
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

    switch (action) {
      case 'mark_read':
        if (!emailId) return 'Error: Email ID is required for mark_read action.';
        
        await gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });
        return `Email ${emailId} marked as read.`;

      case 'archive':
        if (!emailId) return 'Error: Email ID is required for archive action.';
        
        await gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            removeLabelIds: ['INBOX']
          }
        });
        return `Email ${emailId} archived.`;

      case 'delete':
        if (!emailId) return 'Error: Email ID is required for delete action.';
        
        await gmail.users.messages.trash({
          userId: 'me',
          id: emailId
        });
        return `Email ${emailId} moved to trash.`;

      case 'sort':
        if (!emailId || !category) return 'Error: Email ID and category are required for sort action.';
        
        // Create or get label for category
        const labelName = `Intaj/${category}`;
        let labelId: string;
        
        try {
          const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
          const existingLabel = labelsResponse.data.labels?.find(
            label => label.name === labelName
          );
          
          if (existingLabel) {
            labelId = existingLabel.id!;
          } else {
            const createLabelResponse = await gmail.users.labels.create({
              userId: 'me',
              requestBody: {
                name: labelName,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
              }
            });
            labelId = createLabelResponse.data.id!;
          }
        } catch (labelError) {
          console.error('Error managing labels:', labelError);
          return 'Error: Failed to create or find category label.';
        }

        // Apply label to email
        await gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: {
            addLabelIds: [labelId]
          }
        });
        return `Email ${emailId} sorted into category: ${category}.`;

      case 'reply':
        if (!emailId || !replyContent) return 'Error: Email ID and reply content are required for reply action.';
        
        // Get original message to extract thread ID and headers
        const originalMessage = await gmail.users.messages.get({
          userId: 'me',
          id: emailId,
          format: 'metadata',
          metadataHeaders: ['Message-ID', 'Subject', 'From', 'To']
        });

        const headers = originalMessage.data.payload?.headers;
        const messageId = headers?.find((h: any) => h.name === 'Message-ID')?.value;
        const subject = headers?.find((h: any) => h.name === 'Subject')?.value;
        const from = headers?.find((h: any) => h.name === 'From')?.value;
        const to = headers?.find((h: any) => h.name === 'To')?.value;

        // Create reply email
        const replySubject = subject?.startsWith('Re:') ? subject : `Re: ${subject}`;
        const replyTo = from;
        
        const rawMessage = [
          `To: ${replyTo}`,
          `Subject: ${replySubject}`,
          `In-Reply-To: ${messageId}`,
          `References: ${messageId}`,
          '',
          replyContent
        ].join('\n');

        const encodedMessage = Buffer.from(rawMessage).toString('base64url');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            threadId: originalMessage.data.threadId,
            raw: encodedMessage
          }
        });
        return `Reply sent to email ${emailId}.`;

      default:
        return 'Error: Unknown action type.';
    }

  } catch (error) {
    console.error('Error performing email action:', error);
    return `Error: Failed to perform ${action} action. The connection may have expired.`;
  }
}

/**
 * Sorts emails automatically based on content analysis
 */
export async function autoSortEmails({ agentId, userId }: { agentId: string; userId: string }): Promise<string> {
  const supabase = createRouteHandlerClient({ cookies });

  // Get connection
  const { data: connection, error: connError } = await supabase
    .from('connections')
    .select('credentials')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .eq('platform', 'google')
    .single();

  if (connError || !connection) {
    return 'Error: No Google connection found.';
  }

  try {
    const refreshToken = decrypt(connection.credentials as string);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get unread emails
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 10
    });

    const messages = listResponse.data.messages;
    if (!messages || messages.length === 0) {
      return 'No unread emails to sort.';
    }

    let sortedCount = 0;

    for (const message of messages) {
      if (message.id) {
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject']
        });

        const headers = msgResponse.data.payload?.headers;
        const from = headers?.find((h: any) => h.name === 'From')?.value || '';
        const subject = headers?.find((h: any) => h.name === 'Subject')?.value || '';
        const snippet = msgResponse.data.snippet || '';

        // Simple categorization logic
        let category = 'General';
        
        if (from.includes('noreply') || from.includes('no-reply') || subject.includes('notification')) {
          category = 'Notifications';
        } else if (subject.toLowerCase().includes('invoice') || subject.toLowerCase().includes('receipt') || subject.toLowerCase().includes('payment')) {
          category = 'Financial';
        } else if (subject.toLowerCase().includes('meeting') || subject.toLowerCase().includes('calendar') || subject.toLowerCase().includes('appointment')) {
          category = 'Meetings';
        } else if (snippet.toLowerCase().includes('promotion') || snippet.toLowerCase().includes('sale') || snippet.toLowerCase().includes('discount')) {
          category = 'Promotions';
        } else if (from.includes('support') || subject.toLowerCase().includes('support') || subject.toLowerCase().includes('help')) {
          category = 'Support';
        }

        if (category !== 'General') {
          await performEmailAction({
            agentId,
            userId,
            action: 'sort',
            emailId: message.id,
            category
          });
          sortedCount++;
        }
      }
    }

    return `Auto-sorted ${sortedCount} emails into categories.`;

  } catch (error) {
    console.error('Error auto-sorting emails:', error);
    return 'Error: Failed to auto-sort emails.';
  }
}
