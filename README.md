# Abdusoft uz - LiveKit UI Example

Modern, responsive web interfeys LiveKit AI agentlari bilan ulanish uchun. Bu loyiha full-screen chat interfeysini, real-time ovoz suhbatini, va latency metrikalarini ko'rsatadi.

![Abdusoft uz Demo](https://img.shields.io/badge/Demo-Abdusoft%20uz-blue?style=for-the-badge)
![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge)
![License](https://img.shields.io/badge/License-Apache%202.0-yellow?style=for-the-badge)

## 📸 Screenshot

![Abdusoft uz - LiveKit UI Example](./public/example-screenshot.jpg)

*Modern glassmorphism interfeys real-time chat, voice conversation, va latency metrikalari bilan*

## ✨ Features

- **💬 Full-screen chat interface** - To'liq ekran chat oynasi
- **🎙️ Real-time voice conversation** - Server-side STT va TTS bilan
- **📊 Pipeline latency metrics** - VAD, STT, LLM, TTS va total latency ko'rsatkichlari
- **🎨 Modern glassmorphism UI** - Semi-transparent, elegant dizayn
- **📱 Responsive design** - Desktop va mobile qurilmalarda ishlaydi
- **⚡ Auto-connection** - Avtomatik ulanish
- **🔊 Audio controls** - Mikrofon, speaker va remote boshqaruvi
- **🏷️ Branded experience** - Abdusoft uz branding integratsiyasi
- **🔄 Agent worker job submission** - LiveKit agent workerga job yuborish

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- LiveKit server access or [LiveKit Cloud](https://livekit.io/cloud) account
- LiveKit agent endpoint (or compatible LiveKit agent)

### Local Development Setup

Ushbu loyiha local LiveKit server va agent dev bilan ulanishni qo'llab-quvvatlaydi.

**Tezkor boshlash:**
1. LiveKit serverini local ishga tushiring (port 7880)
2. `.env` faylini yarating va sozlang:
   ```env
   NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=devsecret
   ```
3. `npm run dev` ni ishga tushiring

**Batafsil qo'llanma:** [LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) faylini ko'ring.

### Installation

1. **Clone the repository**
   ```bash
    git clone https://github.com/abdusoft-uz/public-livekit-ui-example.git
    cd public-livekit-ui-example
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the environment template and configure your settings:
   ```bash
   cp env.template .env
   ```
   
   Edit `.env.local` with your LiveKit credentials:
   ```env
   # LiveKit Configuration
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   LIVEKIT_HOST=http://your-livekit-server.com
   
   # Agent Configuration
   NEXT_PUBLIC_LIVEKIT_AGENT_NAME=my-telephony-agent
   LIVEKIT_AGENT_NAME=my-telephony-agent
   
   # Optional: Agent Worker URL (if using HTTP-based worker startup)
   # AGENT_WORKER_URL=http://localhost:8080
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Technology Stack

- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[LiveKit](https://livekit.io/)** - Real-time audio infrastructure
- **[React 18](https://react.dev/)** - UI framework with hooks
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[LiveKit Server SDK](https://docs.livekit.io/reference/server-api/)** - Agent dispatch va job management

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── playground/         # Main chat interface
│   │   ├── chat/              # Chat window component
│   │   ├── connection/         # Connection management
│   │   └── toast/             # Notification system
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── pages/                 # Next.js pages
│   │   ├── api/              # API routes
│   │   │   ├── token.ts     # LiveKit token generation
│   │   │   └── livekit/     # LiveKit job API
│   │   └── index.tsx         # Main application
│   ├── utils/                # Utility functions
│   │   └── livekitJobClient.ts # Job submission client
│   └── styles/               # Global styles
├── public/                   # Static assets
├── docs/                     # Documentation files
│   ├── LOCAL_DEVELOPMENT.md  # Local dev setup guide
│   ├── AGENT_DATA_CHANNEL_SETUP.md # Agent data channel setup
│   ├── AGENT_WORKER_JOB_SETUP.md # Agent worker job setup
│   ├── AGENT_WORKER_TROUBLESHOOTING.md # Troubleshooting guide
│   ├── AGENTSESSION_PIPELINE_MONITORING.md # Pipeline monitoring
│   ├── LIVEKIT_JOB_API.md # Job API documentation
│   └── LIVEKIT_ROOM_EVENTS_REPORT.md # Room events reference
├── LICENSE                   # Apache 2.0 license
├── NOTICE                   # Attribution notices
└── README.md               # This file
```

## 🔧 Configuration

### LiveKit Settings

The application connects to LiveKit using environment variables. You can use either:

1. **LiveKit Cloud** - Sign up at [livekit.io/cloud](https://livekit.io/cloud)
2. **Self-hosted LiveKit server** - Follow [LiveKit deployment docs](https://docs.livekit.io/home/self-hosting/deployment)

### Agent Integration

This UI is designed to work with LiveKit AI agents, and it's compatible with any LiveKit-based agent that supports:

- Audio tracks (microphone input)
- Server-side STT (Speech-to-Text)
- LLM responses
- Server-side TTS (Text-to-Speech)
- Data channel communication for metrics
- Real-time voice conversation

## 🎨 UI Components

### Main Interface

- **Chat Window** - Full-screen chat interface with message history
- **Control Panel** - Bottom-mounted controls (microphone, remote, speaker)
- **Message Display** - User and agent messages with timestamps
- **Latency Metrics** - VAD, STT, LLM, TTS va total latency ko'rsatkichlari
- **Agent Status Indicator** - Real-time agent connection status

### Design Features

- **Glassmorphism** - Semi-transparent elements with backdrop blur
- **Responsive Layout** - Adapts to different screen sizes
- **Smooth Animations** - Micro-interactions for better UX
- **Modern Icons** - Clean SVG icons for controls
- **Message Duplicate Filtering** - Intelligent duplicate message detection

## 🔌 API Integration

### Token Generation

The application includes a token generation API at `/api/token` that:

- Validates room parameters
- Generates LiveKit access tokens
- Handles authentication

### Environment Configuration

Configure your LiveKit connection in `.env.local`:

```env
# Required for token generation and job submission
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_HOST=http://your-livekit-server.com

# Required for client connection
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com

# Agent configuration (must match worker agent_name)
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=my-telephony-agent
LIVEKIT_AGENT_NAME=my-telephony-agent
```

See `env.template` for all available configuration options.

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Docker

```bash
# Build the image
docker build -t abdusoft-livekit-ui .

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_LIVEKIT_URL=wss://your-server.com \
  -e LIVEKIT_API_KEY=your-key \
  -e LIVEKIT_API_SECRET=your-secret \
  abdusoft-livekit-ui
```

### Other Platforms

This is a standard Next.js application that can be deployed to:
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
- Any Node.js hosting provider

## 📚 Documentation

Barcha qo'llanmalar `docs/` katalogida:

- **[Local Development Guide](./docs/LOCAL_DEVELOPMENT.md)** - Local LiveKit server va agent setup
- **[Agent Data Channel Setup](./docs/AGENT_DATA_CHANNEL_SETUP.md)** - Agent'dan data channel orqali ma'lumot yuborish
- **[Agent Worker Job Setup](./docs/AGENT_WORKER_JOB_SETUP.md)** - Agent worker job submission
- **[LiveKit Job API](./docs/LIVEKIT_JOB_API.md)** - Backend job API dokumentatsiyasi
- **[Pipeline Monitoring](./docs/AGENTSESSION_PIPELINE_MONITORING.md)** - Pipeline metrics monitoring
- **[Room Events Report](./docs/LIVEKIT_ROOM_EVENTS_REPORT.md)** - LiveKit room events spetsifikatsiyasi
- **[Agent Worker Troubleshooting](./docs/AGENT_WORKER_TROUBLESHOOTING.md)** - Agent worker muammolarini hal qilish

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[LiveKit](https://livekit.io/)** - Real-time infrastructure
- **[Abdusoft uz](https://github.com/abdusoft-uz)** - Development team
- **[Vercel](https://vercel.com/)** - Deployment platform
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling framework

## 🔗 Links

- [Abdusoft uz GitHub](https://github.com/abdusoft-uz)
- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Report Issues](https://github.com/abdusoft-uz/public-livekit-ui-example/issues)

---

**Built with ❤️ by Abdusoft (Bobomalikov Abduaziz)**

GitHub: [@abdusoft-uz](https://github.com/abdusoft-uz) 