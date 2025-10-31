import { NextApiRequest, NextApiResponse } from "next";
import { AccessToken, VideoGrant } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

export default async function handleToken(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!apiKey || !apiSecret) {
      res.statusMessage = "Environment variables aren't set up correctly";
      res.status(500).end();
      return;
    }

    // Extract basic parameters
    // Har safar yangi room name generatsiya qilish (agar roomName query param bo'lmasa)
    let roomName = req.query.roomName as string;
    if (!roomName || roomName === 'finarum-room') {
      // Yangi UUID-based room name generatsiya qilish
      roomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    const identity = (req.query.participantName as string) || `user-${Math.random().toString(36).substring(7)}`;

    console.log('[token-api] Generating token for:', { roomName, identity });

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    // Create AccessToken with proper expiration
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: identity,
      ttl: 3600, // Token valid for 1 hour
    });
    
    at.addGrant(grant);
    const token = await at.toJwt();

    console.log('[token-api] Token generated successfully');

    res.status(200).json({ 
      accessToken: token,
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL || ""
    });
  } catch (e) {
    console.error('[token-api] Error generating token:', e);
    res.statusMessage = (e as Error).message;
    res.status(500).end();
  }
}