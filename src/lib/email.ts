import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface CallbackRequestData {
  userName: string;
  email?: string;
  phone?: string;
  notes?: string;
  sessionId: string;
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * Send email notification when customer requests callback
 */
export async function sendCallbackNotification(data: CallbackRequestData) {
  try {
    const fromEmail = (process.env.FROM_EMAIL || 'noreply@portablespas.co.nz').trim();
    const toEmail = (process.env.NOTIFICATION_EMAIL || 'sales@portablespas.co.nz').trim();

    // Format recent conversation
    const conversationHtml = data.recentMessages
      .slice(-5) // Last 5 messages
      .map(msg => {
        const role = msg.role === 'user' ? 'Customer' : 'AI Assistant';
        return `
          <div style="margin-bottom: 15px;">
            <strong style="color: ${msg.role === 'user' ? '#2563eb' : '#059669'};">${role}:</strong>
            <p style="margin: 5px 0 0 0; color: #374151;">${msg.content}</p>
          </div>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔔 New Callback Request</h1>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; font-size: 18px; margin-top: 0;">Customer Details</h2>

            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Name:</td>
                <td style="padding: 8px 0;">${data.userName}</td>
              </tr>
              ${data.email ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Email:</td>
                <td style="padding: 8px 0;">
                  <a href="mailto:${data.email}" style="color: #2563eb; text-decoration: none;">${data.email}</a>
                </td>
              </tr>
              ` : ''}
              ${data.phone ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Phone:</td>
                <td style="padding: 8px 0;">
                  <a href="tel:${data.phone}" style="color: #2563eb; text-decoration: none;">${data.phone}</a>
                </td>
              </tr>
              ` : ''}
              ${data.notes ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563; vertical-align: top;">Best time to call:</td>
                <td style="padding: 8px 0;">${data.notes}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Session ID:</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${data.sessionId}</td>
              </tr>
            </table>

            ${data.recentMessages.length > 0 ? `
            <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 10px;">Recent Conversation</h2>
            <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
              ${conversationHtml}
            </div>
            ` : ''}

            <div style="margin-top: 25px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af;">
                <strong>⏰ Response Target:</strong> Contact within 1-2 hours during business hours
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">
                Business Hours: ${(process.env.BUSINESS_HOURS_TEXT || 'Monday, Wednesday, Friday: 10am - 4pm NZST').trim()}
              </p>
            </div>

            <div style="margin-top: 20px; text-align: center;">
              <a href="https://portable-spas-ai-chat.vercel.app/admin/chats"
                 style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View in Admin Dashboard
              </a>
            </div>
          </div>

          <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This notification was sent from your Portable Spas AI Assistant</p>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error } = await getResend().emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `🔔 New Callback Request - ${data.userName}`,
      html,
    });

    if (error) {
      console.error('Error sending callback notification:', error);
      return { success: false, error };
    }

    console.log('Callback notification sent successfully:', emailData);
    return { success: true, data: emailData };
  } catch (error) {
    console.error('Error in sendCallbackNotification:', error);
    return { success: false, error };
  }
}

/**
 * Send confirmation email to customer
 */
export async function sendCustomerConfirmation(email: string, userName: string) {
  try {
    const fromEmail = (process.env.FROM_EMAIL || 'noreply@portablespas.co.nz').trim();

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✓ Callback Request Received</h1>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #1f2937;">Hi ${userName},</p>

            <p style="color: #4b5563;">
              Thank you for requesting a callback! We've received your message and one of our team members will be in touch soon.
            </p>

            <div style="background-color: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46; font-weight: bold;">📞 What happens next?</p>
              <p style="margin: 10px 0 0 0; color: #047857;">
                We typically respond within <strong>1-2 hours during business hours</strong>.
              </p>
            </div>

            <div style="padding: 15px; background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #1f2937;">Our Business Hours:</p>
              <p style="margin: 5px 0 0 0; color: #4b5563;">
                ${(process.env.BUSINESS_HOURS_TEXT || 'Monday, Wednesday, Friday: 10am - 4pm NZST').trim()}
              </p>
            </div>

            <p style="color: #4b5563;">
              If you have any urgent questions in the meantime, feel free to continue chatting with our AI assistant.
            </p>

            <p style="color: #4b5563; margin-top: 25px;">
              Best regards,<br>
              <strong>The Portable Spas Team</strong>
            </p>
          </div>

          <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Portable Spas - Your Hot Tub Specialists</p>
            <p style="margin: 5px 0;">
              <a href="https://portablespas.co.nz" style="color: #2563eb; text-decoration: none;">portablespas.co.nz</a>
            </p>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error } = await getResend().emails.send({
      from: fromEmail,
      to: email,
      subject: 'We received your callback request - Portable Spas',
      html,
    });

    if (error) {
      console.error('Error sending customer confirmation:', error);
      return { success: false, error };
    }

    console.log('Customer confirmation sent successfully:', emailData);
    return { success: true, data: emailData };
  } catch (error) {
    console.error('Error in sendCustomerConfirmation:', error);
    return { success: false, error };
  }
}
