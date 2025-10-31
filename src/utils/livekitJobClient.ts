/**
 * Client-side utility for calling LiveKit job API endpoint
 * 
 * This utility provides a safe way to submit jobs to LiveKit
 * without exposing API secrets to the client.
 */

export interface JobRequest {
  jobType: 'start_recording' | 'stop_recording' | 'transcription' | 'start_transcription' | 'update_room' | 'delete_room' | 'list_rooms' | 'get_room' | 'start_agent' | 'start_worker' | string;
  roomName?: string;
  sessionId?: string; // For stop_recording, this is the egressId
  payload?: Record<string, any>;
}

export interface JobResponse {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Submit a job to LiveKit via secure API endpoint
 * 
 * @param request Job request parameters
 * @returns Promise<JobResponse>
 * 
 * @example
 * ```ts
 * const result = await submitLiveKitJob({
 *   jobType: 'start_recording',
 *   roomName: 'my-room',
 *   payload: { format: 'mp4' }
 * });
 * 
 * if (result.success) {
 *   console.log('Recording started:', result.result);
 * }
 * ```
 */
export async function submitLiveKitJob(request: JobRequest): Promise<JobResponse> {
  try {
    const response = await fetch('/api/livekit/job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  } catch (error) {
    console.error('[livekitJobClient] Error submitting job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Start room recording
 */
export async function startRecording(roomName: string, options?: Record<string, any>): Promise<JobResponse> {
  return submitLiveKitJob({
    jobType: 'start_recording',
    roomName,
    payload: options,
  });
}

/**
 * Stop room recording
 * @param roomName Room name OR egressId (sessionId)
 */
export async function stopRecording(roomNameOrEgressId: string): Promise<JobResponse> {
  // If it looks like an egress ID, use sessionId, otherwise use roomName
  const isEgressId = roomNameOrEgressId.startsWith('EI_') || roomNameOrEgressId.length > 20;
  
  return submitLiveKitJob({
    jobType: 'stop_recording',
    ...(isEgressId ? { sessionId: roomNameOrEgressId } : { roomName: roomNameOrEgressId }),
  });
}

/**
 * List all active rooms
 */
export async function listRooms(): Promise<JobResponse> {
  return submitLiveKitJob({
    jobType: 'list_rooms',
  });
}

/**
 * Get room information
 */
export async function getRoom(roomName: string): Promise<JobResponse> {
  return submitLiveKitJob({
    jobType: 'get_room',
    roomName,
  });
}

/**
 * Start agent worker for a room
 * This is required to connect the agent to the room when frontend connects
 * 
 * @param roomName Room name where agent should connect
 * @param agentName Optional agent name (defaults to 'voice-assistant' or env LIVEKIT_AGENT_NAME)
 */
export async function startAgentWorker(roomName: string, agentName?: string): Promise<JobResponse> {
  return submitLiveKitJob({
    jobType: 'start_agent',
    roomName,
    payload: agentName ? { agentName } : undefined,
  });
}

/**
 * Start transcription for a room
 */
export async function startTranscription(roomName: string, language: string = 'en'): Promise<JobResponse> {
  return submitLiveKitJob({
    jobType: 'start_transcription',
    roomName,
    payload: { language },
  });
}

/**
 * Update room metadata
 */
export async function updateRoomMetadata(roomName: string, metadata: Record<string, any>): Promise<JobResponse> {
  return submitLiveKitJob({
    jobType: 'update_room',
    roomName,
    payload: metadata,
  });
}

/**
 * Delete a room
 */
export async function deleteRoom(roomName: string): Promise<JobResponse> {
  return submitLiveKitJob({
    jobType: 'delete_room',
    roomName,
  });
}

