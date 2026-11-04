// PeerJS (WebRTC) networking. The host's peer id is derived from the room code.
import { TURN_SERVERS } from "./config.js";

const PREFIX = 'mjmayhem-v1-';
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function genCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHA[(Math.random() * ALPHA.length) | 0];
  return s;
}

function peerOpts() {
  return {
    debug: 1,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        ...TURN_SERVERS,
      ],
    },
  };
}

export function hostPeer(code, { onConnection, onError }) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(PREFIX + code, peerOpts());
    let opened = false;
    peer.on('open', () => { opened = true; resolve(peer); });
    peer.on('connection', conn => onConnection(conn));
    peer.on('error', err => {
      if (!opened) reject(err);
      else if (onError) onError(err);
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch { /* ignore */ } });
  });
}

export function joinPeer(code, { onData, onClose }) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(peerOpts());
    let done = false;
    const fail = e => { if (!done) { done = true; reject(e); try { peer.destroy(); } catch { /* ignore */ } } };
    let opened = false;
    const timer = setTimeout(() => {
      const e = new Error('timeout');
      e.type = opened ? 'p2p-blocked' : 'network'; // signaling worked but no direct route
      fail(e);
    }, 15000);
    peer.on('error', fail);
    peer.on('open', () => {
      opened = true;
      const conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
      conn.on('open', () => { done = true; clearTimeout(timer); resolve({ peer, conn }); });
      conn.on('data', d => onData(d));
      conn.on('close', () => onClose && onClose());
      conn.on('error', fail);
    });
  });
}
