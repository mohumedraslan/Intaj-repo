import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/integrations/email';

/**
 * Test endpoint for sending emails
 * This is a protected route that requires authentication
 */
export async function POST(request: NextRequest) {
  // Create a Supabase client for authentication
  const supabase = createRouteHandlerClient({ cookies });
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Parse the request body
    const body = await request.json();
    const { agentId, agentName, to, subject, body: emailBody, html } = body;
    
    // Validate required fields
    if (!agentId || !to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, to, subject, body' },
        { status: 400 }
      );
    }
    
    // Send the email
    const result = await sendEmail({
      agent: {
        id: agentId,
        name: agentName || 'Intaj Agent',
      },
      to,
      subject,
      body: emailBody,
      html,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: result.data,
    });
  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}