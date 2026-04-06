import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { getUserTeams } from '../services/teamService';
import { getEvent } from '../services/eventService';
import type { Team, FullEvent } from '../types';

// ── 3D Node ───────────────────────────────────────────────────────────────────
function Node({
  position, label, onClick, isHovered,
}: {
  position: [number, number, number];
  label: string;
  onClick: () => void;
  isHovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[isHovered ? 1.2 : 0.8, 32, 32]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.1} />
      </mesh>
      <mesh ref={meshRef} onClick={onClick}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={isHovered ? '#00F0FF' : '#0B0F2E'}
          emissive={isHovered ? '#00F0FF' : '#000000'}
          emissiveIntensity={isHovered ? 0.5 : 0}
          metalness={0.8} roughness={0.2}
        />
      </mesh>
      <Html distanceFactor={10}>
        <div
          onClick={onClick}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${isHovered
              ? 'bg-cyber-cyan text-cyber-dark'
              : 'bg-cyber-darker/80 text-cyber-cyan border border-cyber-cyan/30'
            }`}
        >{label}</div>
      </Html>
      {isHovered && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
          <meshBasicMaterial color="#00F0FF" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function GridFloor() {
  const gridRef = useRef<THREE.GridHelper>(null);
  useFrame((state) => {
    if (gridRef.current) {
      const mat = gridRef.current.material as THREE.Material;
      if (mat) mat.opacity = 0.3 + Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });
  return <gridHelper ref={gridRef} args={[50, 50, '#00F0FF', '#00F0FF']} position={[0, -3, 0]} />;
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#00F0FF" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

const NODES = [
  { id: 'dashboard', label: 'Dashboard', path: '/participant/dashboard', position: [0, 0, 0] as [number, number, number] },
  { id: 'events', label: 'Events', path: '/events', position: [-4, 1, -2] as [number, number, number] },
  { id: 'team', label: 'My Team', path: '/participant/team', position: [4, 1, -2] as [number, number, number] },
  { id: 'chat', label: 'Team Chat', path: '/participant/collaboration', position: [-3, 0.5, 3] as [number, number, number] },
  { id: 'submission', label: 'Submit Project', path: '/participant/submission', position: [3, 0.5, 3] as [number, number, number] },
  { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', position: [0, 2, -4] as [number, number, number] },
];

function Scene({ hoveredNode, onNodeClick }: { hoveredNode: string | null; onNodeClick: (path: string) => void }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} color="#00F0FF" intensity={1} />
      <pointLight position={[-10, -10, -10]} color="#0066FF" intensity={0.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <GridFloor />
      <Particles />
      {NODES.map((node) => (
        <Node
          key={node.id}
          position={node.position}
          label={node.label}
          onClick={() => onNodeClick(node.path)}
          isHovered={hoveredNode === node.id}
        />
      ))}
      {NODES.slice(1).map((node, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, ...node.position]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00F0FF" transparent opacity={0.2} />
        </line>
      ))}
      <OrbitControls
        enablePan={false} enableZoom={true}
        minDistance={5} maxDistance={20}
        autoRotate autoRotateSpeed={0.5}
      />
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Town3D() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Load team + event name for the HUD
  const [teamName, setTeamName] = useState('');
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    if (!profile) return;
    getUserTeams(profile.$id).then(async (teams) => {
      if (!teams.length) return;

      // Pick the ongoing team (event has started and not ended)
      const now = Date.now();
      let pick = teams.find((t) => {
        // We don't have event data yet; will resolve below
        return true; // fallback: just use first team
      });

      // Enrich with event data to find ongoing
      const enriched = await Promise.all(
        teams.map(async (t) => ({ team: t, event: await getEvent(t.eventId) }))
      );
      const ongoing = enriched.find(({ event }) => {
        const start = new Date(event.startDate).getTime();
        const end = new Date(event.endDate).getTime();
        return now >= start && now <= end;
      });

      const chosen = ongoing || enriched[0];
      if (chosen) {
        setTeamName(chosen.team.name);
        setEventName(chosen.event.title);
      }
    }).catch(() => { });
  }, [profile?.$id]);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }} style={{ background: '#070A1F' }}>
        <Scene hoveredNode={hoveredNode} onNodeClick={(path) => navigate(path)} />
      </Canvas>

      {/* ── Top HUD ── */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white">
              HACK<span className="text-cyber-cyan">VERSE</span> TOWN
            </h1>
            <p className="text-cyber-gray text-sm mt-1">
              Welcome, <span className="text-white font-medium">{profile?.name?.split(' ')[0]}</span>
              {' · Click nodes to navigate'}
            </p>

            {/* ── Team + Event info ── */}
            {(teamName || eventName) && (
              <div className="mt-3 flex flex-wrap gap-3">
                {teamName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg">
                    <span className="text-cyber-cyan/70 text-xs uppercase tracking-wider">Team</span>
                    <span className="text-cyber-cyan font-semibold text-sm">{teamName}</span>
                  </div>
                )}
                {eventName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-cyber-cyan/20 rounded-lg">
                    <span className="text-cyber-gray text-xs uppercase tracking-wider">Event</span>
                    <span className="text-white font-medium text-sm">{eventName}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/participant/dashboard')}
            className="cyber-button pointer-events-auto text-sm"
          >
            Exit 3D
          </button>
        </div>
      </div>

      {/* ── Bottom nav buttons ── */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex flex-wrap justify-center gap-3 pointer-events-auto">
          {NODES.map((node) => (
            <button
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => navigate(node.path)}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${hoveredNode === node.id
                  ? 'border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan'
                  : 'border-cyber-cyan/30 text-cyber-gray hover:border-cyber-cyan/50'
                }`}
            >
              {node.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Help panel ── */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none">
        <div className="cyber-card p-4 max-w-[160px]">
          <h3 className="text-white font-semibold text-sm mb-2">Navigation</h3>
          <ul className="text-cyber-gray text-xs space-y-1">
            <li>• Click nodes</li>
            <li>• Drag to rotate</li>
            <li>• Scroll to zoom</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
