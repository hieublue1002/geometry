
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Shield, Trophy, Music, Disc } from 'lucide-react';

// --- GAME CONFIGURATION & ASSETS ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.65;
const JUMP_FORCE = -11.5;
const FLOOR_HEIGHT = 80;

const STAGES = [
  { id: 1, name: "Stereo Madness", difficulty: "Easy", stars: 1, color: "#3b82f6", bgSpeed: 0.5, speed: 6 },
  { id: 2, name: "Back On Track", difficulty: "Normal", stars: 2, color: "#10b981", bgSpeed: 0.7, speed: 7 },
  { id: 3, name: "Polargeist", difficulty: "Hard", stars: 3, color: "#f59e0b", bgSpeed: 0.9, speed: 8 },
];

// --- MAIN APPLICATION COMPONENT ---
export default function GeometryDashApp() {
  const [gameState, setGameState] = useState('MENU'); // MENU, PLAYING, GAMEOVER, VICTORY
  const [selectedStage, setSelectedStage] = useState(STAGES[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Gameplay Refs
  const playerRef = useRef({
    x: 100,
    y: CANVAS_HEIGHT - FLOOR_HEIGHT - 30,
    size: 30,
    vy: 0,
    rotation: 0,
    isGrounded: true,
  });

  const levelLengthRef = useRef(3000);
  const cameraXRef = useRef(0);
  const checkpointsRef = useRef([]);

  // Generate Obstacles for Level
  const obstaclesRef = useRef([
    { type: 'spike', x: 500, width: 30, height: 30 },
    { type: 'spike', x: 800, width: 30, height: 30 },
    { type: 'spike', x: 830, width: 30, height: 30 },
    { type: 'block', x: 1100, y: CANVAS_HEIGHT - FLOOR_HEIGHT - 40, width: 40, height: 40 },
    { type: 'spike', x: 1105, y: CANVAS_HEIGHT - FLOOR_HEIGHT - 70, width: 30, height: 30 },
    { type: 'pad', x: 1400, y: CANVAS_HEIGHT - FLOOR_HEIGHT - 10, width: 40, height: 10 },
    { type: 'spike', x: 1700, width: 30, height: 30 },
    { type: 'spike', x: 1730, width: 30, height: 30 },
    { type: 'spike', x: 1760, width: 30, height: 30 },
    { type: 'portal', x: 2800, y: CANVAS_HEIGHT - FLOOR_HEIGHT - 100, width: 20, height: 100 }
  ]);

  // Handle Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState === 'PLAYING') {
        triggerJump();
      }
    };

    const handleTouchStart = () => {
      if (gameState === 'PLAYING') {
        triggerJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameState]);

  const triggerJump = () => {
    const player = playerRef.current;
    if (player.isGrounded) {
      player.vy = JUMP_FORCE;
      player.isGrounded = false;
    }
  };

  const startGame = (stage) => {
    setSelectedStage(stage);
    setGameState('PLAYING');
    setAttempts(1);
    setProgress(0);
    resetPlayer();
  };

  const resetPlayer = () => {
    playerRef.current = {
      x: 100,
      y: CANVAS_HEIGHT - FLOOR_HEIGHT - 30,
      size: 30,
      vy: 0,
      rotation: 0,
      isGrounded: true,
    };
    cameraXRef.current = 0;
  };

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const gameLoop = () => {
      const player = playerRef.current;

      // Physics Update
      player.vy += GRAVITY;
      player.y += player.vy;
      player.x += selectedStage.speed;
      cameraXRef.current = player.x - 100;

      // Floor Collision
      const floorY = CANVAS_HEIGHT - FLOOR_HEIGHT - player.size;
      if (player.y >= floorY) {
        player.y = floorY;
        player.vy = 0;
        player.isGrounded = true;
        player.rotation = Math.round(player.rotation / 90) * 90; // Snap to grid
      } else {
        player.rotation += 8; // Air rotation animation
      }

      // Update Progress
      const currentProgress = Math.min(100, Math.floor((player.x / levelLengthRef.current) * 100));
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        setGameState('VICTORY');
        return;
      }

      // Obstacle Collision Check
      for (let obs of obstaclesRef.current) {
        const obsY = obs.y || (CANVAS_HEIGHT - FLOOR_HEIGHT - obs.height);
        
        // Simple AABB Collision
        if (
          player.x < obs.x + obs.width &&
          player.x + player.size > obs.x &&
          player.y < obsY + obs.height &&
          player.y + player.size > obsY
        ) {
          if (obs.type === 'pad') {
            player.vy = JUMP_FORCE * 1.3;
            player.isGrounded = false;
          } else {
            // Collision / Death
            setAttempts((prev) => prev + 1);
            resetPlayer();
            break;
          }
        }
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Render Background
      ctx.fillStyle = selectedStage.color;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Render Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const offsetX = cameraXRef.current * selectedStage.bgSpeed % 40;
      for (let x = -offsetX; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Render Floor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, CANVAS_HEIGHT - FLOOR_HEIGHT, CANVAS_WIDTH, FLOOR_HEIGHT);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, CANVAS_HEIGHT - FLOOR_HEIGHT, CANVAS_WIDTH, 4);

      // Render Obstacles
      obstaclesRef.current.forEach((obs) => {
        const renderX = obs.x - cameraXRef.current;
        const renderY = obs.y || (CANVAS_HEIGHT - FLOOR_HEIGHT - obs.height);

        if (renderX + obs.width > 0 && renderX < CANVAS_WIDTH) {
          if (obs.type === 'spike') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(renderX, renderY + obs.height);
            ctx.lineTo(renderX + obs.width / 2, renderY);
            ctx.lineTo(renderX + obs.width, renderY + obs.height);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (obs.type === 'block') {
            ctx.fillStyle = '#eab308';
            ctx.fillRect(renderX, renderY, obs.width, obs.height);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(renderX, renderY, obs.width, obs.height);
          } else if (obs.type === 'pad') {
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(renderX, renderY, obs.width, obs.height);
          }
        }
      });

      // Render Player (Icon Cube)
      ctx.save();
      ctx.translate(player.x - cameraXRef.current + player.size / 2, player.y + player.size / 2);
      ctx.rotate((player.rotation * Math.PI) / 180);
      
      // Cube Body
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(-player.size / 2, -player.size / 2, player.size, player.size);

      // Inner Eye/Face Details
      ctx.fillStyle = '#yellow';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, selectedStage]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white font-sans select-none">
      {/* HEADER BAR */}
      <header className="w-full max-w-4xl flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Disc className="w-8 h-8 text-yellow-400 animate-spin" />
          <h1 className="text-2xl font-black italic tracking-wider bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
            GEOMETRY DASH JS
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
          </button>
        </div>
      </header>

      {/* GAME VIEWPORT CONTAINER */}
      <div className="relative w-full max-w-4xl h-[400px] bg-black overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
        {/* CANVAS */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block"
          onClick={triggerJump}
        />

        {/* OVERLAY: MAIN MENU */}
        {gameState === 'MENU' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-4xl font-extrabold mb-6 tracking-wide text-yellow-400">SELECT STAGE</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
              {STAGES.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => startGame(stage)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-slate-700 hover:border-yellow-400 bg-slate-900/90 hover:scale-105 transition duration-200"
                >
                  <Trophy className="w-8 h-8 text-yellow-400 mb-2" />
                  <span className="font-bold text-lg">{stage.name}</span>
                  <span className="text-xs text-slate-400 mt-1">Diff: {stage.difficulty}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OVERLAY: PLAYING HUD */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700 text-sm font-bold">
              Attempt {attempts}
            </div>
            <div className="w-1/3 bg-slate-800 h-4 rounded-full border border-slate-600 overflow-hidden">
              <div
                className="bg-green-400 h-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700 text-sm font-bold">
              {progress}%
            </div>
          </div>
        )}

        {/* OVERLAY: VICTORY SCREEN */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mb-4 animate-bounce" />
            <h2 className="text-4xl font-black text-green-400 mb-2">LEVEL COMPLETE!</h2>
            <p className="text-slate-300 mb-6">Completed in {attempts} attempt(s)!</p>
            <button
              onClick={() => setGameState('MENU')}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-extrabold rounded-xl transition"
            >
              BACK TO MENU
            </button>
          </div>
        )}
      </div>

      {/* FOOTER INSTRUCTIONS */}
      <footer className="w-full max-w-4xl p-4 bg-slate-900 border-t border-slate-800 rounded-b-xl text-center text-xs text-slate-400">
        Press <span className="text-yellow-400 font-bold">SPACE</span>, <span className="text-yellow-400 font-bold">UP ARROW</span>, or <span className="text-yellow-400 font-bold">CLICK/TAP</span> to jump. Avoid spikes and obstacles!
      </footer>
    </div>
  );
}
