import React from 'react';
import { MousePointer2, Square, Circle, Hexagon, Trash2, Edit3, Combine, Scissors, ArrowUpFromLine } from 'lucide-react';
import { useStore } from '../store';
import { AppMode } from '../types';

const Toolbar: React.FC = () => {
  const { mode, setMode, selectedIds, removeShape, performBoolean } = useStore();

  const tools: { id: AppMode; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select (Right-click)' },
    { id: 'extrude', icon: ArrowUpFromLine, label: 'Extrude' },
    { id: 'draw_rect', icon: Square, label: 'Rectangle' },
    { id: 'draw_circle', icon: Circle, label: 'Circle' },
    { id: 'draw_poly', icon: Hexagon, label: 'Polygon' },
    { id: 'edit_vertex', icon: Edit3, label: 'Vertices' },
  ];

  const handleDelete = () => {
    selectedIds.forEach(id => removeShape(id));
  };

  return (
    <div className="absolute left-4 top-4 bg-gray-900/90 backdrop-blur-md p-2 rounded-xl border border-gray-700 shadow-xl flex flex-col gap-2 z-10">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setMode(tool.id)}
          className={`p-3 rounded-lg transition-all duration-200 group relative ${
            mode === tool.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          title={tool.label}
        >
          <tool.icon size={20} />
          <span className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-700 z-50">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="h-px bg-gray-700 my-1" />

      <button
        onClick={() => performBoolean('union')}
        disabled={selectedIds.length < 2}
        className="p-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        title="Union"
      >
        <Combine size={20} />
      </button>
      
      <button
        onClick={() => performBoolean('subtract')}
        disabled={selectedIds.length < 2}
        className="p-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        title="Subtract"
      >
        <Scissors size={20} />
      </button>

      <div className="h-px bg-gray-700 my-1" />

      <button
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
        className="p-3 rounded-lg text-red-400 hover:bg-red-900/30 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Delete"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};

export default Toolbar;
