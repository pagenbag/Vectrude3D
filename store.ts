import { create } from 'zustand';
import { AppState, BaseShape } from './types';
import { v4 as uuidv4 } from 'uuid';
import { performCSG } from './services/csgService';

export const useStore = create<AppState>((set, get) => ({
  shapes: [],
  selectedIds: [],
  mode: 'select',
  drawingPoints: [],
  isDragging: false,

  addShape: (shape) => set((state) => ({ shapes: [...state.shapes, shape] })),

  updateShape: (id, updates) =>
    set((state) => ({
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  removeShape: (id) =>
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),

  selectShape: (id, multi) =>
    set((state) => {
      if (multi) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        };
      }
      return { selectedIds: [id] };
    }),

  setMode: (mode) => set({ mode, drawingPoints: [] }),

  addDrawingPoint: (point) =>
    set((state) => ({ drawingPoints: [...state.drawingPoints, point] })),

  clearDrawingPoints: () => set({ drawingPoints: [] }),

  performBoolean: (type) => {
     const state = get();
     const selectedShapes = state.shapes.filter(s => state.selectedIds.includes(s.id));
     
     // Need at least 2 shapes and maintain order (selection order would be ideal, but currently filter by list order)
     // To respect selection order, we map selectedIds to shapes
     const orderedSelection = state.selectedIds
        .map(id => state.shapes.find(s => s.id === id))
        .filter((s): s is BaseShape => !!s);

     if (orderedSelection.length < 2) return;

     const resultShape = performCSG(orderedSelection, type);
     
     if (resultShape) {
         set(state => ({
             shapes: [
                 ...state.shapes.filter(s => !state.selectedIds.includes(s.id)),
                 resultShape
             ],
             selectedIds: [resultShape.id]
         }));
     }
  }
}));
