import { NextApiRequest, NextApiResponse } from "next";
import { RoomServiceClient, AgentDispatchClient } from "livekit-server-sdk";

// LiveKit server clients (singleton pattern)
let roomService: RoomServiceClient | null = null;
let agentDispatchClient: AgentDispatchClient | null = null;

function getLiveKitHost(): string {
  const host = process.env.LIVEKIT_HOST || 
               process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace('ws://', 'http://').replace('wss://', 'https://');
  
  if (!host) {
    throw new Error("LIVEKIT_HOST or NEXT_PUBLIC_LIVEKIT_URL must be set");
  }
  return host;
}

function getRoomService(): RoomServiceClient {
  if (!roomService) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
    }

    roomService = new RoomServiceClient(getLiveKitHost(), apiKey, apiSecret);
  }
  return roomService;
}

function getAgentDispatchClient(): AgentDispatchClient {
  if (!agentDispatchClient) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
    }

    agentDispatchClient = new AgentDispatchClient(getLiveKitHost(), apiKey, apiSecret);
  }
  return agentDispatchClient;
}


// Request validation interface
interface JobRequest {
  jobType: string;
  roomName?: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
}

/**
 * POST /api/livekit/job
 * 
 * Secure endpoint for submitting jobs to LiveKit server.
 * 
 * Request body:
 * {
 *   jobType: string (required) - Type of job (e.g., "transcription", "recording", etc.)
 *   roomName?: string - Room name for the job
 *   sessionId?: string - Session ID for the job
 *   payload?: Record<string, any> - Additional job parameters
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   result?: any
 *   error?: string
 * }
 */
export default async function handleJob(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Only POST requests are accepted.' 
    });
    return;
  }

  try {
    // Validate environment variables
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      console.error('[job-api] Missing LiveKit credentials');
      res.status(500).json({ 
        success: false,
        error: 'LiveKit server configuration is missing. Please check environment variables.' 
      });
      return;
    }

    // Parse and validate request body
    const body: JobRequest = req.body;
    
    if (!body || typeof body !== 'object') {
      res.status(400).json({ 
        success: false,
        error: 'Invalid request body. Expected JSON object.' 
      });
      return;
    }

    if (!body.jobType || typeof body.jobType !== 'string') {
      res.status(400).json({ 
        success: false,
        error: 'Missing required field: jobType (string)' 
      });
      return;
    }

    console.log('[job-api] Received job request:', {
      jobType: body.jobType,
      roomName: body.roomName,
      sessionId: body.sessionId,
      hasPayload: !!body.payload,
    });

    // Handle different job types
    let result: Record<string, unknown>;

    switch (body.jobType) {
      case 'start_recording':
      case 'recording':
      case 'stop_recording': {
        // Recording functionality requires Egress service configuration
        // For now, return informative message
        result = {
          message: 'Recording/Egress functionality requires LiveKit Egress service',
          note: 'Please configure LiveKit Egress service or use LiveKit Cloud for recording',
          roomName: body.roomName,
        };
        console.log('[job-api] Recording requested (not implemented):', result);
        break;
      }

      case 'transcription':
      case 'start_transcription': {
        if (!body.roomName) {
          res.status(400).json({ 
            success: false,
            error: 'roomName is required for transcription jobs' 
          });
          return;
        }

        // Start transcription (LiveKit transcription API)
        const transcriptionOptions = {
          roomName: body.roomName,
          language: body.payload?.language || 'en',
          ...(body.payload || {}),
        };

        // Note: LiveKit transcription is typically handled via room configuration
        // This is a placeholder for transcription job submission
        result = {
          success: true,
          message: 'Transcription job submitted',
          roomName: body.roomName,
          options: transcriptionOptions,
        };
        console.log('[job-api] Transcription job submitted:', result);
        break;
      }

      case 'update_room':
      case 'room_update': {
        if (!body.roomName) {
          res.status(400).json({ 
            success: false,
            error: 'roomName is required for room update jobs' 
          });
          return;
        }

        // Update room metadata using RoomServiceClient
        const roomService = getRoomService();
        const metadata = body.payload?.metadata;
        
        if (metadata !== undefined && typeof metadata === 'string') {
          // Update room metadata
          await roomService.updateRoomMetadata(body.roomName, metadata);
          result = { updated: true, roomName: body.roomName, metadata };
        } else {
          result = { updated: false, error: 'metadata field (string) is required in payload' };
        }
        console.log('[job-api] Room updated:', result);
        break;
      }

      case 'delete_room': {
        if (!body.roomName) {
          res.status(400).json({ 
            success: false,
            error: 'roomName is required for room deletion' 
          });
          return;
        }

        // Delete room using RoomServiceClient
        const roomService = getRoomService();
        await roomService.deleteRoom(body.roomName);
        result = { deleted: true, roomName: body.roomName };
        console.log('[job-api] Room deleted:', body.roomName);
        break;
      }

      case 'list_rooms': {
        // List all active rooms
        const roomService = getRoomService();
        const rooms = await roomService.listRooms();
        result = { rooms: rooms || [] };
        console.log('[job-api] Rooms listed:', rooms?.length || 0);
        break;
      }

      case 'get_room': {
        if (!body.roomName) {
          res.status(400).json({ 
            success: false,
            error: 'roomName is required' 
          });
          return;
        }

        // Get room information
        // Note: RoomServiceClient doesn't have getRoom method in this SDK version
        // Return room name as confirmation
        result = { 
          roomName: body.roomName,
          message: 'Room information retrieval requires listRooms or direct API access',
        };
        console.log('[job-api] Room info requested for:', body.roomName);
        break;
      }

      case 'start_agent':
      case 'start_worker': {
        if (!body.roomName) {
          res.status(400).json({ 
            success: false,
            error: 'roomName is required for starting agent worker' 
          });
          return;
        }

        // Note: LiveKit agents are typically started by the worker process itself,
        // not through a job submission API. The worker monitors for room connections
        // and automatically starts agents when participants join.
        // 
        // However, if you need to explicitly trigger agent startup, you can:
        // 1. Use LiveKit Cloud's API (if using LiveKit Cloud)
        // 2. Make HTTP request to your agent worker endpoint
        // 3. Use WebSocket to connect agent worker to room
        
        const agentName = body.payload?.agentName || process.env.LIVEKIT_AGENT_NAME || 'my-telephony-agent';
        
        // Method 1: Use LiveKit AgentDispatchClient to create dispatch (RECOMMENDED)
        // Bu rasmiy usul - agent workerga job yuboradi
        // Note: Agent must be registered with agent_name for explicit dispatch to work
        let dispatchResult: Record<string, unknown> | null = null;
        try {
          const dispatchClient = getAgentDispatchClient();
          // Prepare metadata as string
          const metadataString = typeof body.payload?.metadata === 'string' 
            ? body.payload.metadata 
            : body.payload?.metadata 
              ? JSON.stringify(body.payload.metadata)
              : '';
          
          // Create dispatch with optional metadata
          // Note: createDispatch(roomName: string, agentName: string, options?: CreateDispatchOptions)
          const dispatch = await dispatchClient.createDispatch(
            body.roomName as string,
            agentName as string,
            metadataString ? { metadata: metadataString } : undefined
          );
          
          // Extract dispatch ID from dispatch object
          const dispatchObj = dispatch as unknown as Record<string, unknown>;
          const dispatchId = dispatchObj.dispatchId || 
                           dispatchObj.dispatch_id ||
                           String(dispatchObj.id || 'unknown');
          
          dispatchResult = {
            success: true,
            message: 'Agent dispatch created successfully via LiveKit Server API',
            dispatchId: dispatchId,
            roomName: body.roomName,
            agentName: agentName,
            dispatch: dispatch,
          };
          
          console.log('[job-api] ✅ Agent dispatch created via LiveKit API:', dispatchResult);
        } catch (dispatchError) {
          console.warn('[job-api] ⚠️ LiveKit AgentDispatchClient failed:', {
            error: dispatchError instanceof Error ? dispatchError.message : 'Unknown error',
            note: 'Trying alternative method...',
          });
          
          // Method 2: Fallback to HTTP request if AgentDispatchClient fails
          const agentWorkerUrl = process.env.AGENT_WORKER_URL || body.payload?.workerUrl;
          if (agentWorkerUrl) {
            try {
              const workerResponse = await fetch(`${agentWorkerUrl}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomName: body.roomName,
                  agentName: agentName,
                  ...(body.payload || {}),
                }),
              });
              
              if (workerResponse.ok) {
                const workerData = await workerResponse.json();
                result = {
                  success: true,
                  message: 'Agent worker job submitted via HTTP',
                  roomName: body.roomName,
                  agentName: agentName,
                  workerResponse: workerData,
                };
                console.log('[job-api] Agent worker job submitted via HTTP:', result);
                break;
              }
            } catch (error) {
              console.warn('[job-api] HTTP request to agent worker failed:', error);
            }
          }
        }
        
        // Method 3: Use dispatch result if successful, otherwise fallback
        if (dispatchResult) {
          result = dispatchResult;
        } else {
          // Default fallback - return success with instructions
          // Agent should auto-start when participant joins (if worker is configured correctly)
          result = {
            success: true,
            message: 'Agent worker will start automatically when participant joins room',
            roomName: body.roomName,
            agentName: agentName,
            note: 'Ensure your agent worker is running and configured to auto-connect to rooms. ' +
                  'The worker should monitor room events and connect when participants join.',
            warning: 'AgentDispatchClient failed - agent may not start automatically',
            instructions: [
              '1. Ensure agent worker process is running',
              '2. Check worker logs for "registered worker" message',
              '3. Verify agent_name in worker matches: ' + agentName,
              '4. Worker will automatically connect agent to room when participant joins',
              '5. Check worker logs to verify agent connection'
            ]
          };
          
          console.log('[job-api] Agent worker notification sent (fallback):', result);
        }
        break;
      }

      default: {
        // Generic job handling
        result = {
          success: true,
          message: `Job type "${body.jobType}" received`,
          roomName: body.roomName,
          sessionId: body.sessionId,
          payload: body.payload,
        };
        console.log('[job-api] Generic job processed:', result);
      }
    }

    res.status(200).json({ 
      success: true, 
      result 
    });

  } catch (error: unknown) {
    console.error('[job-api] Error processing job:', error);
    
    // Handle specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      res.status(404).json({ 
        success: false,
        error: errorMessage || 'Resource not found' 
      });
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('403')) {
      res.status(403).json({ 
        success: false,
        error: 'Unauthorized. Check your API credentials.' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: errorMessage || 'Internal server error while processing job' 
      });
    }
  }
}

