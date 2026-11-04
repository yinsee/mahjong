// Optional TURN relay servers. Without TURN, players connect directly (STUN only).
// Direct connections fail on some networks (VPNs such as Cloudflare WARP / iCloud Private Relay,
// strict office or mobile networks). Add a TURN server to relay those games.
//
// Free options (need a sign-up): metered.ca "Open Relay" free tier, or Cloudflare Realtime TURN.
// Example:
// export const TURN_SERVERS = [
//   { urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:443?transport=tcp'],
//     username: 'YOUR_USERNAME', credential: 'YOUR_CREDENTIAL' },
// ];
export const TURN_SERVERS = [];
