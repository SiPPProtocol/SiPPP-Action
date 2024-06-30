import { FrameRequest, getFrameMessage } from '@coinbase/onchainkit/frame';
import { NextRequest, NextResponse } from 'next/server';

async function getResponse(req: NextRequest): Promise<NextResponse> {
  const body: FrameRequest = await req.json();
  const { isValid, message } = await getFrameMessage(body, { neynarApiKey: 'NEYNAR_ONCHAIN_KIT' });

  if (!isValid || !message) {
    return new NextResponse('Message not valid', { status: 500 });
  }

  // Find the url, if any
  const embedUrl = message?.raw?.action?.cast?.embeds?.[0]?.url;
  if (!embedUrl) {
    return NextResponse.json({ message: '🤦 No photograph detected.'}, { status: 200 });
  }

  // Get an IPFS hash, if any
  const ipfsHash = getIPFSHash(embedUrl)
  if (!ipfsHash) {
    return NextResponse.json({ message: '🤷 No hash detected. Unable to verify.'}, { status: 200 });
  }
  console.log(ipfsHash);
  
  return NextResponse.json({ message: 'Hello from the frame route. Writing a lot of stuff. /n with line breaks' }, { status: 200 });
}

function getIPFSHash(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    
    // Check if the URL is an IPFS URL
    const isIPFS = parsedUrl.protocol === 'ipfs:' || 
                    parsedUrl.hostname.endsWith('.ipfs.dweb.link') || 
                    parsedUrl.hostname.endsWith('.ipfs.infura-ipfs.io') ||
                    parsedUrl.hostname.endsWith('.ipfs.cf-ipfs.com') ||
                    parsedUrl.pathname.startsWith('/ipfs/');
    
    if (!isIPFS) {
      return null;
    }
    
    // Extract the hash
    let hash: string | null = null;
    if (parsedUrl.protocol === 'ipfs:') {
      hash = parsedUrl.hostname + parsedUrl.pathname;
    } else if (parsedUrl.pathname.startsWith('/ipfs/')) {
      hash = parsedUrl.pathname.split('/ipfs/')[1].split('/')[0];
    } else if (parsedUrl.hostname.endsWith('.ipfs.dweb.link') ||
                parsedUrl.hostname.endsWith('.ipfs.infura-ipfs.io') ||
                parsedUrl.hostname.endsWith('.ipfs.cf-ipfs.com')) {
      hash = parsedUrl.hostname.split('.')[0];
    }
    
    return hash;
  } catch (error) {
    return null;
  }
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
