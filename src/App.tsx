import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TitleScreen, COLOR_OPTIONS } from './components/TitleScreen.tsx';
import { CreateRoomModal } from './components/CreateRoomModal.tsx';
import { LobbyBrowserModal } from './components/LobbyBrowserModal.tsx';
import { JoinCodeModal } from './components/JoinCodeModal.tsx';
import { ServerSettingsModal } from './components/ServerSettingsModal.tsx';
import { InGameHUD } from './components/InGameHUD.tsx';
import { RoundSummaryModal } from './components/RoundSummaryModal.tsx';
import { GameRenderer } from './game/renderer.ts';
import { sound } from './game/audio.ts';
import {
  ClientMessage,
  GameSnapshot,
  RoomConfig,
  RoomSummary,
  ServerMessage,
  TankPlayer,
} from './types/game.ts';

export default function App() {
  // Pilot Profile Settings
  const [pilotName, setPilotName] = useState(() => {
    return localStorage.getItem('neon_pilot_name') || `Pilot_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [selectedColor, setSelectedColor] = useState(() => {
    return localStorage.getItem('neon_tank_color') || COLOR_OPTIONS[0].hex;
  });

  // UI Navigation Views & Modals
  const [view, setView] = useState<'TITLE' | 'PLAYING'>('TITLE');
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multiplayer State
  const [publicRooms, setPublicRooms] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomConfig | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [ping, setPing] = useState(18);

  const resolveWsUrl = useCallback((): string => {
    // 1. URL search parameter (?server=...)
    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get('server');
    if (serverParam) {
      if (serverParam.startsWith('ws://') || serverParam.startsWith('wss://')) return serverParam;
      const proto = serverParam.startsWith('http://') ? 'ws://' : 'wss://';
      return `${proto}${serverParam.replace(/^https?:\/\//, '')}`;
    }
    // 2. Custom server saved in localStorage
    const custom = localStorage.getItem('neon_custom_server_url');
    if (custom && custom.trim().length > 0) {
      const clean = custom.trim();
      if (clean.startsWith('ws://') || clean.startsWith('wss://')) return clean;
      const proto = clean.startsWith('http://') ? 'ws://' : 'wss://';
      return `${proto}${clean.replace(/^https?:\/\//, '')}`;
    }
    // 3. VITE_WS_URL environment variable
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    // 4. Fallback to current browser host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }, []);

  const [currentServerUrl, setCurrentServerUrl] = useState<string>(() => resolveWsUrl());

  // Latest game snapshot
  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    status: 'waiting',
    currentRound: 1,
    roundsToWin: 3,
    players: [],
    projectiles: [],
    powerUps: [],
    walls: [],
    killFeed: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const snapshotRef = useRef<GameSnapshot>(snapshot);
  snapshotRef.current = snapshot;

  // Active inputs
  const keysDown = useRef<Set<string>>(new Set());
  const mousePos = useRef<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const isMouseDown = useRef(false);
  const inputSeq = useRef(0);

  // Save profile changes
  const handleNameChange = (name: string) => {
    setPilotName(name);
    localStorage.setItem('neon_pilot_name', name);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    localStorage.setItem('neon_tank_color', color);
  };

  // Connect to WebSocket Server
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return wsRef.current;
    }

    const wsUrl = resolveWsUrl();
    setCurrentServerUrl(wsUrl);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      setIsConnected(false);
      return null as any;
    }

    ws.onopen = () => {
      setIsConnected(true);
      // Ping loop
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', clientTime: Date.now() }));
        }
      }, 3000);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        if (msg.type === 'pong') {
          const latency = Date.now() - msg.clientTime;
          setPing(Math.max(4, latency));
        } else if (msg.type === 'joined_room') {
          setCurrentRoom(msg.roomConfig);
          setLocalPlayerId(msg.playerId);
          setIsHost(msg.isHost);
          setView('PLAYING');
          setIsBrowseOpen(false);
          setIsCreateOpen(false);
          setIsJoinCodeOpen(false);
          if (rendererRef.current) {
            rendererRef.current.setLocalPlayerId(msg.playerId);
          }
        } else if (msg.type === 'room_list') {
          setPublicRooms(msg.rooms);
        } else if (msg.type === 'state_snapshot') {
          setSnapshot(msg.snapshot);
        } else if (msg.type === 'game_event') {
          handleGameEvent(msg.event, msg.data);
        } else if (msg.type === 'error') {
          setErrorMessage(msg.message);
          setTimeout(() => setErrorMessage(null), 4000);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect after brief pause if in match
      setTimeout(() => {
        if (view === 'PLAYING') {
          connectWebSocket();
        }
      }, 1500);
    };

    wsRef.current = ws;
    return ws;
  }, [view, resolveWsUrl]);

  const handleSaveServerUrl = (url: string) => {
    if (url) {
      localStorage.setItem('neon_custom_server_url', url);
    } else {
      localStorage.removeItem('neon_custom_server_url');
    }
    const resolved = resolveWsUrl();
    setCurrentServerUrl(resolved);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setTimeout(() => {
      connectWebSocket();
    }, 100);
  };

  // Trigger procedural audio & screen shake for game events
  const handleGameEvent = (event: string, data: any) => {
    if (event === 'fire') {
      sound.playShoot(data?.isMega);
    } else if (event === 'ricochet') {
      sound.playRicochet();
      if (rendererRef.current && data?.x && data?.y) {
        rendererRef.current.spawnRicochetSparks(data.x, data.y);
      }
    } else if (event === 'hit') {
      sound.playHit();
      if (rendererRef.current) {
        rendererRef.current.triggerScreenShake(data?.damage ? data.damage * 0.15 : 6);
      }
    } else if (event === 'explosion') {
      sound.playExplosion();
      if (rendererRef.current && data?.x && data?.y) {
        rendererRef.current.triggerScreenShake(data.isBig ? 12 : 7);
        rendererRef.current.spawnExplosionParticles(data.x, data.y, '#f59e0b', data.isBig ? 32 : 18);
      }
    } else if (event === 'powerup_collected') {
      sound.playPowerup();
    } else if (event === 'round_win') {
      sound.playRoundWin();
    } else if (event === 'match_win') {
      sound.playRoundWin();
    }
  };

  // Join Room Actions
  const handleQuickPlay = () => {
    const ws = connectWebSocket();
    const sendJoin = () => {
      ws.send(
        JSON.stringify({
          type: 'join_room',
          name: pilotName,
          color: selectedColor,
          isPublic: true,
        })
      );
    };
    if (ws.readyState === WebSocket.OPEN) {
      sendJoin();
    } else {
      ws.addEventListener('open', sendJoin, { once: true });
    }
  };

  const handleJoinByCode = (code: string) => {
    const ws = connectWebSocket();
    const sendJoin = () => {
      ws.send(
        JSON.stringify({
          type: 'join_room',
          roomId: code,
          name: pilotName,
          color: selectedColor,
        })
      );
    };
    if (ws.readyState === WebSocket.OPEN) {
      sendJoin();
    } else {
      ws.addEventListener('open', sendJoin, { once: true });
    }
  };

  const handleCreateRoom = (config: Partial<RoomConfig>) => {
    const ws = connectWebSocket();
    const sendCreate = () => {
      ws.send(
        JSON.stringify({
          type: 'create_room',
          config,
          name: pilotName,
          color: selectedColor,
        })
      );
    };
    if (ws.readyState === WebSocket.OPEN) {
      sendCreate();
    } else {
      ws.addEventListener('open', sendCreate, { once: true });
    }
  };

  const handleLeaveRoom = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_room' }));
    }
    setView('TITLE');
    setCurrentRoom(null);
    setLocalPlayerId(null);
    // Clean URL param
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };

  const handleAddBot = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'add_bot' }));
    }
  };

  const handleRemoveBot = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'remove_bot' }));
    }
  };

  const handleStartMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_match' }));
    }
  };

  // Check URL query parameters for invite link on first load
  useEffect(() => {
    connectWebSocket();
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      handleJoinByCode(roomParam.toUpperCase());
    }
    // Fetch initial room list via HTTP
    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPublicRooms(data);
      })
      .catch(() => {});
  }, [connectWebSocket]);

  // Canvas Setup & 60fps Animation Loop
  useEffect(() => {
    if (view !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new GameRenderer(canvas);
    rendererRef.current = renderer;
    if (localPlayerId) {
      renderer.setLocalPlayerId(localPlayerId);
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let lastFrame = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastFrame) / 1000, 0.05);
      lastFrame = time;

      renderer.render(snapshotRef.current, dt);
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [view, localPlayerId]);

  // Client Input Controller (WASD, Mouse Aim, Fire)
  useEffect(() => {
    if (view !== 'PLAYING') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = false;
    };

    const handleBlur = () => {
      keysDown.current.clear();
      isMouseDown.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);

    // Input loop sending client inputs to server at 30Hz
    const inputInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const keys = keysDown.current;
      let moveX = 0;
      let moveY = 0;

      if (keys.has('KeyW') || keys.has('ArrowUp')) moveY -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) moveY += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) moveX += 1;

      // Normalize diagonal vector
      const mag = Math.hypot(moveX, moveY);
      if (mag > 0) {
        moveX /= mag;
        moveY /= mag;
      }

      // Compute Turret Aim Angle relative to viewport center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const turretAngle = Math.atan2(mousePos.current.y - centerY, mousePos.current.x - centerX);

      const firing = isMouseDown.current || keys.has('Space');
      const boost = keys.has('ShiftLeft') || keys.has('ShiftRight');

      inputSeq.current++;
      const inputMsg: ClientMessage = {
        type: 'player_input',
        seq: inputSeq.current,
        moveX,
        moveY,
        turretAngle,
        firing,
        boost,
      };

      wsRef.current.send(JSON.stringify(inputMsg));
    }, 1000 / 30);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
      clearInterval(inputInterval);
    };
  }, [view]);

  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId) || null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070a13] select-none font-sans">
      {/* Toast Error Alert */}
      {errorMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200">
          {errorMessage}
        </div>
      )}

      {/* Title Screen View */}
      {view === 'TITLE' && (
        <>
          <TitleScreen
            pilotName={pilotName}
            setPilotName={handleNameChange}
            selectedColor={selectedColor}
            setSelectedColor={handleColorChange}
            onQuickPlay={handleQuickPlay}
            onOpenBrowse={() => {
              // Refresh room list
              fetch('/api/rooms')
                .then((r) => r.json())
                .then((data) => Array.isArray(data) && setPublicRooms(data))
                .catch(() => {});
              setIsBrowseOpen(true);
            }}
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenJoinCode={() => setIsJoinCodeOpen(true)}
            isConnected={isConnected}
            onOpenServerSettings={() => setIsServerSettingsOpen(true)}
          />

          <CreateRoomModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onCreate={handleCreateRoom}
          />

          <LobbyBrowserModal
            isOpen={isBrowseOpen}
            onClose={() => setIsBrowseOpen(false)}
            rooms={publicRooms}
            onRefresh={() => {
              fetch('/api/rooms')
                .then((r) => r.json())
                .then((data) => Array.isArray(data) && setPublicRooms(data))
                .catch(() => {});
            }}
            onJoinRoom={handleJoinByCode}
            onCreateNew={() => {
              setIsBrowseOpen(false);
              setIsCreateOpen(true);
            }}
          />

          <JoinCodeModal
            isOpen={isJoinCodeOpen}
            onClose={() => setIsJoinCodeOpen(false)}
            onJoin={handleJoinByCode}
          />

          <ServerSettingsModal
            isOpen={isServerSettingsOpen}
            onClose={() => setIsServerSettingsOpen(false)}
            currentServerUrl={currentServerUrl}
            onSaveServerUrl={handleSaveServerUrl}
            isConnected={isConnected}
          />
        </>
      )}

      {/* Active Combat Arena View */}
      {view === 'PLAYING' && currentRoom && (
        <>
          {/* 60fps Canvas Viewport */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block cursor-crosshair" />

          {/* Low-Occlusion HUD Overlay */}
          <InGameHUD
            roomConfig={currentRoom}
            snapshot={snapshot}
            localPlayer={localPlayer}
            isHost={isHost}
            ping={ping}
            onLeaveRoom={handleLeaveRoom}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onStartMatch={handleStartMatch}
          />

          {/* Round Summary & Match Victory Modals */}
          <RoundSummaryModal
            snapshot={snapshot}
            localPlayer={localPlayer}
            isHost={isHost}
            onRematch={handleStartMatch}
            onLeave={handleLeaveRoom}
          />
        </>
      )}
    </div>
  );
}
