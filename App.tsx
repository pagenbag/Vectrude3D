import React from 'react';
import Viewport from './components/Viewport';
import Toolbar from './components/Toolbar';
import PropertyPanel from './components/PropertyPanel';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-gray-950 text-white font-sans select-none">
      {/* Top Bar / Menu could go here */}
      
      <div className="flex-1 relative flex">
        <Toolbar />
        <div className="flex-1 relative z-0">
          <Viewport />
        </div>
        <PropertyPanel />
      </div>
    </div>
  );
};

export default App;
