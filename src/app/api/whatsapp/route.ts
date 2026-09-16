import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  return new NextResponse("WhatsApp Webhook Active", { status: 200 });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const incomingMsg = formData.get('Body')?.toString() || '';
    const userPhone = formData.get('From')?.toString() || '';

    const amountMatch = incomingMsg.match(/\d+/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;

    const { error } = await supabase.from('expenses').insert([
      {
        amount: amount,
        description: incomingMsg,
        raw_text: incomingMsg,
        user_phone: userPhone,
        category: 'General',
      },
    ]);

    let replyText = `Expense Received: "${incomingMsg}".`;
    if (error) {
      console.error('Supabase Error:', error);
      replyText += ` (Failed to save to DB)`;
    } else {
      replyText += ` Saved to DB! 💰 (Amount: ₹${amount})`;
    }

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${replyText}</Message>
</Response>`;

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err: any) {
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}