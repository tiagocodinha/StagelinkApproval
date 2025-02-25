import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, recipientEmail, recipientName, contentType, contentId, status, assignerName, reviewerName } = await req.json()

    // Configure SMTP client (replace with your SMTP settings)
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') || '',
      port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      username: Deno.env.get('SMTP_USERNAME') || '',
      password: Deno.env.get('SMTP_PASSWORD') || '',
    });

    let subject = '';
    let body = '';

    if (type === 'content_assigned') {
      subject = `New Content Assigned: ${contentType}`;
      body = `
        <h2>New Content Has Been Assigned to You</h2>
        <p>Hello ${recipientName},</p>
        <p>${assignerName} has assigned a new ${contentType} for your review.</p>
        <p>Please log in to the Social Media Approval System to review and approve/reject this content.</p>
        <p><a href="${Deno.env.get('APP_URL')}">Click here to review</a></p>
      `;
    } else if (type === 'content_status_updated') {
      subject = `Content ${status}: ${contentType}`;
      body = `
        <h2>Content Status Updated</h2>
        <p>Hello ${recipientName},</p>
        <p>Your ${contentType} has been ${status.toLowerCase()} by ${reviewerName}.</p>
        <p>Please log in to the Social Media Approval System to view the details.</p>
        <p><a href="${Deno.env.get('APP_URL')}">Click here to view</a></p>
      `;
    }

    // Send email
    await client.send({
      from: Deno.env.get('SMTP_FROM') || '',
      to: recipientEmail,
      subject: subject,
      content: 'text/html',
      html: body,
    });

    await client.close();

    return new Response(
      JSON.stringify({ message: 'Notification sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})