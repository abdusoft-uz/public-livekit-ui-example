# Agent Worker Job Submission - To'liq Qo'llanma

Bu qo'llanma frontend'dan LiveKit agent workerga job yuborish mexanizmini tushuntiradi.

## 📋 Umumiy Ma'lumot

LiveKit Agents framework'da:
- **Worker** - Agent'ni ishga tushiradigan process
- **Job** - Worker'ga yuboriladigan task
- **Auto-start** - Participant room'ga ulanganda agent avtomatik ishga tushadi (default)

Ba'zi hollarda har safar aloqani tiklash uchun frontend'dan agent workerga job yuborish kerak bo'ladi.

## 🔄 Agent Worker Ishga Tushirish

### Variant 1: Avtomatik (Default)

LiveKit'da agent'lar odatda avtomatik ishga tushadi:

1. Frontend participant room'ga ulanadi
2. LiveKit server worker'ga job yuboradi
3. Worker agent'ni ishga tushiradi
4. Agent room'ga ulanadi

**Eslatma:** Bu odatda avtomatik ishlaydi va alohida job yuborish kerak emas.

### Variant 2: Manual Job Submission (Frontend'dan)

Agar agent avtomatik ishga tushmasa yoki har safar aloqani tiklash uchun job yuborish kerak bo'lsa:

#### 1. Frontend'da Job Yuborish

```typescript
import { startAgentWorker } from '@/utils/livekitJobClient';

// Room'ga ulanganda
useEffect(() => {
  if (roomState === ConnectionState.Connected && room) {
    const roomName = room.name;
    if (roomName) {
      startAgentWorker(roomName)
        .then(result => {
          if (result.success) {
            console.log('Agent worker job submitted:', result.result);
          }
        })
        .catch(error => {
          console.error('Failed to submit agent job:', error);
        });
    }
  }
}, [roomState, room]);
```

#### 2. API Endpoint

`POST /api/livekit/job` endpoint'i job'ni qabul qiladi:

```typescript
{
  jobType: 'start_agent',
  roomName: 'room-123',
  payload: {
    agentName: 'my-telephony-agent', // optional (default: 'my-telephony-agent')
    workerUrl: 'http://localhost:8080' // optional
  }
}
```

#### 3. Agent Worker HTTP Endpoint (Optional)

Agar agent worker HTTP endpoint'ga ega bo'lsa:

```python
# agent_worker_server.py
from fastapi import FastAPI
from livekit import agents

app = FastAPI()

@app.post("/start")
async def start_agent_job(data: dict):
    room_name = data.get("roomName")
    agent_name = data.get("agentName", "my-telephony-agent")
    
    # Manual job yuborish
    # Bu yerda LiveKit Server API orqali job yuborishingiz mumkin
    return {"success": True, "roomName": room_name}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

#### 4. Environment Variables

`.env.local` faylida:

```env
# Optional: Agent Worker HTTP endpoint
AGENT_WORKER_URL=http://localhost:8080

# Agent Configuration (must match worker agent_name)
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=my-telephony-agent
LIVEKIT_AGENT_NAME=my-telephony-agent
```

## 🔍 Debug va Troubleshooting

### 1. Worker Ishga Tushganligini Tekshirish

Worker log'larida quyidagilarni ko'rasiz:

```
[INFO] [livekit.agents] registered worker
{"message": "registered worker", "id": "AW_...", "url": "ws://localhost:7880"}
```

### 2. Job Yuborilganligini Tekshirish

Frontend console'da:

```
[Playground] Starting agent worker for room: room-123
[Playground] ✅ Agent worker job submitted: {...}
```

### 3. Agent Ulanganligini Tekshirish

Playground'da agent participant topilishi kerak:

```
[Playground] ✅ Participant connected: {identity: "agent-...", ...}
[Playground] Agent detection: {agentParticipant: {...}, ...}
```

## ⚠️ Muammolarni Hal Qilish

### Muammo 1: Agent Avtomatik Ishga Tushmaydi

**Sabab:** Worker avtomatik job'larni kutmayapti yoki konfiguratsiya noto'g'ri.

**Yechim:**
1. Worker ishga tushganligini tekshiring
2. Worker LiveKit server'ga ulanganligini tekshiring
3. Frontend'dan manual job yuborish mexanizmini ishlating

### Muammo 2: Job Yuborilganda Xatolik

**Sabab:** API endpoint noto'g'ri sozlangan yoki network muammosi.

**Yechim:**
1. Browser console'da xatoliklarni tekshiring
2. Network tab'da API request'ni tekshiring
3. Server log'larini tekshiring

### Muammo 3: Agent Room'ga Ulanmaydi

**Sabab:** Worker job'ni qabul qilmayapti yoki agent kodi xatosi.

**Yechim:**
1. Worker log'larini tekshiring
2. Agent kodida `entrypoint` funksiyasini tekshiring
3. Room name va identity'ni tekshiring

## 📝 Misol: To'liq Workflow

### 1. Worker Ishga Tushirish

```bash
# Terminal 1: LiveKit Server
livekit-server --dev

# Terminal 2: Agent Worker
uv run python agent.py start
```

### 2. Frontend'da Room'ga Ulanish

```typescript
// Frontend avtomatik room'ga ulanadi
// Playground komponenti avtomatik agent workerga job yuboradi
```

### 3. Agent Ulanganligini Tekshirish

```typescript
// UI'da agent status ko'rsatiladi
// Chat window'da agent xabarlari ko'rsatiladi
```

## 🔗 Qo'shimcha Ma'lumot

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [LiveKit Server API](https://docs.livekit.io/server-api/)
- [Job Submission Best Practices](https://docs.livekit.io/agents/worker/)

## 💡 Tavsiyalar

1. **Default:** Agent'lar odatda avtomatik ishga tushadi - manual job yuborish kerak emas
2. **Manual Job:** Agar agent avtomatik ishga tushmasa, manual job yuborish mexanizmini ishlating
3. **HTTP Endpoint:** Agar agent worker HTTP endpoint'ga ega bo'lsa, `AGENT_WORKER_URL` ni sozlang
4. **Logging:** Har bir qadamda log'lar bilan debug qiling

