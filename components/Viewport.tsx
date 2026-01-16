import React, { useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import ShapeRenderer from './ShapeRenderer';
import { v4 as uuidv4 } from 'uuid';

const DrawingPlane = () => {
  const { mode, addShape, addDrawingPoint, drawingPoints, clearDrawingPoints } = useStore();
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    const point = e.point; // Vector3
    const x = Math.round(point.x * 2) / 2; // Snap to 0.5 grid
    const z = Math.round(point.z * 2) / 2;

    if (mode === 'draw_rect') {
      if (!startPoint) {
        setStartPoint([x, z]);
      } else {
        // Finish Rect
        const width = Math.abs(x - startPoint[0]);
        const height = Math.abs(z - startPoint[1]);
        const centerX = (x + startPoint[0]) / 2;
        const centerZ = (z + startPoint[1]) / 2;
        
        if (width > 0 && height > 0) {
            addShape({
              id: uuidv4(),
              name: 'Rectangle',
              type: 'rectangle',
              position: [centerX, 0, centerZ],
              rotation: [0, 0, 0],
              color: '#cccccc',
              extrusionDepth: 1, // Default extrude
              visible: true,
              width,
              height
            });
        }
        setStartPoint(null);
      }
    } else if (mode === 'draw_circle') {
        if (!startPoint) {
            setStartPoint([x, z]);
        } else {
            const radius = Math.sqrt(Math.pow(x - startPoint[0], 2) + Math.pow(z - startPoint[1], 2));
             addShape({
              id: uuidv4(),
              name: 'Circle',
              type: 'circle',
              position: [startPoint[0], 0, startPoint[1]],
              rotation: [0, 0, 0],
              color: '#cccccc',
              extrusionDepth: 1,
              visible: true,
              radius: Math.max(0.5, radius)
            });
            setStartPoint(null);
        }
    } else if (mode === 'draw_poly') {
      addDrawingPoint([x, z]);
    }
  };

  // Double click to finish polygon
  const handleDoubleClick = (e: any) => {
      if (mode === 'draw_poly' && drawingPoints.length >= 3) {
          e.stopPropagation();
          // Calculate centroid to center position
          let cx = 0, cz = 0;
          drawingPoints.forEach(p => { cx += p[0]; cz += p[1]; });
          cx /= drawingPoints.length;
          cz /= drawingPoints.length;

          // Offset points relative to center
          const relativePoints: [number, number][] = drawingPoints.map(p => [p[0] - cx, p[1] - cz]);

          addShape({
              id: uuidv4(),
              name: 'Polygon',
              type: 'polygon',
              position: [cx, 0, cz],
              rotation: [0, 0, 0],
              color: '#cccccc',
              extrusionDepth: 1,
              visible: true,
              points: relativePoints
          });
          clearDrawingPoints();
      }
  };

  return (
    <>
      <gridHelper args={[50, 50, 0x444444, 0x222222]} position={[0, -0.01, 0]} />
      <mesh 
        visible={false} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>
      
      {/* Visualizer for drawing in progress */}
      {(mode === 'draw_rect' || mode === 'draw_circle') && startPoint && (
          <mesh position={[startPoint[0], 0, startPoint[1]]}>
              <sphereGeometry args={[0.2]} />
              <meshBasicMaterial color="red" />
          </mesh>
      )}

      {mode === 'draw_poly' && drawingPoints.length > 0 && (
          <group>
             {drawingPoints.map((p, i) => (
                 <mesh key={i} position={[p[0], 0, p[1]]}>
                     <sphereGeometry args={[0.1]} />
                     <meshBasicMaterial color="green" />
                 </mesh>
             ))}
             {/* Draw lines between points */}
             <Line points={drawingPoints.map(p => [p[0], 0.05, p[1]] as [number, number, number])} />
          </group>
      )}
    </>
  );
};

// Simple Line helper
const Line = ({ points }: { points: [number, number, number][] }) => {
    const geometry = React.useMemo(() => {
        const geo = new THREE.BufferGeometry();
        if(points.length > 1) {
             const vertices = new Float32Array(points.flat());
             geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        }
        return geo;
    }, [points]);
    
    if (points.length < 2) return null;

    return (
        <line geometry={geometry}>
            <lineBasicMaterial color="green" linewidth={2} />
        </line>
    );
};

const Viewport: React.FC = () => {
  const { shapes, mode, setMode } = useStore();

  return (
    <div className="w-full h-full bg-gray-950 relative overflow-hidden">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
        <OrbitControls makeDefault enabled={mode === 'select' || mode === 'edit_vertex'} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} />

        <DrawingPlane />

        {shapes.map(shape => (
          <ShapeRenderer key={shape.id} shape={shape} />
        ))}

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
        </GizmoHelper>
      </Canvas>
      
      {/* On Screen Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/80 px-4 py-2 rounded-full text-xs text-gray-300 pointer-events-none backdrop-blur-sm border border-gray-700">
         {mode === 'select' && "Select objects to move or edit"}
         {mode === 'draw_rect' && "Click start point, then click end point"}
         {mode === 'draw_circle' && "Click center, then click outer radius"}
         {mode === 'draw_poly' && "Click points. Double click to finish."}
         {mode === 'edit_vertex' && "Select a shape to view vertices"}
      </div>
    </div>
  );
};

export default Viewport;
