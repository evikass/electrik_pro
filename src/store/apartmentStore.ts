import { create } from 'zustand';

export type WallSide = 'north' | 'south' | 'east' | 'west';
export type InnerWallDirection = 'horizontal' | 'vertical';

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface InnerWall {
  id: string;
  x: number;
  y: number;
  direction: InnerWallDirection;
  length: number;
  roomId: string;
}

export interface SelectedItem {
  type: 'outerWall' | 'innerWall';
  roomId?: string;
  wallSide?: WallSide;
  wallId?: string;
}

interface ApartmentState {
  rooms: Room[];
  walls: InnerWall[];
  selected: SelectedItem | null;
  wallHeight: number;
  wallThickness: number;
  step: number;
  selectItem: (item: SelectedItem | null) => void;
  moveOuterWall: (roomId: string, wallSide: WallSide, dx: number, dy: number) => void;
  moveInnerWall: (wallId: string, dx: number, dy: number) => void;
}

export const useApartmentStore = create<ApartmentState>((set) => ({
  rooms: [
    { id: 'r1', name: 'Гостиная', x: 0, y: 0, width: 5, height: 4, color: '#8BB4D6' },
    { id: 'r2', name: 'Спальня', x: 5, y: 0, width: 4, height: 4, color: '#B8D8A0' },
    { id: 'r3', name: 'Кухня', x: 0, y: 4, width: 5, height: 3, color: '#F0C8A0' },
    { id: 'r4', name: 'Ванная', x: 5, y: 4, width: 4, height: 3, color: '#D0A0D0' },
  ],
  walls: [
    { id: 'w1', x: 0, y: 4, direction: 'horizontal' as const, length: 5, roomId: 'r1' },
    { id: 'w2', x: 5, y: 0, direction: 'vertical' as const, length: 4, roomId: 'r1' },
    { id: 'w3', x: 5, y: 4, direction: 'horizontal' as const, length: 4, roomId: 'r2' },
    { id: 'w4', x: 5, y: 4, direction: 'vertical' as const, length: 3, roomId: 'r3' },
  ],
  selected: null,
  wallHeight: 2.8,
  wallThickness: 0.12,
  step: 0.2,

  selectItem: (item) => set({ selected: item }),

  moveOuterWall: (roomId, wallSide, dx, dy) =>
    set((state) => {
      const s = state.step;
      const sdx = dx * s;
      const sdy = dy * s;
      return {
        rooms: state.rooms.map((r) => {
          if (r.id !== roomId) return r;
          const room = { ...r };
          switch (wallSide) {
            case 'north': room.height = Math.max(1, room.height + sdy); break;
            case 'south': room.y += sdy; room.height = Math.max(1, room.height - sdy); break;
            case 'east': room.width = Math.max(1, room.width + sdx); break;
            case 'west': room.x += sdx; room.width = Math.max(1, room.width - sdx); break;
          }
          return room;
        }),
      };
    }),

  moveInnerWall: (wallId, dx, dy) =>
    set((state) => {
      const s = state.step;
      const sdx = dx * s;
      const sdy = dy * s;
      return {
        walls: state.walls.map((w) => {
          if (w.id !== wallId) return w;
          const wall = { ...w };
          if (wall.direction === 'horizontal') wall.y += sdy;
          else wall.x += sdx;
          return wall;
        }),
      };
    }),
}));
