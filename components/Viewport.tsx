import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import ShapeRenderer from './ShapeRenderer';
import { v4 as uuidv4 } from 'uuid';
import { ViewType } from '../types';

// Controls the camera type and position based on view state
const CameraController = () => {
  const { view } = useStore();
  const perspectiveRef = useRef<THREE.PerspectiveCamera>(null);
  const orthoRef = useRef<THREE.OrthographicCamera>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    // Reset controls when view changes to avoid getting stuck
    if (controlsRef.current) {
        controlsRef.current.reset();
    }
  }, [view]);

  // Constants for camera positioning
  const DISTANCE = 50;

  return (
    <>
      <PerspectiveCamera
        ref={perspectiveRef}
        makeDefault={view === 'perspective'}
        position={[15, 15, 15]}
        fov={50}
      />
      <OrthographicCamera
        ref={orthoRef}
        makeDefault={view !== 'perspective'}
        position={[
            view === 'front' ? 0 : view === 'left' ? -DISTANCE : 0, 
            view === 'top' ? DISTANCE : 0, 
            view === 'front' ? DISTANCE : view === 'left' ? 0 : 0
        ]}
        zoom={20}
        near={0.1}
        far={1000}
        onUpdate={c => c.lookAt(0, 0, 0)}
      />
      
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={true}
        enableRotate={view === 'perspective'}
        enableZoom={true}
        enablePan={true}
      />
    </>
  );
};

// Handles drawing logic with "Click and Drag"
const DrawingPlane = () => {
  const { mode, addShape, addDrawingPoint, drawingPoints, clearDrawingPoints, view, setMode } = useStore();
  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null);
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Determine drawing plane orientation and rotation based on View
  // Top/Perspective: XZ plane (y=0)
  // Front: XY plane (z=0)
  // Left: YZ plane (x=0)
  const planeRotation = React.useMemo(() => {
    if (view === 'front') return [0, 0, 0] as [number, number, number];
    if (view === 'left') return [0, -Math.PI / 2, 0] as [number, number, number];
    return [-Math.PI / 2, 0, 0] as [number, number, number]; // Top or Perspective defaults to ground
  }, [view]);
  
  // Helper to snap points to grid
  const getSnappedPoint = (point: THREE.Vector3) => {
    const p = point.clone();
    p.x = Math.round(p.x * 2) / 2;
    p.y = Math.round(p.y * 2) / 2;
    p.z = Math.round(p.z * 2) / 2;
    
    // Flatten based on view to ensure we draw exactly on the zero-plane of that view
    if (view === 'front') p.z = 0;
    else if (view === 'left') p.x = 0;
    else p.y = 0; // Top/Perspective
    
    return p;
  };

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    
    const point = getSnappedPoint(e.point);

    if (mode === 'draw_poly') {
      // Polygon still uses click-click logic for now, but we align it to camera
      // For poly, we store raw X/Z (or relevant local coords) relative to the plane?
      // To simplify, let's keep polygon on Ground (XZ) only for now or map 3D point.
      // Let's store 3D center later. For now, just add point.
      // *Correction*: To support drawing on any plane, we need to handle 2D local coords.
      // Simpler approach: Draw in 3D, calculate geometry later.
      // But BaseShape expects 2D points. 
      // Let's stick to XZ plane drawing for Polygon for simplicity in this iteration, 
      // OR project based on view.
      // Let's map the 3D point to the relevant 2D plane coordinates.
      let u = 0, v = 0;
      if (view === 'front') { u = point.x; v = point.y; }
      else if (view === 'left') { u = point.z; v = point.y; } // Z is horizontal in Left view? Actually Z comes out. Y is up.
      else { u = point.x; v = point.z; } // Top/Persp

      addDrawingPoint([u, v]);
    } else if (mode === 'draw_rect' || mode === 'draw_circle') {
      setIsDrawing(true);
      setStartPoint(point);
      setCurrentPoint(point);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing || !startPoint) return;
    e.stopPropagation();
    const point = getSnappedPoint(e.point);
    setCurrentPoint(point);
  };

  const handlePointerUp = (e: any) => {
    if (!isDrawing || !startPoint || !currentPoint) return;
    e.stopPropagation();
    
    setIsDrawing(false);
    
    // Calculate 2D Dimensions based on view
    let width = 0, height = 0, radius = 0;
    let center = new THREE.Vector3().addVectors(startPoint, currentPoint).multiplyScalar(0.5);
    
    // Dimensions
    const dx = Math.abs(currentPoint.x - startPoint.x);
    const dy = Math.abs(currentPoint.y - startPoint.y);
    const dz = Math.abs(currentPoint.z - startPoint.z);

    // Orientation for Shape
    let rotation: [number, number, number] = [0, 0, 0];

    if (view === 'front') {
        width = dx; height = dy;
        rotation = [0, 0, 0];
        // Center is already correct (x, y, 0)
    } else if (view === 'left') {
        width = dz; height = dy; // In Left view (looking along +X), Z is "width", Y is "height"
        rotation = [0, -Math.PI / 2, 0];
        // Center (0, y, z)
    } else {
        // Top or Perspective -> Ground
        width = dx; height = dz;
        rotation = [0, 0, 0]; // ShapeRenderer rotates XZ shapes by default if we don't handle it.
        // Wait, ShapeRenderer applies -PI/2 X to "rectangle" type?
        // Let's standarize: ShapeRenderer treats "Rectangle/Circle" as XY plane shapes.
        // So for Ground, we rotate -PI/2 X.
        rotation = [-Math.PI / 2, 0, 0];
    }
    
    // Radius for circle
    radius = startPoint.distanceTo(currentPoint);

    if (mode === 'draw_rect' && width > 0 && height > 0) {
        addShape({
            id: uuidv4(),
            name: 'Rectangle',
            type: 'rectangle',
            position: [center.x, center.y, center.z],
            rotation: rotation,
            color: '#9ca3af',
            extrusionDepth: 0, // Default to 2D
            visible: true,
            width,
            height
        });
    } else if (mode === 'draw_circle' && radius > 0) {
        addShape({
            id: uuidv4(),
            name: 'Circle',
            type: 'circle',
            position: [startPoint.x, startPoint.y, startPoint.z], // Center start for circle
            rotation: rotation,
            color: '#9ca3af',
            extrusionDepth: 0,
            visible: true,
            radius
        });
    }

    setStartPoint(null);
    setCurrentPoint(null);
    // Reset to select mode after drawing? The prompt implies tools are sticky ("Right clicking so default back"). 
    // So we stay in draw mode.
  };

  const handleRightClick = (e: any) => {
     // Cancel drawing or polygon
     if (isDrawing) {
         setIsDrawing(false);
         setStartPoint(null);
         setCurrentPoint(null);
     } else if (drawingPoints.length > 0) {
         clearDrawingPoints();
     } else {
         setMode('select');
     }
  };
  
  // Double click for Polygon finish
  const handleDoubleClick = (e: any) => {
      if (mode === 'draw_poly' && drawingPoints.length >= 3) {
           e.stopPropagation();
           // Center logic for Polygon (assuming drawn on XZ for now)
           let cx = 0, cy = 0;
           drawingPoints.forEach(p => { cx += p[0]; cy += p[1]; });
           cx /= drawingPoints.length;
           cy /= drawingPoints.length;

           const relativePoints: [number, number][] = drawingPoints.map(p => [p[0] - cx, p[1] - cy]);
           
           // If we drew on Front/Left, we need to map position back. 
           // For simplicity, Polygon is strictly XZ ground for this demo unless we do complex mapping.
           // Prompt asked for drawing on aligned camera. 
           // Implementation choice: Polygon tool only active on Ground for stability, or basic implementation.
           // Let's stick to Ground mapping as per `handlePointerDown` implementation.
           let pos: [number, number, number] = [cx, 0, cy];
           let rot: [number, number, number] = [-Math.PI/2, 0, 0];
           
           if (view === 'front') {
               pos = [cx, cy, 0];
               rot = [0, 0, 0];
           } else if (view === 'left') {
               // u = z, v = y
               pos = [0, cy, cx]; 
               rot = [0, -Math.PI/2, 0];
           }

           addShape({
               id: uuidv4(),
               name: 'Polygon',
               type: 'polygon',
               position: pos,
               rotation: rot,
               color: '#9ca3af',
               extrusionDepth: 0,
               visible: true,
               points: relativePoints
           });
           clearDrawingPoints();
      }
  };

  // Preview Geometry
  const Preview = () => {
    if (!startPoint || !currentPoint) return null;
    
    // Logic similar to handlePointerUp to determine size/pos
    // Just a simple wireframe or line
    
    // Draw line from start to current
    const points = [startPoint, currentPoint];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Box/Circle preview could be better but Line is sufficient for interaction feedback
    return (
        <line geometry={geometry}>
            <lineBasicMaterial color="yellow" />
        </line>
    );
  };

  return (
    <>
      <gridHelper 
        args={[100, 100, 0x444444, 0x222222]} 
        rotation={planeRotation}
        position={[0, 0, 0]} 
      />
      
      {/* Invisible Plane to catch mouse events */}
      <mesh 
        visible={false} 
        rotation={planeRotation} 
        position={[0, 0, 0]} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => { e.nativeEvent.preventDefault(); handleRightClick(e); }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial />
      </mesh>

      <Preview />

      {/* Polygon Points Preview */}
      {mode === 'draw_poly' && drawingPoints.length > 0 && (
           <group>
               {drawingPoints.map((p, i) => {
                   // Map 2D point back to 3D for visualization
                   let x=0, y=0, z=0;
                   if (view === 'front') { x=p[0]; y=p[1]; }
                   else if (view === 'left') { z=p[0]; y=p[1]; }
                   else { x=p[0]; z=p[1]; }
                   return (
                       <mesh key={i} position={[x,y,z]}>
                           <sphereGeometry args={[0.1]} />
                           <meshBasicMaterial color="green" />
                       </mesh>
                   )
               })}
           </group>
      )}
    </>
  );
};

const ViewControls = () => {
    const { setView, view } = useStore();
    const views: ViewType[] = ['perspective', 'top', 'front', 'left'];

    return (
        <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 p-1 flex gap-1 z-10">
            {views.map(v => (
                <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        view === v 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                    {v}
                </button>
            ))}
        </div>
    );
}

const Viewport: React.FC = () => {
  const { shapes, mode, setMode, selectShape } = useStore();

  return (
    <div className="w-full h-full bg-gray-950 relative overflow-hidden">
      <ViewControls />
      
      <Canvas shadows onPointerMissed={(e) => {
          // Deselect only if not drawing/interacting
          if (e.type === 'click' && mode === 'select') {
              selectShape('', false);
          }
      }}>
        <CameraController />
        
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
         {mode === 'select' && "Select objects to move/edit. Right-click clear."}
         {mode === 'extrude' && "Drag a shape face to extrude it."}
         {mode === 'draw_rect' && "Click & Drag to draw Rectangle. Right-click cancel."}
         {mode === 'draw_circle' && "Click & Drag to draw Circle. Right-click cancel."}
         {mode === 'draw_poly' && "Click points. Double click to finish. Right-click cancel."}
         {mode === 'edit_vertex' && "Select a shape to view vertices"}
      </div>
    </div>
  );
};

export default Viewport;
