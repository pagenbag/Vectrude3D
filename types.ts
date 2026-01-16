import * as THREE from 'three';

export type ShapeType = 'rectangle' | 'circle' | 'polygon' | 'custom';
export type ViewType = 'perspective' | 'top' | 'front' | 'left';
export type AppMode = 'select' | 'draw_rect' | 'draw_circle' | 'draw_poly' | 'edit_vertex' | 'extrude';

export interface BaseShape {
  id: string;
  name: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  extrusionDepth: number;
  visible: boolean;
  points?: [number, number][]; // For polygon
  width?: number; // For rectangle
  height?: number; // For rectangle
  radius?: number; // For circle
  geometryData?: any; // For custom CSG shapes (JSON)
}

export interface AppState {
  shapes: BaseShape[];
  selectedIds: string[];
  mode: AppMode;
  view: ViewType;
  drawingPoints: [number, number][]; // Temp points for drawing polygon
  isDragging: boolean;
  addShape: (shape: BaseShape) => void;
  updateShape: (id: string, updates: Partial<BaseShape>) => void;
  removeShape: (id: string) => void;
  selectShape: (id: string, multi: boolean) => void;
  setMode: (mode: AppState['mode']) => void;
  setView: (view: ViewType) => void;
  addDrawingPoint: (point: [number, number]) => void;
  clearDrawingPoints: () => void;
  performBoolean: (type: 'union' | 'subtract' | 'intersect') => void;
}
