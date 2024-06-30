import { FrameRequest, getFrameMessage } from '@coinbase/onchainkit/frame';
import { NextRequest, NextResponse } from 'next/server';

async function getResponse(req: NextRequest): Promise<NextResponse> {
  const body: FrameRequest = await req.json();
  const { isValid, message } = await getFrameMessage(body, { neynarApiKey: 'NEYNAR_ONCHAIN_KIT' });
  console.log(message.raw);

  if (!isValid) {
    return new NextResponse('Message not valid', { status: 500 });
  }
  
  return NextResponse.json({ message: 'Hello from the frame route. Writing a lot of stuff. /n with line breaks' }, { status: 200 });
}
  
export async function POST(req: NextRequest): Promise<Response> {
  console.log('POST');
  return getResponse(req);
}
  
export async function GET(req: NextRequest): Promise<Response> {
  console.log('GET');
  return NextResponse.json({
    "name": "Verify with SiPPP",
    "icon": "verify",
    "description": "Verify that this photo has been registered with SiPPP 🥤",
    "aboutUrl": "https://sippp.box",
    "action": {
      "type": "post",
      "postUrl": "https://si-ppp-action.vercel.app/api/action"
    }
  }, { status: 200 })
}
  
export const dynamic = 'force-dynamic';
