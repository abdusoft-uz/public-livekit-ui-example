# Agent Worker Troubleshooting - "failed to send job request"

## ❌ Xato: `"failed to send job request: no response from servers"`

Bu xato quyidagi sabablarga ko'ra yuzaga kelishi mumkin:

### 1. Agent Name Sozlanmagan

**Xato belgisi:**
```
"agentName": ""
```

**Sabab:** Worker'da agent name sozlanmagan yoki LiveKit server uni topa olmayapti.

**Yechim:**

#### Python Agent'da:

```python
# agent.py
from livekit.agents import cli, WorkerOptions

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    # ... agent code ...

if __name__ == "__main__":
    # Agent name'ni aniq belgilash
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="my-telephony-agent"  # <-- Bu qatorni qo'shing (worker'da sozlangan name bilan mos bo'lishi kerak)
        )
    )
```

#### Environment Variable:

```env
# .env.local yoki environment variable
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=my-telephony-agent
LIVEKIT_AGENT_NAME=my-telephony-agent
```

### 2. Worker To'g'ri Ishga Tushmagan

**Tekshirish:**
1. Worker log'larida `"registered worker"` ko'rinishi kerak
2. Worker ID ko'rsatilishi kerak: `"id": "AW_..."`

**Yechim:**
- Worker'ni qayta ishga tushiring
- LiveKit server'ga ulanganligini tekshiring
- Environment variables'lar to'g'ri sozlanganligini tekshiring

### 3. Worker Namespace Muammosi

**Xato belgisi:**
```
"namespace": ""
```

**Sabab:** Worker namespace sozlanmagan yoki mos kelmayapti.

**Yechim:**

```python
# agent.py
cli.run_app(
    WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="my-telephony-agent",
        namespace="default"  # <-- Namespace qo'shing (agar kerak bo'lsa)
    )
)
```

### 4. LiveKit Server Konfiguratsiyasi

**Tekshirish:**
1. LiveKit server ishga tushganligini tekshiring
2. Server log'larini ko'rib chiqing
3. Worker va server o'rtasida aloqa borligini tekshiring

## ✅ To'g'ri Konfiguratsiya

### Python Agent Example:

```python
# agent.py
import asyncio
from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.plugins import openai, silero

async def entrypoint(ctx: JobContext):
    logger.info(f"Agent connecting to room: {ctx.room.name}")
    await ctx.connect()
    
    # Agent session setup
    session = agents.AgentSession(
        vad=silero.VAD.load(),
        stt=openai.STT(),
        llm=openai.LLM(model="gpt-4"),
        tts=openai.TTS(voice="nova"),
    )
    
    agent = agents.Agent()
    await session.start(agent=agent, room=ctx.room)

if __name__ == "__main__":
    # ✅ Agent name aniq belgilash
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="my-telephony-agent"  # <-- MUHIM! (worker'da sozlangan name bilan mos bo'lishi kerak)
        )
    )
```

### Environment Variables:

```env
# LiveKit Server
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret

# Agent Worker (optional)
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=my-telephony-agent
LIVEKIT_AGENT_NAME=my-telephony-agent
```

## 🔍 Debug Steps

### 1. Worker Log'larini Tekshirish

Worker log'larida quyidagilar bo'lishi kerak:

```
[INFO] [livekit.agents] registered worker
{"id": "AW_...", "url": "ws://localhost:7880"}
```

Agar bu ko'rinmasa, worker ishga tushmagan.

### 2. Server Log'larini Tekshirish

Server log'larida:

```
failed to send job request: "no response from servers"
```

Agar bu ko'rinsa, worker javob bermayapti.

### 3. Agent Name Tekshirish

Frontend'dan job yuborganda agent name'ni ko'rsating:

```typescript
await startAgentWorker('room-123', 'my-telephony-agent');
```

### 4. Network Connectivity

Worker va server o'rtasida network aloqasi borligini tekshiring:

```bash
# Worker terminal'ida
ping localhost
telnet localhost 7880
```

## 💡 Eng Keng Tarqalgan Muammo

**Muammo:** `"agentName": ""`

**Sabab:** Worker'da agent name sozlanmagan.

**Yechim:**
```python
cli.run_app(
    WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="my-telephony-agent"  # <-- Bu qatorni qo'shing! (worker'da sozlangan name bilan mos bo'lishi kerak)
    )
)
```

## 📝 Checklist

- [ ] Worker ishga tushgan (`registered worker` log'ida ko'rinadi)
- [ ] Agent name sozlangan (`agent_name` parameter yoki `LIVEKIT_AGENT_NAME` env var)
- [ ] LiveKit server ishga tushgan
- [ ] Worker va server o'rtasida network aloqa bor
- [ ] Environment variables to'g'ri sozlangan
- [ ] Frontend'dan job yuborilayapti (optional)

## 🔗 Qo'shimcha Ma'lumot

- [LiveKit Agents Worker Options](https://docs.livekit.io/agents/worker/options/)
- [LiveKit Agents CLI](https://docs.livekit.io/agents/worker/cli/)
- [Agent Configuration](https://docs.livekit.io/agents/build/dispatch/)

