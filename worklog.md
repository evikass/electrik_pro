---
Task ID: 1
Agent: Main Agent
Task: Fix WallMoveGizmo arrow directions and React #310 infinite re-render in 3D apartment planner

Work Log:
- Cloned project from https://github.com/evikass/electrik_pro to /home/z/electrik_pro
- Read ApartmentView3D.tsx (1404 lines) and useApartmentStore.ts
- Analyzed WallMoveGizmo component (lines 466-503)
- Identified Bug 1: Arrow rotations were wrong for both axes
  - axis='z': cylinders/cones not rotated at all (default Y-axis instead of Z)
  - axis='x': forward head rotation [0,0,π/2] points -X instead of +X (swapped with backward)
- Identified Bug 2: React #310 infinite re-render
  - WallMoveGizmo had no event handlers → R3F raycaster skipped gizmo meshes → click passed through to wall behind → triggered handlePointerDown → takeSnapshot + setDragState chain
  - useEffect without deps (line 1352) called _notifyAxisLockSubscribers() after every render, potentially creating render loops

Stage Summary:
- Fixed arrow rotations: axis='x' uses [0,0,-π/2] for forward (+X) and [0,0,π/2] for backward (-X); axis='z' uses [π/2,0,0] for forward (+Z) and [-π/2,0,0] for backward (-Z)
- Added onClick/onPointerDown/onPointerUp/onPointerOver/onPointerOut with stopPropagation to gizmo group to prevent click-through
- Removed dep-less useEffect that reset axis lock; moved that logic to WallMesh's onPointerUp handler
- Fixed next.config.ts: removed invalid turbopack.root pointing to wrong directory
- Build succeeded (next build with output: export)
- Committed changes but could not push (no GitHub auth available on server)
