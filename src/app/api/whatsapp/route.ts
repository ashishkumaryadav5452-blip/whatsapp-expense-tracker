import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  return new NextResponse("WhatsApp Webhook is Active!", { status: 200 });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const incomingMsg = formData.get('Body')?.toString() || '';
    const userPhone = formData.get('From')?.toString() || '';

    // Regex to extract amount (e.g., "Paid 100 for chai" -> 100)
    const amountMatch = incomingMsg.match(/\d+/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;

    // Save to Supabase
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
      replyText += ` (Failed to save to database)`;
    } else {
      replyText += ` Saved to Database! 💰 (Amount: ₹${amount})`;
    }

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${replyText}</Message>
</Response>`;

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}