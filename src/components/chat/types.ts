export interface LatencyMetrics {
  vad?: number; // ms
  stt?: number; // ms
  llm?: number; // ms
  tts?: number; // ms
  total?: number; // ms
  userSpeechDuration?: number; // ms
  agentResponseDuration?: number; // ms
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: number;
  latency?: LatencyMetrics;
  conversationId?: string; // Pipeline conversation ID
}

export type AgentActivity = 'idle' | 'listening' | 'thinking' | 'speaking';
