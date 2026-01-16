import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Edges, TransformControls } from '@react-three/drei';
import { BaseShape } from '../types';
import { useStore } from '../store';

interface ShapeRendererProps {
  shape: BaseShape;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ shape }) => {
  const { selectedIds, selectShape, updateShape, mode } = useStore();
  const isSelected = selectedIds.includes(shape.id);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { camera, raycaster } = useThree();

  // Drag State for Extrude
  const dragStart = useRef<{y: number, startDepth: number} | null>(null);

  // Geometry Generation
  const geometry = useMemo(() => {
    if (shape.type === 'custom' && shape.geometryData) {
        const loader = new THREE.BufferGeometryLoader();
        return loader.parse(shape.geometryData);
    }

    const s = new THREE.Shape();
    
    if (shape.type === 'rectangle' && shape.width && shape.height) {
      const w = shape.width;
      const h = shape.height;
      s.moveTo(-w / 2, -h / 2);
      s.lineTo(w / 2, -h / 2);
      s.lineTo(w / 2, h / 2);
      s.lineTo(-w / 2, h / 2);
      s.lineTo(-w / 2, -h / 2);
    } else if (shape.type === 'circle' && shape.radius) {
      s.absarc(0, 0, shape.radius, 0, Math.PI * 2, false);
    } else if (shape.type === 'polygon' && shape.points && shape.points.length > 0) {
      s.moveTo(shape.points[0][0], shape.points[0][1]);
      for (let i = 1; i < shape.points.length; i++) {
        s.lineTo(shape.points[i][0], shape.points[i][1]);
      }
      s.lineTo(shape.points[0][0], shape.points[0][1]);
    }
    
    // Always use ExtrudeGeometry, even if depth is 0 (it creates a flat face with depth 0)
    return new THREE.ExtrudeGeometry(s, {
        depth: shape.extrusionDepth,
        bevelEnabled: false,
    });
  }, [shape]);

  // Handle transformations
  const handleTransformChange = () => {
    if (meshRef.current) {
      const { position, rotation } = meshRef.current;
      updateShape(shape.id, {
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
      });
    }
  };

  // Extrude Logic
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    
    if (mode === 'extrude') {
        // Start dragging
        // We project the point onto the screen Y or Camera Plane to determine pull magnitude
        dragStart.current = { 
            y: e.clientY, 
            startDepth: shape.extrusionDepth 
        };
        
        // Capture pointer
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (mode === 'select' || mode === 'edit_vertex') {
        selectShape(shape.id, e.shiftKey);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
      if (mode === 'extrude' && dragStart.current) {
          e.stopPropagation();
          const deltaY = dragStart.current.y - e.clientY;
          // Scale factor can be adjusted. 0.05 feels okay for screen pixels to units
          const newDepth = Math.max(0, dragStart.current.startDepth + deltaY * 0.05);
          updateShape(shape.id, { extrusionDepth: newDepth });
      }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
      if (mode === 'extrude' && dragStart.current) {
          e.stopPropagation();
          dragStart.current = null;
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
  };

  // Custom shapes have baked rotation, others have explicit rotation prop
  // Note: Standard shapes are generated on XY plane by THREE.Shape.
  // We apply the rotation from the store directly.
  // The 'view' logic in Viewport calculates the correct starting rotation (e.g. -90 X for ground).
  
  return (
    <>
      <group position={shape.position} rotation={shape.rotation}>
        <mesh
          ref={meshRef}
          geometry={geometry}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial
            color={isSelected ? '#4f46e5' : shape.color}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
          <Edges 
            visible={isSelected || hovered || mode === 'extrude'} 
            scale={1.0} 
            threshold={15} 
            color={mode === 'extrude' && hovered ? "#fbbf24" : (isSelected ? "white" : "black")} 
          />
          
           {mode === 'edit_vertex' && isSelected && shape.type === 'polygon' && (
              <group> 
                {shape.points?.map((pt, i) => (
                  <mesh key={i} position={[pt[0], pt[1], 0]}> 
                    <boxGeometry args={[0.3, 0.3, 0.3]} />
                    <meshBasicMaterial color="#ff9900" />
                  </mesh>
                ))}
              </group>
           )}
        </mesh>
      </group>

      {isSelected && mode === 'select' && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"
          onMouseUp={handleTransformChange}
        />
      )}
    </>
  );
};

export default ShapeRenderer;
