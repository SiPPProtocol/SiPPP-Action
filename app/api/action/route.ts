import { FrameRequest, getFrameMessage } from '@coinbase/onchainkit/frame';
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import exif from 'exif';


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
    return NextResponse.json({ message: '❓ The photo in this post cannot be verified.'}, { status: 200 });
  }
  console.log(ipfsHash);

  // Get the image and metadata
  const imageBuffer = await loadImageFromIPFS(ipfsHash);
  if (!imageBuffer) {
    return NextResponse.json({ message: '🤦 No photograph detected.'}, { status: 200 });
  }
  const exifData = await extractMetadataFromImage(imageBuffer);
  console.log(exifData);
  const exifDataString = JSON.stringify(exifData);

  // Check the SiPPP smart contract to see if this is registered
  
  return NextResponse.json({ message: `✅ Photo verified. Metadata: ${exifDataString}` }, { status: 200 });
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

async function loadFetch() {
  const fetchModule = await import('node-fetch');
  return fetchModule.default;
}

async function loadImageFromIPFS(hash: string): Promise<Buffer | null> {
  try {
    const fetch = await loadFetch();
    const response = await fetch(`https://ipfs.infura.io/ipfs/${hash}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image from IPFS: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Error fetching image from IPFS:', error);
    return null;
  }
}
  
function extractMetadataFromImage(buffer: Buffer): Promise<{ [key: string]: any }> {
  return new Promise((resolve, reject) => {
    new exif.ExifImage({ image: buffer }, (error, exifData) => {
      if (error) {
        reject(`Error extracting EXIF data: ${error.message}`);
      } else {
        resolve(exifData);
      }
    });
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  return getResponse(req);
}
  
export async function GET(req: NextRequest): Promise<Response> {
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
