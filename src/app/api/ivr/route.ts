import { NextRequest, NextResponse } from 'next/server';

// Simulated IVR webhook endpoint
// In production this would receive Twilio/Exotel webhook payloads
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, digit } = body;

  const categoryMap: Record<string, string> = {
    '1': 'food',
    '2': 'medical',
    '3': 'rescue',
    '4': 'water',
    '5': 'shelter',
  };

  const category = categoryMap[digit] ?? 'food';

  return NextResponse.json({
    success: true,
    message: `IVR request received from ${phone}`,
    category,
    requestId: `REQ-IVR-${Date.now()}`,
    instructions: `Your request for ${category} has been registered. A volunteer will contact you shortly.`,
  });
}

export async function GET() {
  return NextResponse.json({
    service: 'SahayakNet IVR Webhook',
    status: 'active',
    endpoints: {
      post: 'POST /api/ivr – Receive IVR digit press',
      format: '{ phone: string, digit: "1"|"2"|"3"|"4"|"5" }',
    },
    digitMap: {
      '1': 'Food',
      '2': 'Medical',
      '3': 'Rescue',
      '4': 'Water',
      '5': 'Shelter',
    },
  });
}
