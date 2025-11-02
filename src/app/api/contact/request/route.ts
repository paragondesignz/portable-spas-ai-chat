import { NextRequest, NextResponse } from 'next/server';
import { updateContactInfo, getChatLogWithMessages } from '@/lib/blob-db';
import { sendCallbackNotification, sendCustomerConfirmation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, email, phone, notes } = body;

    // Validation
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Either email or phone is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Update contact info in database
    const updatedLog = await updateContactInfo(sessionId, {
      email,
      phone,
      notes,
    });

    if (!updatedLog) {
      return NextResponse.json(
        { error: 'Failed to update contact information' },
        { status: 500 }
      );
    }

    // Get full chat log with messages for notification
    const { log, messages } = await getChatLogWithMessages(sessionId);

    if (!log) {
      return NextResponse.json(
        { error: 'Chat log not found' },
        { status: 404 }
      );
    }

    // Send notification email to business
    const notificationResult = await sendCallbackNotification({
      userName: log.user_name,
      email,
      phone,
      notes,
      sessionId,
      recentMessages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    if (!notificationResult.success) {
      console.error('Failed to send notification email:', notificationResult.error);
      // Don't fail the request if email fails - contact info is still saved
    }

    // Send confirmation email to customer if email provided
    if (email) {
      const confirmationResult = await sendCustomerConfirmation(email, log.user_name);
      if (!confirmationResult.success) {
        console.error('Failed to send confirmation email:', confirmationResult.error);
        // Don't fail the request if confirmation email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Callback request received successfully',
    });
  } catch (error) {
    console.error('Error handling callback request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
