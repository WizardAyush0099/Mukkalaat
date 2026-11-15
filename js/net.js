/* Mukkalaat online: PeerJS public broker for signalling, WebRTC data channel for the match.
   No account or key: the host owns a peer id built from the room code, the guest dials it. */

const PREFIX = 'mukkalaat-v1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode() {
  const buf = new Uint8Array(5);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(buf) : buf.forEach((_, i) => buf[i] = Math.random() * 256);
  return Array.from(buf, b => ALPHA[b % ALPHA.length]).join('');
}

export function normaliseCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

export function createNet(h = {}) {
  let peer = null, conn = null, role = null, code = null, closing = false, joinTimer = 0;

  const hasRelay = () => typeof window.Peer === 'function';
  const fail = msg => h.onError && h.onError(msg);

  function wire(c) {
    conn = c;
    c.on('open', () => { clearTimeout(joinTimer); h.onConnect && h.onConnect(); });
    c.on('data', d => h.onData && h.onData(d));
    c.on('close', () => {
      const wasOpen = !!(conn && conn.open);
      conn = null;
      if (!closing) h.onDisconnect && h.onDisconnect(wasOpen);
    });
    c.on('error', e => fail('Connection problem: ' + (e.message || e.type || e)));
  }

  function teardown() {
    if (peer) {
      try { peer.destroy(); } catch (e) { }
      peer = null;
    }
    conn = null;
    clearTimeout(joinTimer);
  }

  const api = {
    get role() { return role; },
    get code() { return code; },
    get connected() { return !!(conn && conn.open); },
    get available() { return hasRelay(); },

    host(roomCode) {
      if (!hasRelay()) return fail('The relay script did not load. Check the connection and reload.');
      closing = true; teardown(); closing = false;
      role = 'host'; code = roomCode;
      peer = new window.Peer(PREFIX + roomCode, { debug: 0 });
      peer.on('open', () => h.onReady && h.onReady(roomCode));
      peer.on('connection', c => {
        if (conn && conn.open) { try { c.close(); } catch (e) { } return; }
        wire(c);
      });
      peer.on('error', e => {
        if (e.type === 'unavailable-id') {
          role = null; code = null;
          fail('That room code is already in use. Try creating another.');
          return;
        }
        fail('Relay error: ' + (e.type || e.message || 'unknown'));
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
    },

    join(roomCode) {
      if (!hasRelay()) return fail('The relay script did not load. Check the connection and reload.');
      closing = true; teardown(); closing = false;
      role = 'guest'; code = roomCode;
      peer = new window.Peer(undefined, { debug: 0 });
      peer.on('open', () => {
        wire(peer.connect(PREFIX + roomCode, { reliable: true, serialization: 'json' }));
        joinTimer = setTimeout(() => {
          if (!conn || !conn.open) fail('No answer from room ' + roomCode + '. Check the code with the host.');
        }, 15000);
      });
      peer.on('error', e => {
        if (e.type === 'peer-unavailable') {
          fail('Room ' + roomCode + ' is not open. Check the code with the host.');
          return;
        }
        fail('Relay error: ' + (e.type || e.message || 'unknown'));
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
    },

    send(msg) {
      if (!conn || !conn.open) return false;
      try { conn.send(msg); return true; } catch (e) { return false; }
    },

    close() {
      closing = true;
      try { if (conn) conn.close(); } catch (e) { }
      teardown();
      role = null; code = null;
      closing = false;
      h.onClosed && h.onClosed();
    }
  };
  return api;
}
