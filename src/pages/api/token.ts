import { NextApiRequest, NextApiResponse } from "next";
import { AccessToken, VideoGrant } from "livekit-server-sdk";
import { allowRequest, getClientIp, parseSafeName } from "@/utils/apiGuard";
import { debug } from "@/utils/logger";

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
    if (!allowRequest("token", getClientIp(req), 30)) {
      res.setHeader("Retry-After", "60");
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    if (!apiKey || !apiSecret) {
      res.statusMessage = "Environment variables aren't set up correctly";
      res.status(500).end();
      return;
    }

    // Validate input: strings, trimmed, max 64 chars, safe charset
    const parsedRoom = parseSafeName(req.query.roomName);
    const parsedName = parseSafeName(req.query.participantName);
    if (parsedRoom === null || parsedName === null) {
      res.status(400).json({ error: "Invalid roomName or participantName" });
      return;
    }

    // Generate a new room name when none is given (or the legacy placeholder is used)
    let roomName = parsedRoom;
    if (!roomName || roomName === 'finarum-room') {
      roomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    const identity = parsedName || `user-${Math.random().toString(36).substring(7)}`;

    if (process.env.NODE_ENV !== 'production') {
      debug('[token-api] Generating token for room:', roomName);
    }

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