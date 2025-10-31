"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track, TrackPublication, LocalParticipant, RemoteParticipant, Participant } from 'livekit-client';

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: number;
  latency?: LatencyMetrics;
  conversationId?: string; // Pipeline conversation ID
}

export interface LatencyMetrics {
  vad?: number; // ms
  stt?: number; // ms
  llm?: number; // ms
  tts?: number; // ms
  total?: number; // ms
  userSpeechDuration?: number; // ms
  agentResponseDuration?: number; // ms
}

interface PipelineMetrics {
  vad: number;
  stt: number;
  llm: number;
  tts: number;
  total: number;
  conversationId: string;
  createdAt: number;
}

interface ChatWindowProps {
  className?: string;
}

export function ChatWindow({ className = '' }: ChatWindowProps) {
  const room = useRoomContext();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Filter and deduplicate messages
  // Remove duplicate messages (same text, type, and timestamp within 2 seconds)
  // Remove empty or whitespace-only messages
  // Remove placeholder messages ("⏳ Agent javob bermoqda...")
  const filteredMessages = React.useMemo(() => {
    const filtered: ChatMessage[] = [];
    const seenConversationPairs = new Map<string, string>(); // conversationId -> last agent text
    
    for (const msg of messages) {
      // Skip empty messages
      if (!msg.text || !msg.text.trim()) continue;
      
      // Skip placeholder messages
      if (msg.text.includes('⏳') || msg.text.includes('Agent javob bermoqda')) {
        console.log('[ChatWindow] ⚠️ Skipping placeholder message:', msg.text);
        continue;
      }
      
      // Normalize text for comparison (trim, lowercase)
      const normalizedText = msg.text.trim().toLowerCase();
      
      // Check for duplicates: same type, same normalized text, within 3 seconds
      const isDuplicate = filtered
        .reverse()
        .slice(0, 10) // Check last 10 messages
        .some(m => 
          m.type === msg.type && 
          m.text.trim().toLowerCase() === normalizedText &&
          Math.abs(m.timestamp - msg.timestamp) < 3000 // Within 3 seconds
        );
      
      // For agent messages, also check conversation ID pairing
      if (!isDuplicate && msg.type === 'agent' && msg.conversationId) {
        const lastAgentText = seenConversationPairs.get(msg.conversationId);
        if (lastAgentText === normalizedText) {
          // Same conversation, same text - likely duplicate
          console.log('[ChatWindow] ⚠️ Skipping duplicate agent message by conversation ID:', {
            conversationId: msg.conversationId,
            text: msg.text.substring(0, 50),
          });
          continue;
        }
        seenConversationPairs.set(msg.conversationId, normalizedText);
      }
      
      if (!isDuplicate) {
        filtered.push(msg);
      } else {
        console.log('[ChatWindow] ⚠️ Skipping duplicate message:', {
          type: msg.type,
          text: msg.text.substring(0, 50),
          timestamp: new Date(msg.timestamp).toISOString(),
        });
      }
    }
    
    return filtered;
  }, [messages]);

  // Sort messages by timestamp to ensure correct order
  // If timestamps are equal, prioritize user messages before agent replies
  // Also handle messages with same timestamp by checking conversation ID pairing
  const sortedMessages = React.useMemo(() => {
    return [...filteredMessages].sort((a, b) => {
      const timeDiff = a.timestamp - b.timestamp;
      
      // If timestamps differ by more than 1 second, sort by time
      if (Math.abs(timeDiff) > 1000) {
        return timeDiff;
      }
      
      // For messages within 1 second of each other:
      // 1. User messages come before agent messages
      if (a.type === 'user' && b.type === 'agent') return -1;
      if (a.type === 'agent' && b.type === 'user') return 1;
      
      // 2. If same type, check conversation ID pairing
      // User message should be immediately before its corresponding agent reply
      if (a.type === 'user' && b.type === 'user') {
        // If both are user messages, sort by timestamp
        return timeDiff;
      }
      if (a.type === 'agent' && b.type === 'agent') {
        // If both are agent messages, check if they're paired with user messages
        // Agent message should follow its user message
        if (a.conversationId && b.conversationId && a.conversationId === b.conversationId) {
          return timeDiff; // Same conversation, sort by time
        }
        return timeDiff; // Different conversations, sort by time
      }
      
      // Default: sort by timestamp
      return timeDiff;
    });
  }, [filteredMessages]);
  
  // Timing state
  const userSpeechEndRef = useRef<number | null>(null);
  const agentResponseStartRef = useRef<number | null>(null);
  const lastUserSpeechTimeRef = useRef<number | null>(null);
  
  // Track timing refs
  const trackPublishTimesRef = useRef<Map<string, number>>(new Map());
  const trackSubscribeTimesRef = useRef<Map<string, number>>(new Map());
  
  // Pipeline metrics state - store conversation metrics by conversation_id
  const pipelineMetricsRef = useRef<Map<string, PipelineMetrics>>(new Map());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages]);

  // Listen for LiveKit server STT data from agent via data channel
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        console.log('[ChatWindow] 📨 Data received from agent:', data);
        
        // Debug: Log all data types to see what's coming
        if (data.type) {
          console.log(`[ChatWindow] Event type: ${data.type}`, {
            hasText: !!data.text,
            textLength: data.text?.length || 0,
            hasLatency: !!data.latency,
            hasMetrics: !!data.conversation_id,
          });
        }

        // Handle user speech transcription from server STT
        if (data.type === 'user_speech' && data.text) {
          const speechText = data.text.trim();
          if (!speechText) return; // Skip empty text

          const speechDuration = data.latency?.userSpeechDuration || 0;
          userSpeechEndRef.current = Date.now();
          lastUserSpeechTimeRef.current = Date.now();

          // Get conversation ID from latest pipeline metrics (if available)
          const latestMetrics = Array.from(pipelineMetricsRef.current.values()).pop();
          const conversationId = latestMetrics?.conversationId || undefined;

          setMessages(prev => {
            // Check for duplicate user message (same text within 2 seconds)
            const recentDuplicate = prev
              .filter(m => m.type === 'user')
              .reverse()
              .slice(0, 3) // Check last 3 user messages
              .find(m => {
                const timeDiff = Math.abs((data.timestamp || Date.now()) - m.timestamp);
                const textMatch = m.text.trim().toLowerCase() === speechText.toLowerCase();
                return textMatch && timeDiff < 2000; // Within 2 seconds
              });

            if (recentDuplicate) {
              console.log('[ChatWindow] ⚠️ Duplicate user speech detected, skipping:', speechText);
              return prev; // Don't add duplicate
            }

            return [...prev, {
              id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              type: 'user',
              text: speechText,
              timestamp: data.timestamp || Date.now(),
              latency: {
                vad: data.latency?.vad,
                stt: data.latency?.stt,
                userSpeechDuration: speechDuration,
              },
              conversationId: conversationId,
            }];
          });

          agentResponseStartRef.current = Date.now();
          console.log('[ChatWindow] ✅ User speech received from server STT:', speechText);
        }

        // Handle agent reply (LLM response) from agent
        // Support both old format (agent_reply) and new format (conversation_item_added)
        if (data.type === 'agent_reply' || data.type === 'conversation_item_added') {
          // For conversation_item_added, extract text from content array
          let replyText = (data.text || '').trim();
          
          if (data.type === 'conversation_item_added' && data.item) {
            const item = data.item;
            const role = item.role || data.role;
            const contents = item.content || data.content || [];
            
            // Only process assistant messages
            if (role === 'assistant' && Array.isArray(contents)) {
              for (const c of contents) {
                if (typeof c === 'string') {
                  replyText = c.trim();
                  break;
                }
              }
            } else {
              // Not an assistant message, skip
              return;
            }
          } else {
            // For agent_reply, use text field directly
            replyText = (data.text || '').trim();
          }
          
          // Always add/update agent reply in UI
          setMessages(prev => {
            // Get conversation ID from latest pipeline metrics (if available)
            const latestMetrics = Array.from(pipelineMetricsRef.current.values()).pop();
            const conversationId = latestMetrics?.conversationId || data.conversation_id || undefined;

            // Only process if we have text
            if (!replyText) return prev;

            // Strategy: Only update if it's a true duplicate (same text, same conversation, within 2 seconds)
            // Otherwise, always add as NEW message to preserve conversation history
            
            if (conversationId) {
              // Check if we have an agent message with same conversation ID AND same text (true duplicate)
              const existingByConversationAndText = prev
                .reverse()
                .find(
                  msg => msg.type === 'agent' && 
                  msg.conversationId === conversationId &&
                  msg.text.trim().toLowerCase() === replyText.trim().toLowerCase()
                );
              
              if (existingByConversationAndText) {
                const timeDiff = Math.abs((data.timestamp || Date.now()) - existingByConversationAndText.timestamp);
                // Only update if it's within 2 seconds (streaming update or true duplicate)
                if (timeDiff < 2000) {
                  console.log('[ChatWindow] 🔄 Updating existing agent reply (same conversation, same text):', {
                    conversationId,
                    text: replyText.substring(0, 50),
                  });
                  // Update existing message with new latency/metrics only
                  return prev.map(msg =>
                    msg.id === existingByConversationAndText.id
                      ? { 
                          ...msg, 
                          timestamp: data.timestamp || Date.now(), // Update timestamp
                          latency: {
                            ...msg.latency,
                            llm: data.latency?.llm || msg.latency?.llm,
                            tts: data.latency?.tts || msg.latency?.tts,
                            agentResponseDuration: data.latency?.agentResponseDuration || msg.latency?.agentResponseDuration,
                            total: data.latency?.total || msg.latency?.total,
                          },
                        }
                      : msg
                  );
                }
              }
              
              // Check if we have an agent message with same conversation ID but DIFFERENT text
              // This means it's a NEW response for the same conversation - DON'T UPDATE, ADD NEW
              const existingByConversationOnly = prev
                .reverse()
                .find(
                  msg => msg.type === 'agent' && 
                  msg.conversationId === conversationId
                );
              
              if (existingByConversationOnly && 
                  existingByConversationOnly.text.trim().toLowerCase() !== replyText.trim().toLowerCase()) {
                console.log('[ChatWindow] ✅ New agent reply for same conversation (different text), adding as new message:', {
                  conversationId,
                  oldText: existingByConversationOnly.text.substring(0, 30),
                  newText: replyText.substring(0, 30),
                });
                // Add new message - don't update existing
                return [...prev, {
                  id: `agent-reply-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  type: 'agent',
                  text: replyText,
                  timestamp: data.timestamp || Date.now(),
                  latency: {
                    llm: data.latency?.llm,
                    tts: data.latency?.tts,
                    agentResponseDuration: data.latency?.agentResponseDuration,
                    total: data.latency?.total,
                  },
                  conversationId: conversationId,
                }];
              }
              
              // No existing message for this conversation ID - add new
              console.log('[ChatWindow] ✅ Adding new agent reply (new conversation):', {
                conversationId,
                text: replyText.substring(0, 50),
              });
            }

            // Add new agent reply message to UI
            // This handles: new conversation, no conversation ID, or first response
            return [...prev, {
              id: `agent-reply-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              type: 'agent',
              text: replyText,
              timestamp: data.timestamp || Date.now(),
              latency: {
                llm: data.latency?.llm,
                tts: data.latency?.tts,
                agentResponseDuration: data.latency?.agentResponseDuration,
                total: data.latency?.total,
              },
              conversationId: conversationId,
            }];
          });
        }

        // Handle agent speech (TTS result) from agent
        // Note: This is typically the same text as agent_reply, so we update existing message if found
        if (data.type === 'agent_speech') {
          const speechText = (data.text || '').trim();
          
          // Only update if we have text
          if (!speechText) return;
          
          setMessages(prev => {
            // Get conversation ID from latest pipeline metrics (if available)
            const latestMetrics = Array.from(pipelineMetricsRef.current.values()).pop();
            const conversationId = latestMetrics?.conversationId || data.conversation_id || undefined;

            // Strategy: Find agent message with matching conversation ID and update TTS text
            // If conversation ID matches, update that specific message
            // If no conversation ID, update the most recent agent message (within 5 seconds)
            
            if (conversationId) {
              // Find agent message with matching conversation ID
              const existingByConversationId = prev
                .reverse()
                .find(
                  msg => msg.type === 'agent' && msg.conversationId === conversationId
                );
              
              if (existingByConversationId) {
                // Update existing message with TTS text (if it matches or is similar)
                const timeDiff = Math.abs((data.timestamp || Date.now()) - existingByConversationId.timestamp);
                if (timeDiff < 5000) { // Within 5 seconds
                  return prev.map(msg =>
                    msg.id === existingByConversationId.id
                      ? { 
                          ...msg, 
                          text: speechText || msg.text, // Update with TTS text if available
                          timestamp: data.timestamp || msg.timestamp,
                          latency: {
                            ...msg.latency,
                            llm: data.latency?.llm || msg.latency?.llm,
                            tts: data.latency?.tts || msg.latency?.tts,
                            agentResponseDuration: data.latency?.agentResponseDuration || msg.latency?.agentResponseDuration,
                            total: data.latency?.total || msg.latency?.total,
                          },
                        }
                      : msg
                  );
                }
              }
            } else {
              // No conversation ID - update most recent agent message (within 5 seconds)
              const recentAgentMessage = prev
                .filter(m => m.type === 'agent')
                .reverse()
                .slice(0, 1)[0]; // Get last agent message
              
              if (recentAgentMessage) {
                const timeDiff = Math.abs((data.timestamp || Date.now()) - recentAgentMessage.timestamp);
                if (timeDiff < 5000) { // Within 5 seconds
                  return prev.map(msg =>
                    msg.id === recentAgentMessage.id
                      ? { 
                          ...msg, 
                          text: speechText || msg.text,
                          timestamp: data.timestamp || msg.timestamp,
                          latency: {
                            ...msg.latency,
                            llm: data.latency?.llm || msg.latency?.llm,
                            tts: data.latency?.tts || msg.latency?.tts,
                            agentResponseDuration: data.latency?.agentResponseDuration || msg.latency?.agentResponseDuration,
                            total: data.latency?.total || msg.latency?.total,
                          },
                        }
                      : msg
                  );
                }
              }
            }

            // If no matching message found, don't add new message
            // TTS text should already be in agent_reply message
            console.log('[ChatWindow] ⚠️ No matching agent message found for TTS update');
            return prev;
          });
        }

        // Handle pipeline metrics from agent
        // Support both old format (pipeline_metrics with flat structure) and new format (metrics_collected with nested metrics)
        if (data.type === 'pipeline_metrics' || data.type === 'metrics_collected') {
          // Old format: flat structure (vad, stt, llm, tts directly in data)
          const conversationId = data.conversation_id || data.conversationId;
          let metrics: PipelineMetrics;

          if (data.metrics && typeof data.metrics === 'object') {
            // New format: nested metrics object from metrics_collected event
            const metricsObj = data.metrics;
            metrics = {
              vad: metricsObj.vad?.duration_ms || metricsObj.vad || 0,
              stt: metricsObj.stt?.duration_ms || metricsObj.stt || 0,
              llm: metricsObj.llm?.duration_ms || metricsObj.llm || 0,
              tts: metricsObj.tts?.duration_ms || metricsObj.tts || 0,
              total: metricsObj.total_duration_ms || metricsObj.total || 0,
              conversationId: conversationId || `conv-${Date.now()}`,
              createdAt: data.timestamp || data.created_at || Date.now(),
            };
          } else {
            // Old format: flat structure
            if (!conversationId) {
              console.warn('[ChatWindow] ⚠️ Pipeline metrics received without conversation_id');
              return;
            }
            metrics = {
              vad: data.vad?.duration_ms || data.vad || 0,
              stt: data.stt?.duration_ms || data.stt || 0,
              llm: data.llm?.duration_ms || data.llm || 0,
              tts: data.tts?.duration_ms || data.tts || 0,
              total: data.total_duration_ms || data.total || 0,
              conversationId: conversationId,
              createdAt: data.created_at || Date.now(),
            };
          }

          // Save metrics for this conversation
          pipelineMetricsRef.current.set(metrics.conversationId, metrics);

          console.log('[ChatWindow] 📊 Pipeline metrics received:', {
            conversationId: metrics.conversationId,
            vad: metrics.vad,
            stt: metrics.stt,
            llm: metrics.llm,
            tts: metrics.tts,
            total: metrics.total,
            rawData: data,
          });

          // Update messages with pipeline metrics
          setMessages(prev => {
            // Strategy 1: Update messages with matching conversation ID
            let updated = prev.map(msg => {
              if (msg.conversationId === metrics.conversationId) {
                const updatedMsg = {
                  ...msg,
                  latency: {
                    ...msg.latency,
                    vad: metrics.vad > 0 ? metrics.vad : (msg.latency?.vad || 0),
                    stt: metrics.stt > 0 ? metrics.stt : (msg.latency?.stt || 0),
                    llm: metrics.llm > 0 ? metrics.llm : (msg.latency?.llm || 0),
                    tts: metrics.tts > 0 ? metrics.tts : (msg.latency?.tts || 0),
                    total: metrics.total > 0 ? metrics.total : (msg.latency?.total || 0),
                  },
                };
                console.log(`[ChatWindow] ✅ Updated message ${msg.id} with metrics`, updatedMsg.latency);
                return updatedMsg;
              }
              return msg;
            });

            // Strategy 2: If no messages match, update the most recent agent message (within 10 seconds)
            const hasMatchingMessage = prev.some(msg => msg.conversationId === metrics.conversationId);
            if (!hasMatchingMessage) {
              // Find the most recent agent message within 10 seconds
              const recentAgentMessages = [...updated]
                .filter(msg => msg.type === 'agent')
                .reverse()
                .slice(0, 3); // Check last 3 agent messages
              
              const matchingAgentMessage = recentAgentMessages.find(msg => {
                const timeDiff = Math.abs(metrics.createdAt - msg.timestamp);
                return timeDiff < 10000; // Within 10 seconds
              });
              
              if (matchingAgentMessage) {
                console.log('[ChatWindow] 🔄 Updating recent agent message with metrics (fallback):', {
                  conversationId: metrics.conversationId,
                  messageId: matchingAgentMessage.id,
                  timeDiff: Math.abs(metrics.createdAt - matchingAgentMessage.timestamp),
                });
                updated = updated.map(msg =>
                  msg.id === matchingAgentMessage.id
                    ? {
                        ...msg,
                        conversationId: metrics.conversationId, // Associate with conversation
                        latency: {
                          ...msg.latency,
                          vad: metrics.vad > 0 ? metrics.vad : (msg.latency?.vad || 0),
                          stt: metrics.stt > 0 ? metrics.stt : (msg.latency?.stt || 0),
                          llm: metrics.llm > 0 ? metrics.llm : (msg.latency?.llm || 0),
                          tts: metrics.tts > 0 ? metrics.tts : (msg.latency?.tts || 0),
                          total: metrics.total > 0 ? metrics.total : (msg.latency?.total || 0),
                        },
                      }
                    : msg
                );
              } else {
                // No matching agent message found - don't create placeholder
                // Agent reply will come via agent_reply or conversation_item_added events
                console.log('[ChatWindow] ⚠️ No matching agent message found for metrics - agent reply will arrive separately');
              }
            }

            return updated;
          });
        }
      } catch (error) {
        console.error('[ChatWindow] Error parsing data channel message:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  // Monitor LiveKit pipeline processes - Track publishing/subscribing
  useEffect(() => {
    if (!room) return;

    const handleTrackPublished = (publication: TrackPublication, participant: LocalParticipant | RemoteParticipant) => {
      const trackId = publication.trackSid;
      const publishTime = Date.now();
      
      trackPublishTimesRef.current.set(trackId, publishTime);
      
      console.log('[ChatWindow] Track published:', {
        trackId,
        kind: publication.kind,
        source: publication.source,
        participant: participant.identity,
        isLocal: participant.isLocal,
        isMuted: publication.isMuted,
        timestamp: publishTime,
      });
      
      // Agent audio track published (response starting)
      if (!participant.isLocal && publication.kind === 'audio' && lastUserSpeechTimeRef.current) {
        const responseDelay = publishTime - lastUserSpeechTimeRef.current;
        agentResponseStartRef.current = publishTime;
        
        console.log('[ChatWindow] 📡 Agent audio track published, response delay:', responseDelay);
        
        // Update last user message with pipeline latency
        setMessages(prev => {
          const updated = [...prev];
          const lastUserMessage = updated.reverse().find(m => m.type === 'user');
          if (lastUserMessage && lastUserMessage.latency) {
            lastUserMessage.latency.total = responseDelay;
          }
          return updated.reverse();
        });
      }
    };

    const handleTrackSubscribed = (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
      if (participant.isLocal) return;
      
      const trackId = publication.trackSid;
      const subscribeTime = Date.now();
      const publishTime = trackPublishTimesRef.current.get(trackId);
      
      console.log('[ChatWindow] Track subscribed:', {
        trackId,
        kind: publication.kind,
        source: publication.source,
        participant: participant.identity,
        publishTime,
        subscribeTime,
        networkLatency: publishTime ? subscribeTime - publishTime : undefined,
      });
      
      if (publishTime && publication.kind === 'audio') {
        const networkLatency = subscribeTime - publishTime;
        
        // Add agent response message with pipeline metrics (only if we have a user message)
        if (lastUserSpeechTimeRef.current) {
          setMessages(prev => [...prev, {
            id: `agent-${Date.now()}`,
            type: 'agent',
            text: '🔊 Agent javob berdi',
            timestamp: Date.now(),
            latency: {
              total: lastUserSpeechTimeRef.current ? subscribeTime - lastUserSpeechTimeRef.current : undefined,
              agentResponseDuration: agentResponseStartRef.current ? subscribeTime - agentResponseStartRef.current : undefined,
            },
          }]);
        }
        
        console.log('[ChatWindow] 📡 Agent audio track subscribed, network latency:', networkLatency);
      }
      
      trackSubscribeTimesRef.current.set(trackId, subscribeTime);
    };

    const handleTrackUnpublished = (publication: TrackPublication, participant: Participant) => {
      console.log('[ChatWindow] Track unpublished:', {
        trackId: publication.trackSid,
        kind: publication.kind,
        source: publication.source,
        participant: participant.identity,
        isLocal: participant.isLocal,
      });
    };

    const handleTrackMuted = (publication: TrackPublication, participant: Participant) => {
      console.log('[ChatWindow] Track muted:', {
        trackId: publication.trackSid,
        kind: publication.kind,
        source: publication.source,
        participant: participant.identity,
        isLocal: participant.isLocal,
      });
    };

    const handleTrackUnmuted = (publication: TrackPublication, participant: Participant) => {
      console.log('[ChatWindow] Track unmuted:', {
        trackId: publication.trackSid,
        kind: publication.kind,
        source: publication.source,
        participant: participant.identity,
        isLocal: participant.isLocal,
      });
    };

    // Room level events
    room.on('trackPublished', handleTrackPublished);
    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackUnpublished', handleTrackUnpublished);
    room.on('trackMuted', handleTrackMuted);
    room.on('trackUnmuted', handleTrackUnmuted);

    return () => {
      room.off('trackPublished', handleTrackPublished);
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnpublished', handleTrackUnpublished);
      room.off('trackMuted', handleTrackMuted);
      room.off('trackUnmuted', handleTrackUnmuted);
    };
  }, [room]);

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-black/50 to-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Compact Header */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/90">Suhbat</h3>
          {messages.length > 0 && (
            <div className="text-xs text-white/50">
              {messages.filter(m => m.type === 'user').length} xabar
            </div>
          )}
        </div>
      </div>

      {/* Messages - Optimized scrolling */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-white/60">Mikrofon orqali gapiring</p>
            <p className="text-xs text-white/40 mt-1">Speech-to-text avtomatik ishlaydi</p>
          </div>
        ) : (
          <>
            {sortedMessages.map((message) => (
              <ChatMessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.type === 'user';
  
  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-lg transition-all duration-200 ${
        isUser 
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
          : 'bg-white/10 text-white/90 backdrop-blur-md border border-white/5'
      }`}>
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {message.text}
        </div>
        {message.latency && (
          <LatencyMetricsDisplay latency={message.latency} isUser={isUser} />
        )}
      </div>
      <div className="text-xs text-white/40 px-2 flex items-center gap-2">
        <span>{isUser ? 'Siz' : 'Agent'}</span>
        <span>•</span>
        <span>{new Date(message.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

function LatencyMetricsDisplay({ latency, isUser }: { latency: LatencyMetrics; isUser: boolean }) {
  const formatTime = (ms?: number) => {
    if (!ms || ms <= 0) return null;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Agent javoblari uchun jadval ko'rinishida to'liq pipeline metrikalar
  if (!isUser) {
    const hasAnyMetrics = latency.vad || latency.stt || latency.llm || latency.tts || latency.total;
    if (!hasAnyMetrics) return null;

    const metrics = [
      { label: 'VAD', value: latency.vad, description: 'Voice Activity Detection' },
      { label: 'STT', value: latency.stt, description: 'Speech-to-Text' },
      { label: 'LLM', value: latency.llm, description: 'Large Language Model' },
      { label: 'TTS', value: latency.tts, description: 'Text-to-Speech' },
      { label: 'Jami', value: latency.total, description: 'Umumiy vaqt', highlight: true },
    ];

    const visibleMetrics = metrics.filter(m => m.value && m.value > 0);

    if (visibleMetrics.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="text-xs text-white/60 mb-2 font-medium">Pipeline metrikalar:</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-1.5 px-2 text-white/70 font-medium">Komponent</th>
                <th className="text-left py-1.5 px-2 text-white/70 font-medium">Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {visibleMetrics.map((metric, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b border-white/5 ${metric.highlight ? 'bg-white/5' : ''}`}
                >
                  <td className="py-1.5 px-2 text-white/80">
                    <div className="flex flex-col">
                      <span className={metric.highlight ? 'font-semibold' : ''}>{metric.label}</span>
                      {metric.description && (
                        <span className="text-[10px] text-white/40 mt-0.5">{metric.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2">
                    <span className={`font-mono text-white/90 bg-black/30 px-2 py-1 rounded ${
                      metric.highlight ? 'font-semibold bg-blue-500/20 text-blue-300' : ''
                    }`}>
                      {formatTime(metric.value)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Foydalanuvchi xabarlari uchun oddiy ko'rinish
  const metrics = [
    latency.vad && { label: 'VAD', value: formatTime(latency.vad) },
    latency.stt && { label: 'STT', value: formatTime(latency.stt) },
    latency.userSpeechDuration && { label: 'Nutq', value: formatTime(latency.userSpeechDuration) },
    latency.total !== undefined && latency.total > 0 && { label: 'Javob', value: formatTime(latency.total), highlight: true },
  ];

  const visibleMetrics = metrics.filter(Boolean) as Array<{ label: string; value: string | null; highlight?: boolean }>;

  if (visibleMetrics.length === 0) return null;

  return (
    <div className={`mt-2 pt-2 border-t ${isUser ? 'border-blue-400/20' : 'border-white/5'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        {visibleMetrics.map((metric, idx) => (
          <div 
            key={idx} 
            className={`flex items-center gap-1.5 text-xs ${metric.highlight ? 'font-semibold' : 'opacity-80'}`}
          >
            <span className="text-white/60">{metric.label}:</span>
            <span className="font-mono text-white/90 bg-black/20 px-1.5 py-0.5 rounded">
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

