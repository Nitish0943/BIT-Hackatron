import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, message } = body;

  // Parse keywords from WhatsApp message
  const lower = (message ?? '').toLowerCase();
  let category = 'food';
  if (lower.includes('medical') || lower.includes('doctor') || lower.includes('medicine')) category = 'medical';
  else if (lower.includes('rescue') || lower.includes('trapped') || lower.includes('stuck')) category = 'rescue';
  else if (lower.includes('water') || lower.includes('drink')) category = 'water';
  else if (lower.includes('shelter') || lower.includes('house') || lower.includes('roof')) category = 'shelter';

  // Extract family size
  const numMatch = message.match(/\d+/);
  const familySize = numMatch ? parseInt(numMatch[0]) : 1;

  return NextResponse.json({
    success: true,
    parsed: { category, familySize, phone },
    requestId: `REQ-WA-${Date.now()}`,
    reply: `✅ Namaste! Your request for *${category}* has been received for ${familySize} person(s). Request ID: REQ-WA-${Date.now()}. A volunteer will reach you soon.`,
  });
}
