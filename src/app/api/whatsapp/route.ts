import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse("WhatsApp Webhook is Active!", { status: 200 });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const incomingMsg = formData.get('Body') || '';

    const replyText = `Expense Received: "${incomingMsg}". Entry update ho gayi hai!`;

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
  } catch (error: any) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}