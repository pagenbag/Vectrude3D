import React, { useState } from 'react';
import { useStore } from '../store';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { generateShapesFromPrompt } from '../services/geminiService';

const PropertyPanel: React.FC = () => {
  const { shapes, selectedIds, updateShape, addShape } = useStore();
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedShape = shapes.find(s => s.id === selectedIds[0]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    const newShapes = await generateShapesFromPrompt(aiPrompt);
    newShapes.forEach(s => addShape(s));
    setIsGenerating(false);
    setAiPrompt('');
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-72 bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 shadow-xl flex flex-col z-10 overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-900/50">
        <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {selectedShape ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={selectedShape.name}
                  onChange={(e) => updateShape(selectedShape.id, { name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Extrusion Depth</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.1"
                    value={selectedShape.extrusionDepth}
                    onChange={(e) => updateShape(selectedShape.id, { extrusionDepth: parseFloat(e.target.value) })}
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 w-8 text-right">{selectedShape.extrusionDepth.toFixed(1)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Color</label>
                <div className="flex items-center gap-2">
                   <input
                    type="color"
                    value={selectedShape.color}
                    onChange={(e) => updateShape(selectedShape.id, { color: e.target.value })}
                    className="h-8 w-8 rounded bg-transparent cursor-pointer border-0"
                  />
                  <span className="text-xs text-gray-400 font-mono">{selectedShape.color}</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <p className="text-xs font-medium text-gray-400">Position</p>
                <div className="grid grid-cols-3 gap-2">
                   {['x', 'y', 'z'].map((axis, i) => (
                     <div key={axis}>
                        <label className="text-[10px] text-gray-500 uppercase block mb-0.5">{axis}</label>
                        <input
                          type="number"
                          step="0.5"
                          value={selectedShape.position[i]}
                          onChange={(e) => {
                             const newPos = [...selectedShape.position] as [number, number, number];
                             newPos[i] = parseFloat(e.target.value);
                             updateShape(selectedShape.id, { position: newPos });
                          }}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-1 text-xs text-gray-200"
                        />
                     </div>
                   ))}
                </div>
              </div>
              
              {selectedShape.type === 'rectangle' && (
                  <div className="space-y-2 pt-2 border-t border-gray-800">
                    <p className="text-xs font-medium text-gray-400">Dimensions</p>
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                          <label className="text-[10px] text-gray-500 uppercase">Width</label>
                          <input
                             type="number"
                             value={selectedShape.width}
                             onChange={(e) => updateShape(selectedShape.id, { width: parseFloat(e.target.value) })}
                             className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-1 text-xs text-gray-200"
                           />
                       </div>
                       <div>
                          <label className="text-[10px] text-gray-500 uppercase">Height</label>
                          <input
                             type="number"
                             value={selectedShape.height}
                             onChange={(e) => updateShape(selectedShape.id, { height: parseFloat(e.target.value) })}
                             className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-1 text-xs text-gray-200"
                           />
                       </div>
                    </div>
                  </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 py-10">
            <p className="text-sm">No shape selected.</p>
            <p className="text-xs mt-2">Select a shape to edit properties.</p>
          </div>
        )}
      </div>

      {/* AI Assistant */}
      <div className="p-4 bg-gray-800/50 border-t border-gray-700">
        <div className="flex items-center gap-2 mb-2">
           <Sparkles size={14} className="text-purple-400" />
           <span className="text-xs font-bold text-gray-300">AI Assistant</span>
        </div>
        <form onSubmit={handleGenerate} className="relative">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. 'A red hexagon table'"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-sm text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none placeholder-gray-600"
          />
          <button
            type="submit"
            disabled={isGenerating || !aiPrompt}
            className="absolute right-1 top-1 p-1.5 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
          >
             {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PropertyPanel;
