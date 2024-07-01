import { FrameRequest, getFrameMessage } from '@coinbase/onchainkit/frame';
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import exif from 'exif';

const notDetected = '🤦 No image detected.'
const notVerified = '❓ The image in this cast cannot be verified.'

async function getResponse(req: NextRequest): Promise<NextResponse> {
  const body: FrameRequest = await req.json();
  const { isValid, message } = await getFrameMessage(body, { neynarApiKey: 'NEYNAR_ONCHAIN_KIT' });

  if (!isValid || !message) {
    return new NextResponse('Message not valid', { status: 500 });
  }

  // Find the url, if any
  const embedUrl = message?.raw?.action?.cast?.embeds?.[0]?.url;
  if (!embedUrl) {
    return NextResponse.json({ message: notDetected}, { status: 200 });
  }

  // Get an IPFS hash, if any
  const ipfsHash = getIPFSHash(embedUrl)
  if (!ipfsHash) {
    return NextResponse.json({ message: notVerified}, { status: 200 });
  }

  // Get the image
  const imageBuffer = await loadImageFromIPFS(ipfsHash);
  if (!imageBuffer) {
    return NextResponse.json({ message: notDetected}, { status: 200 });
  }

  // Get the metadata
  let imageMetadata = null;
  try {
    imageMetadata = await extractMetadataFromImage(imageBuffer);
  } catch (error) {} // Swallow errors, probably a PNG.
  if (!imageMetadata) {
    return NextResponse.json({ message: notVerified}, { status: 200 });
  }
  const metadataSummary = getMetadataSummary(imageMetadata);

  // Finally, check the SiPPP smart contract to see if this is registered
  const verified = verifySmartContract(ipfsHash);
  if (!verified) {
    // We got this far, so let's give em something about the image metadata.
    const message = `❓ Cannot verify. Metadata: photo ${metadataSummary}`}
    console.log(message);
    return NextResponse.json({ message }, { status: 200 });
  }
  
  // If you got this far, it's def a real photo registered with SiPPP!
  const message = `✅ Verified! Photo ${metadataSummary}`;
  console.log(message);
  return NextResponse.json({ message }, { status: 200 });
}

type ImageMetadata = {
  image?: {
    Make?: string;
    Model?: string;
    ModifyDate?: string;
  };
};

function getMetadataSummary(imageMetadata: ImageMetadata): string {
  const make = imageMetadata?.image?.Make || '';
  const model = imageMetadata?.image?.Model || 'camera';
  const date = imageMetadata?.image?.ModifyDate || 'an unknown date';
  return `taken with ${make} ${model} on ${date}`
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

function verifySmartContract(ipfsHash: string): Boolean {
  // CODE TO VERIFY SMART CONTRACT GOES HERE
  return false;
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
