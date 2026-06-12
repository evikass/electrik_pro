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

// Discriminated union: outerWall ALWAYS has roomId + wallSide, innerWall ALWAYS has wallId
export type SelectedItem =
  | { type: 'outerWall'; roomId: string; wallSide: WallSide }
  | { type: 'innerWall'; wallId: string };

/** Minimum room dimension (metres) */
const MIN_ROOM_SIZE = 1;

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

      const updatedRooms = state.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const room = { ...r };

        switch (wallSide) {
          case 'north': {
            const newHeight = room.height + sdy;
            if (newHeight < MIN_ROOM_SIZE) return room;
            room.height = newHeight;
            break;
          }
          case 'south': {
            const newHeight = room.height - sdy;
            if (newHeight < MIN_ROOM_SIZE) return room;
            room.y += sdy;
            room.height = newHeight;
            break;
          }
          case 'east': {
            const newWidth = room.width + sdx;
            if (newWidth < MIN_ROOM_SIZE) return room;
            room.width = newWidth;
            break;
          }
          case 'west': {
            const newWidth = room.width - sdx;
            if (newWidth < MIN_ROOM_SIZE) return room;
            room.x += sdx;
            room.width = newWidth;
            break;
          }
        }
        return room;
      });

      return { rooms: updatedRooms };
    }),

  moveInnerWall: (wallId, dx, dy) =>
    set((state) => {
      const s = state.step;
      const sdx = dx * s;
      const sdy = dy * s;

      const wall = state.walls.find((w) => w.id === wallId);
      if (!wall) return state;

      // Update wall position
      const updatedWalls = state.walls.map((w) => {
        if (w.id !== wallId) return w;
        const updated = { ...w };
        if (updated.direction === 'horizontal') updated.y += sdy;
        else updated.x += sdx;
        return updated;
      });

      const movedWall = updatedWalls.find((w) => w.id === wallId)!;

      // Update adjacent rooms to follow the inner wall movement
      const updatedRooms = state.rooms.map((room) => {
        const r = { ...room };

        if (movedWall.direction === 'horizontal') {
          // Horizontal inner wall: separates rooms above from rooms below
          // Room whose south wall aligns with this inner wall
          if (Math.abs(r.y + r.height - wall.y) < 0.01) {
            // Room is above — adjust height to follow wall
            r.height = movedWall.y - r.y;
            if (r.height < MIN_ROOM_SIZE) r.height = MIN_ROOM_SIZE;
          } else if (Math.abs(r.y - wall.y) < 0.01) {
            // Room is below — adjust y and height
            const bottom = r.y + r.height;
            r.y = movedWall.y;
            r.height = bottom - movedWall.y;
            if (r.height < MIN_ROOM_SIZE) {
              r.height = MIN_ROOM_SIZE;
              r.y = bottom - MIN_ROOM_SIZE;
            }
          }
        } else {
          // Vertical inner wall: separates rooms on left from rooms on right
          if (Math.abs(r.x + r.width - wall.x) < 0.01) {
            // Room is on the left — adjust width
            r.width = movedWall.x - r.x;
            if (r.width < MIN_ROOM_SIZE) r.width = MIN_ROOM_SIZE;
          } else if (Math.abs(r.x - wall.x) < 0.01) {
            // Room is on the right — adjust x and width
            const right = r.x + r.width;
            r.x = movedWall.x;
            r.width = right - movedWall.x;
            if (r.width < MIN_ROOM_SIZE) {
              r.width = MIN_ROOM_SIZE;
              r.x = right - MIN_ROOM_SIZE;
            }
          }
        }

        return r;
      });

      return { walls: updatedWalls, rooms: updatedRooms };
    }),
}));
