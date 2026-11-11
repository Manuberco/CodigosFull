import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, FastForward, RotateCcw, Info, X } from 'lucide-react';

interface Planet {
  name: string;
  nameEs: string;
  radius: number; // km
  distance: number; // million km from sun
  orbitalPeriod: number; // Earth days
  color: string;
  orbitRadius: number; // pixels for display
  displayRadius: number; // pixels for display
  description: string;
}

const planets: Planet[] = [
  {
    name: 'Mercury',
    nameEs: 'Mercurio',
    radius: 2439,
    distance: 57.9,
    orbitalPeriod: 88,
    color: '#b5b5b5',
    orbitRadius: 60,
    displayRadius: 4,
    description: 'El planeta más pequeño y cercano al Sol. No tiene atmósfera significativa y sus temperaturas varían extremadamente.',
  },
  {
    name: 'Venus',
    nameEs: 'Venus',
    radius: 6052,
    distance: 108.2,
    orbitalPeriod: 225,
    color: '#e8cda0',
    orbitRadius: 90,
    displayRadius: 7,
    description: 'El planeta más caliente del sistema solar debido a su efecto invernadero extremo. Gira en dirección opuesta a la mayoría de los planetas.',
  },
  {
    name: 'Earth',
    nameEs: 'Tierra',
    radius: 6371,
    distance: 149.6,
    orbitalPeriod: 365,
    color: '#4da6ff',
    orbitRadius: 125,
    displayRadius: 7,
    description: 'Nuestro hogar. El único planeta conocido que alberga vida. Tiene agua líquida en su superficie y una atmósfera rica en oxígeno.',
  },
  {
    name: 'Mars',
    nameEs: 'Marte',
    radius: 3390,
    distance: 227.9,
    orbitalPeriod: 687,
    color: '#e27b58',
    orbitRadius: 160,
    displayRadius: 5,
    description: 'El planeta rojo. Tiene el volcán más grande del sistema solar (Olympus Mons) y evidencia de agua pasada en su superficie.',
  },
  {
    name: 'Jupiter',
    nameEs: 'Júpiter',
    radius: 69911,
    distance: 778.5,
    orbitalPeriod: 4333,
    color: '#c88b3a',
    orbitRadius: 210,
    displayRadius: 16,
    description: 'El planeta más grande del sistema solar. Es un gigante gaseoso con una famosa Gran Mancha Roja, una tormenta que dura siglos.',
  },
  {
    name: 'Saturn',
    nameEs: 'Saturno',
    radius: 58232,
    distance: 1434,
    orbitalPeriod: 10759,
    color: '#e8d590',
    orbitRadius: 265,
    displayRadius: 14,
    description: 'Famoso por sus espectaculares anillos compuestos de hielo y roca. Es el segundo planeta más grande y tiene más de 80 lunas.',
  },
  {
    name: 'Uranus',
    nameEs: 'Urano',
    radius: 25362,
    distance: 2871,
    orbitalPeriod: 30687,
    color: '#7de8e8',
    orbitRadius: 320,
    displayRadius: 10,
    description: 'Un gigante de hielo que rota de lado. Tiene un eje de rotación inclinado casi 98 grados, lo que lo hace único en el sistema solar.',
  },
  {
    name: 'Neptune',
    nameEs: 'Neptuno',
    radius: 24622,
    distance: 4495,
    orbitalPeriod: 60190,
    color: '#3f5efb',
    orbitRadius: 370,
    displayRadius: 10,
    description: 'El planeta más lejano del Sol. Tiene los vientos más fuertes del sistema solar, alcanzando hasta 2,100 km/h.',
  },
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  const getPlanetPosition = useCallback((planet: Planet, time: number) => {
    const angularSpeed = (2 * Math.PI) / (planet.orbitalPeriod * 0.5);
    const angle = time * angularSpeed;
    const x = Math.cos(angle) * planet.orbitRadius;
    const y = Math.sin(angle) * planet.orbitRadius * 0.4; // Elliptical perspective
    return { x, y, angle };
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw starfield background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    const starSeed = 42;
    for (let i = 0; i < 200; i++) {
      const sx = ((starSeed * (i + 1) * 7919) % width);
      const sy = ((starSeed * (i + 1) * 6271) % height);
      const size = ((i * 3571) % 3) * 0.5 + 0.5;
      const brightness = 0.3 + ((i * 2347) % 70) / 100;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fill();
    }

    // Draw orbit paths
    planets.forEach((planet) => {
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, planet.orbitRadius, planet.orbitRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = hoveredPlanet === planet.name ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = hoveredPlanet === planet.name ? 1.5 : 0.5;
      ctx.stroke();
    });

    // Draw Sun
    const sunGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
    sunGradient.addColorStop(0, '#fff7a0');
    sunGradient.addColorStop(0.3, '#ffcc00');
    sunGradient.addColorStop(0.7, '#ff8c00');
    sunGradient.addColorStop(1, '#ff4500');
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.fillStyle = sunGradient;
    ctx.fill();

    // Sun glow
    const glowGradient = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, 50);
    glowGradient.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    // Draw planets (sorted by y position for depth effect)
    const planetPositions = planets.map((planet) => {
      const pos = getPlanetPosition(planet, time);
      return { planet, x: centerX + pos.x, y: centerY + pos.y, angle: pos.angle };
    });

    planetPositions.sort((a, b) => a.y - b.y);

    planetPositions.forEach(({ planet, x, y }) => {
      // Planet shadow/3D effect
      const gradient = ctx.createRadialGradient(
        x - planet.displayRadius * 0.3,
        y - planet.displayRadius * 0.3,
        0,
        x,
        y,
        planet.displayRadius
      );
      gradient.addColorStop(0, lightenColor(planet.color, 40));
      gradient.addColorStop(0.7, planet.color);
      gradient.addColorStop(1, darkenColor(planet.color, 40));

      ctx.beginPath();
      ctx.arc(x, y, planet.displayRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Highlight if hovered or selected
      if (hoveredPlanet === planet.name || selectedPlanet?.name === planet.name) {
        ctx.beginPath();
        ctx.arc(x, y, planet.displayRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Saturn rings
      if (planet.name === 'Saturn') {
        ctx.beginPath();
        ctx.ellipse(x, y, planet.displayRadius * 2, planet.displayRadius * 0.5, 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(210, 180, 120, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Planet label
      if (hoveredPlanet === planet.name) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(planet.nameEs, x, y - planet.displayRadius - 8);
      }
    });
  }, [hoveredPlanet, selectedPlanet, getPlanetPosition]);

  const animate = useCallback((timestamp: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    if (isPlaying) {
      const delta = (timestamp - lastTimeRef.current) / 1000;
      timeRef.current += delta * speed;
    }
    lastTimeRef.current = timestamp;

    const canvas = canvasRef.current;
    draw(ctx, timeRef.current, canvas.width, canvas.height);
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, speed, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    let clickedPlanet: Planet | null = null;

    for (const planet of planets) {
      const pos = getPlanetPosition(planet, timeRef.current);
      const px = centerX + pos.x;
      const py = centerY + pos.y;
      const dist = Math.sqrt((clickX - px) ** 2 + (clickY - py) ** 2);

      if (dist <= planet.displayRadius + 5) {
        clickedPlanet = planet;
        break;
      }
    }

    if (clickedPlanet) {
      setSelectedPlanet(clickedPlanet);
      setShowInfo(true);
    } else {
      setShowInfo(false);
      setSelectedPlanet(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    let found = false;
    for (const planet of planets) {
      const pos = getPlanetPosition(planet, timeRef.current);
      const px = centerX + pos.x;
      const py = centerY + pos.y;
      const dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

      if (dist <= planet.displayRadius + 5) {
        setHoveredPlanet(planet.name);
        canvas.style.cursor = 'pointer';
        found = true;
        break;
      }
    }

    if (!found) {
      setHoveredPlanet(null);
      canvas.style.cursor = 'default';
    }
  };

  const resetAnimation = () => {
    timeRef.current = 0;
    lastTimeRef.current = 0;
  };

  const speedOptions = [0.5, 1, 2, 5, 10];

  return (
    <div className="w-full h-screen bg-[#0a0a1a] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[#0d0d2b] to-[#1a1a3e] border-b border-white/10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center">
              <span className="text-sm">☀️</span>
            </div>
            <h1 className="text-white text-lg font-bold tracking-wide">
              Sistema Solar Interactivo
            </h1>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            title="Información"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            className="w-full h-full"
          />

          {/* Planet info overlay */}
          {showInfo && selectedPlanet && (
            <div className="absolute top-4 right-4 w-80 bg-[#1a1a3e]/95 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full shadow-lg"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${lightenColor(selectedPlanet.color, 40)}, ${selectedPlanet.color}, ${darkenColor(selectedPlanet.color, 40)})`,
                    }}
                  />
                  <div>
                    <h2 className="text-white font-bold text-xl">{selectedPlanet.nameEs}</h2>
                    <p className="text-white/50 text-sm">{selectedPlanet.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <InfoRow label="Radio" value={`${selectedPlanet.radius.toLocaleString()} km`} />
                <InfoRow label="Distancia al Sol" value={`${selectedPlanet.distance.toLocaleString()} millones km`} />
                <InfoRow label="Período orbital" value={formatOrbitalPeriod(selectedPlanet.orbitalPeriod)} />
                <InfoRow label="Color" value="" color={selectedPlanet.color} />
              </div>

              <p className="text-white/70 text-sm mt-4 leading-relaxed">
                {selectedPlanet.description}
              </p>
            </div>
          )}

          {/* Instructions overlay */}
          {!showInfo && (
            <div className="absolute bottom-20 left-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
              <p className="text-white/50 text-xs">
                💡 Haz clic en un planeta para ver su información
              </p>
            </div>
          )}
        </div>

        {/* Planet sidebar */}
        <div className="hidden lg:flex flex-col w-56 bg-[#0d0d2b]/80 border-l border-white/10 overflow-y-auto">
          <div className="p-3 border-b border-white/10">
            <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider">Planetas</h3>
          </div>
          <div className="flex-1 p-2 space-y-1">
            {planets.map((planet) => (
              <button
                key={planet.name}
                onClick={() => {
                  setSelectedPlanet(planet);
                  setShowInfo(true);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  selectedPlanet?.name === planet.name
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${lightenColor(planet.color, 30)}, ${planet.color})`,
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{planet.nameEs}</p>
                  <p className="text-xs text-white/40">{planet.distance} M km</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-[#0d0d2b] to-[#1a1a3e] border-t border-white/10">
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span className="text-sm">{isPlaying ? 'Pausar' : 'Reproducir'}</span>
          </button>

          {/* Speed controls */}
          <div className="flex items-center gap-1">
            <span className="text-white/50 text-xs mr-2">Velocidad:</span>
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  speed === s
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={resetAnimation}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            title="Reiniciar"
          >
            <RotateCcw size={14} />
          </button>

          {/* Speed indicator */}
          <div className="flex items-center gap-1 text-white/40">
            <FastForward size={12} />
            <span className="text-xs">{speed}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
      <span className="text-white/50 text-sm">{label}</span>
      {color ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-white/80 text-sm">{color}</span>
        </div>
      ) : (
        <span className="text-white/90 text-sm font-medium">{value}</span>
      )}
    </div>
  );
}

function formatOrbitalPeriod(days: number): string {
  if (days < 365) {
    return `${days} días`;
  }
  const years = (days / 365.25).toFixed(1);
  return `${years} años (${days.toLocaleString()} días)`;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * percent / 100));
  return `rgb(${r}, ${g}, ${b})`;
}

export default App;
