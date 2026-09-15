import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import type { NextRequest } from "next/server";

type ExpenseParse = {
  amount: number;
  category: string;
  description: string;
};

type WhatsAppTextMessage = {
  type?: string;
  text?: { body?: string };
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppTextMessage[];
      };
    }>;
  }>;
};

function getSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/rest\/v1\/?$/,
    ""
  );
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createClient(url, key);
}

function extractIncomingText(payload: WhatsAppWebhookPayload): string | null {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type === "text" && message.text?.body?.trim()) {
          return message.text.body.trim();
        }
      }
    }
  }
  return null;
}

function parseExpenseJson(content: string): ExpenseParse {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Groq did not return JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<ExpenseParse>;
  const amount = Number(parsed.amount);

  if (!Number.isFinite(amount) || !parsed.category || !parsed.description) {
    throw new Error("Parsed expense is missing required fields");
  }

  return {
    amount,
    category: String(parsed.category),
    description: String(parsed.description),
  };
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "mytoken123";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WhatsAppWebhookPayload;
    const rawText = extractIncomingText(payload);

    if (!rawText) {
      return Response.json({ success: true, skipped: true });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Extract an expense from the user message. Reply with JSON only in this shape: {"amount": number, "category": string, "description": string}. amount is a number without currency symbols. category is a short label like food, travel, groceries, bills, shopping, or other. description is a brief summary of the spend.',
        },
        { role: "user", content: rawText },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const expense = parseExpenseJson(content);

    const supabase = getSupabase();
    const { error } = await supabase.from("expenses").insert({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      raw_text: rawText,
    });

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      expense: {
        ...expense,
        raw_text: rawText,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process webhook";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
