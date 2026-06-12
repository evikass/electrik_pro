'use client';

import React, { useCallback, useMemo, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import {
  useApartmentStore,
  type Room,
  type InnerWall,
  type SelectedItem,
  type WallSide,
  type InnerWallDirection,
} from '@/store/apartmentStore';

/* ── helpers (pure, no hooks, no store) ─────────────── */

function wallPos(room: Room, side: WallSide, wh: number, wt: number) {
  switch (side) {
    case 'north': return { x: room.x + room.width / 2, y: wh / 2, z: -(room.y + room.height), len: room.width + wt };
    case 'south': return { x: room.x + room.width / 2, y: wh / 2, z: -room.y, len: room.width + wt };
    case 'east':  return { x: room.x + room.width, y: wh / 2, z: -(room.y + room.height / 2), len: room.height + wt };
    case 'west':  return { x: room.x, y: wh / 2, z: -(room.y + room.height / 2), len: room.height + wt };
  }
}

function arrowDirs(side: WallSide): { pos: [number, number, number]; neg: [number, number, number] } {
  switch (side) {
    case 'north': return { pos: [0, 0, -1], neg: [0, 0, 1] };
    case 'south': return { pos: [0, 0, 1], neg: [0, 0, -1] };
    case 'east':  return { pos: [1, 0, 0], neg: [-1, 0, 0] };
    case 'west':  return { pos: [-1, 0, 0], neg: [1, 0, 0] };
  }
}

function wallDeltas(side: WallSide, d: 'pos' | 'neg'): { dx: number; dy: number } {
  const s = d === 'pos' ? 1 : -1;
  switch (side) {
    case 'north': return { dx: 0, dy: s };
    case 'south': return { dx: 0, dy: -s };
    case 'east':  return { dx: s, dy: 0 };
    case 'west':  return { dx: -s, dy: 0 };
  }
}

function innerDirs(dir: InnerWallDirection): { pos: [number, number, number]; neg: [number, number, number] } {
  return dir === 'horizontal'
    ? { pos: [0, 0, -1], neg: [0, 0, 1] }
    : { pos: [1, 0, 0], neg: [-1, 0, 0] };
}

function innerDeltas(dir: InnerWallDirection, d: 'pos' | 'neg'): { dx: number; dy: number } {
  const s = d === 'pos' ? 1 : -1;
  return dir === 'horizontal' ? { dx: 0, dy: s } : { dx: s, dy: 0 };
}

/* ── Arrow3D ────────────────────────────────────────── */

interface ArrowProps {
  direction: [number, number, number];
  position: [number, number, number];
  color: string;
  onClick: () => void;
}

const Arrow3D = memo(function Arrow3D({ direction, position, color, onClick }: ArrowProps) {
  const euler = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...direction).normalize());
    return new THREE.Euler().setFromQuaternion(q);
  }, [direction]);

  const shaft = 0.8;
  const head = 0.2;

  return (
    <group position={position} rotation={euler}>
      <mesh position={[0, shaft / 2, 0]} onPointerDown={(e) => { e.stopPropagation(); onClick(); }}>
        <cylinderGeometry args={[0.05, 0.05, shaft, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, shaft + head / 2, 0]} onPointerDown={(e) => { e.stopPropagation(); onClick(); }}>
        <coneGeometry args={[0.13, head, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
});

/* ── MoveGizmo (receives ALL data as props, ZERO store access) ── */

interface GizmoProps {
  selected: SelectedItem;
  rooms: Room[];
  walls: InnerWall[];
  wallHeight: number;
  onMoveOuter: (roomId: string, wallSide: WallSide, dx: number, dy: number) => void;
  onMoveInner: (wallId: string, dx: number, dy: number) => void;
}

const MoveGizmo = memo(function MoveGizmo({ selected, rooms, walls, wallHeight, onMoveOuter, onMoveInner }: GizmoProps) {
  const clickOuter = useCallback(
    (rid: string, side: WallSide, dir: 'pos' | 'neg') => {
      const d = wallDeltas(side, dir);
      onMoveOuter(rid, side, d.dx, d.dy);
    },
    [onMoveOuter],
  );

  const clickInner = useCallback(
    (wid: string, dir: InnerWallDirection, pole: 'pos' | 'neg') => {
      const d = innerDeltas(dir, pole);
      onMoveInner(wid, d.dx, d.dy);
    },
    [onMoveInner],
  );

  if (selected.type === 'outerWall' && selected.roomId && selected.wallSide) {
    const room = rooms.find((r) => r.id === selected.roomId);
    if (!room) return null;
    const side = selected.wallSide;
    const p = wallPos(room, side, wallHeight, 0);
    const ad = arrowDirs(side);
    const y = wallHeight + 0.35;
    return (
      <group>
        <Arrow3D direction={ad.pos} position={[p.x, y, p.z]} color="#22c55e" onClick={() => clickOuter(room.id, side, 'pos')} />
        <Arrow3D direction={ad.neg} position={[p.x, y, p.z]} color="#ef4444" onClick={() => clickOuter(room.id, side, 'neg')} />
      </group>
    );
  }

  if (selected.type === 'innerWall' && selected.wallId) {
    const wall = walls.find((w) => w.id === selected.wallId);
    if (!wall) return null;
    const ad = innerDirs(wall.direction);
    const cx = wall.x + (wall.direction === 'horizontal' ? wall.length / 2 : 0);
    const cz = -(wall.y + (wall.direction === 'vertical' ? wall.length / 2 : 0));
    const y = wallHeight + 0.35;
    return (
      <group>
        <Arrow3D direction={ad.pos} position={[cx, y, cz]} color="#22c55e" onClick={() => clickInner(wall.id, wall.direction, 'pos')} />
        <Arrow3D direction={ad.neg} position={[cx, y, cz]} color="#ef4444" onClick={() => clickInner(wall.id, wall.direction, 'neg')} />
      </group>
    );
  }

  return null;
});

/* ── WallMesh ───────────────────────────────────────── */

interface WMProps {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  color: string;
  onClick: () => void;
}

const WallMesh = memo(function WallMesh({ position, rotation, size, color, onClick }: WMProps) {
  return (
    <mesh position={position} rotation={rotation} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});

/* ── RoomGroup ──────────────────────────────────────── */

interface RGProps {
  room: Room;
  wallHeight: number;
  wallThickness: number;
  activeSide: WallSide | null;
  onSelect: (side: WallSide) => void;
}

const RoomGroup = memo(function RoomGroup({ room, wallHeight: wh, wallThickness: wt, activeSide, onSelect }: RGProps) {
  const n = wallPos(room, 'north', wh, wt);
  const s = wallPos(room, 'south', wh, wt);
  const e = wallPos(room, 'east', wh, wt);
  const w = wallPos(room, 'west', wh, wt);
  const sel = (side: WallSide) => side === activeSide ? '#facc15' : '#e0d8cc';

  return (
    <group>
      <mesh position={[room.x + room.width / 2, 0.01, -(room.y + room.height / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.width, room.height]} />
        <meshStandardMaterial color={room.color} side={THREE.DoubleSide} />
      </mesh>
      <Text position={[room.x + room.width / 2, 0.1, -(room.y + room.height / 2)]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28} color="#444" anchorX="center" anchorY="middle">{room.name}</Text>
      <WallMesh position={[n.x, n.y, n.z]} rotation={[0, 0, 0]} size={[n.len, wh, wt]} color={sel('north')} onClick={() => onSelect('north')} />
      <WallMesh position={[s.x, s.y, s.z]} rotation={[0, 0, 0]} size={[s.len, wh, wt]} color={sel('south')} onClick={() => onSelect('south')} />
      <WallMesh position={[e.x, e.y, e.z]} rotation={[0, Math.PI / 2, 0]} size={[wt, wh, e.len]} color={sel('east')} onClick={() => onSelect('east')} />
      <WallMesh position={[w.x, w.y, w.z]} rotation={[0, Math.PI / 2, 0]} size={[wt, wh, w.len]} color={sel('west')} onClick={() => onSelect('west')} />
    </group>
  );
});

/* ── InnerWallView ──────────────────────────────────── */

interface IWProps {
  wall: InnerWall;
  wallHeight: number;
  wallThickness: number;
  isSelected: boolean;
  onClick: () => void;
}

const InnerWallView = memo(function InnerWallView({ wall, wallHeight: wh, wallThickness: wt, isSelected, onClick }: IWProps) {
  const pos: [number, number, number] = wall.direction === 'horizontal'
    ? [wall.x + wall.length / 2, wh / 2, -wall.y]
    : [wall.x, wh / 2, -(wall.y + wall.length / 2)];
  const size: [number, number, number] = wall.direction === 'horizontal'
    ? [wall.length, wh, wt]
    : [wt, wh, wall.length];
  return <WallMesh position={pos} rotation={[0, 0, 0]} size={size} color={isSelected ? '#facc15' : '#d0c4b4'} onClick={onClick} />;
});

/* ── SceneContent (single store subscriber) ─────────── */

function SceneContent() {
  const rooms       = useApartmentStore((s) => s.rooms);
  const walls       = useApartmentStore((s) => s.walls);
  const selected    = useApartmentStore((s) => s.selected);
  const wallHeight  = useApartmentStore((s) => s.wallHeight);
  const wallThickness = useApartmentStore((s) => s.wallThickness);
  const selectItem  = useApartmentStore((s) => s.selectItem);
  const moveOuterWall = useApartmentStore((s) => s.moveOuterWall);
  const moveInnerWall = useApartmentStore((s) => s.moveInnerWall);

  const selOuter = useCallback((rid: string, side: WallSide) => selectItem({ type: 'outerWall', roomId: rid, wallSide: side }), [selectItem]);
  const selInner = useCallback((wid: string) => selectItem({ type: 'innerWall', wallId: wid }), [selectItem]);
  const deselect = useCallback(() => selectItem(null), [selectItem]);

  const stableMoveOuter = useCallback((rid: string, side: WallSide, dx: number, dy: number) => moveOuterWall(rid, side, dx, dy), [moveOuterWall]);
  const stableMoveInner = useCallback((wid: string, dx: number, dy: number) => moveInnerWall(wid, dx, dy), [moveInnerWall]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <Grid position={[5, 0, -3.5]} cellSize={1} cellColor="#ccc" sectionSize={5} sectionColor="#999" fadeDistance={30} infiniteGrid />
      <mesh position={[5, -0.01, -3.5]} rotation={[-Math.PI / 2, 0, 0]} visible={false} onClick={deselect}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial />
      </mesh>

      {rooms.map((room) => (
        <RoomGroup
          key={room.id}
          room={room}
          wallHeight={wallHeight}
          wallThickness={wallThickness}
          activeSide={selected?.type === 'outerWall' && selected.roomId === room.id ? (selected.wallSide ?? null) : null}
          onSelect={(side) => selOuter(room.id, side)}
        />
      ))}

      {walls.map((wall) => (
        <InnerWallView
          key={wall.id}
          wall={wall}
          wallHeight={wallHeight}
          wallThickness={wallThickness}
          isSelected={selected?.type === 'innerWall' && selected.wallId === wall.id}
          onClick={() => selInner(wall.id)}
        />
      ))}

      {selected && (
        <MoveGizmo
          selected={selected}
          rooms={rooms}
          walls={walls}
          wallHeight={wallHeight}
          onMoveOuter={stableMoveOuter}
          onMoveInner={stableMoveInner}
        />
      )}

      <OrbitControls makeDefault minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.1} target={[5, 0, -3.5]} />
    </>
  );
}

/* ── ApartmentView3D (Canvas wrapper) ───────────────── */

export default function ApartmentView3D() {
  return (
    <div className="w-full h-full min-h-[500px]">
      <Canvas
        camera={{ position: [12, 12, 12], fov: 50 }}
        gl={{ antialias: true }}
        onPointerMissed={() => useApartmentStore.getState().selectItem(null)}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
