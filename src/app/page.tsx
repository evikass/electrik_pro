'use client';

import React, { Suspense, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useApartmentStore, type WallSide } from '@/store/apartmentStore';

const ApartmentView3D = dynamic(() => import('@/components/ApartmentView3D'), { ssr: false });

const SIDE_LABEL: Record<WallSide, string> = { north: 'Северная', south: 'Южная', east: 'Восточная', west: 'Западная' };

function Sidebar() {
  const rooms = useApartmentStore((s) => s.rooms);
  const walls = useApartmentStore((s) => s.walls);
  const selected = useApartmentStore((s) => s.selected);
  const selectItem = useApartmentStore((s) => s.selectItem);

  const pickOuter = useCallback((rid: string, side: WallSide) => {
    selectItem({ type: 'outerWall', roomId: rid, wallSide: side });
  }, [selectItem]);

  const pickInner = useCallback((wid: string) => {
    selectItem({ type: 'innerWall', wallId: wid });
  }, [selectItem]);

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h1 className="text-lg font-bold text-gray-800">3D Планировщик</h1>
        <p className="text-sm text-gray-500 mt-1">Кликните на стену для перемещения</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Комнаты</h2>
        {rooms.map((room) => (
          <div key={room.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: room.color }} />
              <span className="text-sm font-medium text-gray-700">{room.name}</span>
            </div>
            <div className="pl-6 space-y-0.5">
              {(['north', 'south', 'east', 'west'] as WallSide[]).map((side) => (
                <button key={side} className="block text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors" onClick={() => pickOuter(room.id, side)}>
                  {side === 'north' || side === 'south' ? '↕' : '↔'} {SIDE_LABEL[side]} стена
                </button>
              ))}
            </div>
          </div>
        ))}
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide pt-3">Внутренние стены</h2>
        {walls.map((wall) => (
          <button key={wall.id} className="block text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors" onClick={() => pickInner(wall.id)}>
            {wall.direction === 'horizontal' ? '↕' : '↔'} {wall.id} ({wall.direction === 'horizontal' ? 'гориз.' : 'верт.'})
          </button>
        ))}
      </div>
      {selected && (
        <div className="p-4 border-t border-gray-200 bg-yellow-50">
          <p className="text-sm font-semibold text-yellow-800">Выбрано:</p>
          {selected.type === 'outerWall' && (
            <p className="text-xs text-yellow-700 mt-1">{rooms.find((r) => r.id === selected.roomId)?.name} — {SIDE_LABEL[selected.wallSide]} стена</p>
          )}
          {selected.type === 'innerWall' && (
            <p className="text-xs text-yellow-700 mt-1">Внутренняя стена {selected.wallId}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">Используйте зелёную/красную стрелку для перемещения</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      <Sidebar />
      <div className="flex-1 relative">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Загрузка 3D…</div>}>
          <ApartmentView3D />
        </Suspense>
      </div>
    </div>
  );
}
