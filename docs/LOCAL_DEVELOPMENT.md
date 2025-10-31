# Local LiveKit Development Guide

Bu qo'llanma ushbu loyihani local LiveKit server va agent dev bilan ulanishni ko'rsatadi.

## 📋 Talablar

1. **LiveKit Server** - Local ishga tushirilgan
2. **LiveKit Agent** - Local development rejimida ishlayotgan
3. **Node.js 18+** va npm

## 🚀 Local LiveKit Server Setup

### Variant 1: Docker Compose (Tavsiya etiladi)

```bash
# LiveKit serverini Docker orqali ishga tushirish
docker run -d \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -p 50000-50100:50000-50100/udp \
  -e LIVEKIT_KEYS=devkey:devsecret \
  livekit/livekit-server:latest \
  --dev
```

### Variant 2: LiveKit CLI

```bash
# LiveKit CLI orqali o'rnatish
npm install -g livekit-cli

# Serverni ishga tushirish
livekit-server --dev
```

### Variant 3: Binary o'rnatish

[LiveKit Installation Docs](https://docs.livekit.io/home/self-hosting/deployment/) ga qarang.

## 🔧 Environment Configuration

`.env.local` faylini yarating va quyidagilarni sozlang:

```env
# Local LiveKit Server Configuration
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_HOST=http://localhost:7880

# Agent Configuration (must match worker agent_name)
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=my-telephony-agent
LIVEKIT_AGENT_NAME=my-telephony-agent
```

**Muhim eslatmalar:**
- Local development uchun `ws://` protokoli ishlatiladi (SSL yo'q)
- Production uchun `wss://` (SSL bilan) ishlatilishi kerak
- `devkey` va `devsecret` faqat development uchun (production'da haqiqiy kalitlar ishlating)

## 🤖 LiveKit Agent Dev Setup

### Python Agent (Tavsiya etiladi)

```bash
# LiveKit agents paketini o'rnatish
pip install livekit livekit-agents livekit-plugins-openai

# Agent faylini yaratish (example_agent.py)
livekit-agent dev start
```

### TypeScript/JavaScript Agent

```bash
# LiveKit agents paketini o'rnatish
npm install -g livekit-cli
npm install @livekit/agents

# Agent faylini yaratish
livekit-agent dev start
```

**Agent kod misoli:**

```python
# example_agent.py
from livekit import agents, rtc
from livekit.plugins import openai

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    
    # Voice assistant yaratish
    assistant = openai.VoiceAssistant(
        model="gpt-4",
        voice="nova",
    )
    
    assistant.start(ctx.room)
```

## 🔌 Ulanish Jarayoni

Loyiha quyidagi tartibda ulanadi:

1. **Token Generation** (`/api/token`)
   - Server API_KEY va API_SECRET yordamida JWT token yaratadi
   - Token ichida room va participant ma'lumotlari bor
   - **Muhim:** Client va agent bir xil room nomiga ulanishi kerak!

2. **Client Connection** (`useConnection.tsx`)
   - `NEXT_PUBLIC_LIVEKIT_URL` dan server URL olinadi
   - Token `/api/token` endpoint orqali olinadi
   - `LiveKitRoom` komponenti orqali ulanadi
   - Room nomi: `finarum-room` (default)

3. **Agent Worker** (`uv run python agent.py dev`)
   - Agent worker sifatida LiveKit server'ga ulandi
   - Client room'ga ulanganda, server agent'ni avtomatik assign qiladi
   - Agent `ctx.room` orqali room'ga ulanadi
   - **Muhim:** Agent kodida `ctx.connect()` chaqirilishi kerak!

4. **Media Tracks**
   - Camera va microphone traklari yaratiladi
   - Agent video va audio traklari o'qiladi

## 🤖 Agent'ga Ulanish Qoidalari

### Agent Worker Modeli

LiveKit agents framework'da agent **worker** sifatida ishlaydi:

1. **Agent ishga tushadi:** `uv run python agent.py dev`
   - Agent LiveKit server'ga ulandi va worker sifatida ro'yxatdan o'tadi
   - Log: `registered worker {"id": "...", "url": "ws://localhost:7880"}`

2. **Client room'ga ulandi:**
   - Browser `finarum-room` room'ga ulandi
   - Server agent'ni shu room'ga avtomatik assign qiladi

3. **Agent room'ga ulanadi:**
   - `JobContext` ichida `ctx.room` avtomatik o'rnatiladi
   - Agent `session.start(room=ctx.room)` orqali room'ga ulanadi

### Agent Kodida Kerakli Qadamlar

**1. `ctx.connect()` chaqirilishi kerak:**

```python
async def entrypoint(ctx: JobContext):
    # ✅ MUHIM: Avval ctx.connect() chaqirilishi kerak!
    await ctx.connect()
    
    # Keyin session.start() chaqiriladi
    await session.start(
        agent=agent,
        room=ctx.room,  # ctx.room avtomatik o'rnatiladi
    )
```

**2. Room nomini log qilish:**

```python
async def entrypoint(ctx: JobContext):
    logger.info(f"🏠 Room name: {ctx.room.name}")
    logger.info(f"🏠 Room SID: {ctx.room.sid}")
    
    await ctx.connect()
    # ...
```

**3. Room nomi mos kelishi kerak:**

- Client: `finarum-room` ga ulandi
- Agent: Client room'ga ulanganda, `ctx.room.name` = `finarum-room` bo'ladi

### Muammolarni Hal Qilish

**Muammo: Agent ulanmayapti**
1. ✅ Agent ishga tushganmi? (`uv run python agent.py dev`)
2. ✅ LiveKit server ishlayaptimi? (`ws://localhost:7880`)
3. ✅ Room nomlari mos keladimi? (Client va agent bir xil room nomiga ulanayotganmi?)
4. ✅ `ctx.connect()` chaqirilganmi? (Agent kodida)
5. ✅ Agent loglarini tekshiring: `participant connected`, `session started`

**Muammo: Agent room'ga ulanmayapti**
- Agent kodida `ctx.connect()` chaqirilganligini tekshiring
- Agent kodida `await session.start(room=ctx.room)` ishlatilganligini tekshiring
- Client va agent bir xil LiveKit server'ga ulanayotganligini tekshiring

## 📝 LiveKit Client Qoidalari

### 1. Token Kerak
- Har bir ulanish uchun JWT token talab qilinadi
- Token ichida `room`, `identity`, va `grants` bo'lishi kerak
- Token muddati cheklangan (default: 1 soat)

### 2. Connection URL
- WebSocket protokoli ishlatiladi: `ws://` yoki `wss://`
- Local: `ws://localhost:7880`
- Production: `wss://your-domain.com`

### 3. Room va Participant
- Har bir ulanish bir `room` ga ulanadi
- Har bir participant `identity` ga ega bo'lishi kerak
- Participant `name` ixtiyoriy

### 4. Grants (Huquqlar)
```typescript
{
  room: "room-name",
  roomJoin: true,      // Xonaga kirish huquqi
  canPublish: true,   // Track publish qilish huquqi
  canSubscribe: true, // Track subscribe qilish huquqi
  canPublishData: true // Data channel yuborish huquqi
}
```

### 5. Media Tracks
- **Camera Track**: Video oqimi
- **Microphone Track**: Audio oqimi
- **Screen Share**: Ekran almashish (ixtiyoriy)

### 6. Connection States
- `Disconnected` - Ulanmagan
- `Connecting` - Ulanmoqda
- `Connected` - Ulandi
- `Reconnecting` - Qayta ulanmoqda
- `Disconnected` - Uzildi

## 🧪 Testing Local Connection

1. **LiveKit Server tekshiruvi:**
```bash
curl http://localhost:7880
```

2. **Token generatsiya tekshiruvi:**
```bash
curl "http://localhost:3000/api/token?roomName=test-room&participantName=test-user"
```

3. **Browser Console'da tekshirish:**
```javascript
// Browser console'da
// .env.local faylidan o'qiladi
console.log('LiveKit URL:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
```

## ⚠️ Muammolar va Yechimlar

### Muammo: "Connection failed"

**Yechim:**
- LiveKit server ishlamoqdamimi tekshiring: `http://localhost:7880`
- `.env.local` faylida `NEXT_PUBLIC_LIVEKIT_URL` to'g'ri sozlanganmi
- API_KEY va API_SECRET mos keladimi

### Muammo: "Failed to fetch token"

**Yechim:**
- `LIVEKIT_API_KEY` va `LIVEKIT_API_SECRET` `.env.local` da mavjudmi
- Server qayta ishga tushirilganmi

### Muammo: "WebSocket connection failed"

**Yechim:**
- `ws://localhost:7880` to'g'ri portdamu
- Firewall yoki antivirus bloklamayaptimi
- Server loglarini tekshiring

### Muammo: "Agent not responding"

**Yechim:**
- Agent dev rejimida ishlamoqdamimi
- Agent xuddi shu serverga ulanayaptimi
- Agent loglarini tekshiring

## 🔍 Debugging

### Console Logs

Loyiha quyidagi loglarni chiqaradi:

```
[connection] Fetching token from: /api/token?roomName=...
[connection] Connection successful: { mode: 'env', url: 'ws://localhost:7880' }
[token-api] Generating token for: { roomName: '...', identity: '...' }
[ConnectionManager] Room connected
```

### LiveKit Server Logs

```bash
# Docker container loglarini ko'rish
docker logs <container-id>

# LiveKit CLI loglarini ko'rish
livekit-server --dev --verbose
```

### Browser DevTools

- Network tab: WebSocket ulanishini tekshiring
- Console tab: Xatolarni ko'ring
- Application tab: LocalStorage va SessionStorage ni tekshiring

## 💬 Chat va Latency Metrikalarini Ko'rsatish

UI'da real chat messagelari va latency metrikalarini ko'rsatish uchun agent kodida data channel orqali event'lar yuborilishi kerak.

### Agent Kodida Event Yuborish

Agent kodida quyidagi event'larni yuborishingiz kerak:

```python
import json
import time
from livekit import rtc

# Timing context manager
class TimingContext:
    def __init__(self, name):
        self.name = name
        self.start_time = None
        self.elapsed = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, *args):
        self.elapsed = (time.time() - self.start_time) * 1000  # ms

# User speech committed event'ida
@session.on("user_speech_committed")
def on_user_speech_committed(msg):
    latency_data = {
        "type": "user_speech",
        "text": msg.content,
        "timestamp": int(time.time() * 1000),
        "latency": {
            "vad": vad_latency_ms,  # VAD latency
            "stt": stt_latency_ms,   # STT latency
            "userSpeechDuration": speech_duration_ms,
        }
    }
    
    # Data channel orqali yuborish
    if ctx.room and ctx.room.local_participant:
        ctx.room.local_participant.publish_data(
            json.dumps(latency_data).encode('utf-8'),
            kind=rtc.DataPacket_Kind.RELIABLE
        )

# Agent speech committed event'ida
@session.on("agent_speech_committed")
def on_agent_speech_committed(msg):
    latency_data = {
        "type": "agent_speech",
        "text": msg.content,
        "timestamp": int(time.time() * 1000),
        "latency": {
            "llm": llm_latency_ms,    # LLM latency
            "tts": tts_latency_ms,     # TTS latency
            "total": total_latency_ms,  # Umumiy latency
            "agentResponseDuration": response_duration_ms,
        }
    }
    
    # Data channel orqali yuborish
    if ctx.room and ctx.room.local_participant:
        ctx.room.local_participant.publish_data(
            json.dumps(latency_data).encode('utf-8'),
            kind=rtc.DataPacket_Kind.RELIABLE
        )
```

### UI'da Ko'rsatiladigan Metrikalar

- **User Speech:** VAD, STT latency, Speech Duration
- **Agent Speech:** LLM, TTS latency, Total latency, Response Duration
- **Real-time Chat:** Foydalanuvchi va agent xabarlari

Chat oynasi UI'ning chap tomonida ko'rsatiladi va real-time xabarlar va latency metrikalarni ko'rsatadi.

## 📚 Qo'shimcha Ma'lumotlar

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Client SDK](https://docs.livekit.io/home/client/)
- [LiveKit Agents Framework](https://docs.livekit.io/home/agents/)
- [LiveKit React Components](https://github.com/livekit/components-react)

## ✅ Checklist

Local development uchun:

- [ ] LiveKit server ishga tushirilgan
- [ ] `.env.local` fayli to'g'ri sozlangan (env.template'dan nusxalangan)
- [ ] `NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880`
- [ ] `LIVEKIT_API_KEY` va `LIVEKIT_API_SECRET` mavjud
- [ ] Agent dev rejimida ishlamoqda
- [ ] Next.js dev server ishlamoqda (`npm run dev`)
- [ ] Browser console'da xatolar yo'q
- [ ] Token muvaffaqiyatli generatsiya qilinmoqda
- [ ] WebSocket ulanishi muvaffaqiyatli
- [ ] Video va audio traklari ishlayapti

