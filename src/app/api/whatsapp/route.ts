import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const incomingMsg = formData.get('Body') || '';
    const mediaUrl = formData.get('MediaUrl0'); // Notebook/bill photo if sent

    let replyText = '';

    if (mediaUrl) {
      replyText = 'Photo receive ho gayi! Gemini AI data process kar raha hai...';
    } else {
      replyText = `Expense Received: "${incomingMsg}". Entry update ho gayi hai!`;
    }

    // Twilio Webhook Response Format (TXML)
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${replyText}</Message>
</Response>`;

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error handling WhatsApp message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}