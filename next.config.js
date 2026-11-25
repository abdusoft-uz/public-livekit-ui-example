/** @type {import('next').NextConfig} */
// Note: server-only variables (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, ...) are intentionally
// NOT listed in `env`: that would inline them into the build output. API routes read them
// from process.env at runtime. NEXT_PUBLIC_* variables are inlined automatically.
const nextConfig = {
  trailingSlash: true,
  reactStrictMode: true,
};

module.exports = nextConfig;
