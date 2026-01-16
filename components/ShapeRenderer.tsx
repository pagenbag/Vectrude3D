import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Edges, TransformControls, Html } from '@react-three/drei';
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
      // Auto close
      s.lineTo(shape.points[0][0], shape.points[0][1]);
    }
    
    if (shape.extrusionDepth > 0) {
      return new THREE.ExtrudeGeometry(s, {
        depth: shape.extrusionDepth,
        bevelEnabled: false,
      });
    } else {
      return new THREE.ShapeGeometry(s);
    }
  }, [shape]);

  // Helper to update position after transform
  const handleTransformChange = () => {
    if (meshRef.current) {
      const { position, rotation } = meshRef.current;
      updateShape(shape.id, {
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
      });
    }
  };
  
  // Custom shapes are already oriented in world space (Y-up), so we don't need the default rotation.
  // Standard shapes are drawn on XY and need to be rotated to lie on XZ.
  const visualRotation = shape.type === 'custom' ? [0, 0, 0] : [Math.PI / 2, 0, 0];

  return (
    <>
      <group position={shape.position} rotation={shape.rotation}>
        <mesh
          ref={meshRef}
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation();
            if (mode === 'select' || mode === 'edit_vertex') {
               selectShape(shape.id, e.shiftKey);
            }
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          rotation={visualRotation as [number, number, number]} 
        >
          <meshStandardMaterial
            color={isSelected ? '#4f46e5' : shape.color}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
          <Edges visible={isSelected || hovered} scale={1.0} threshold={15} color={isSelected ? "white" : "black"} />
          
          {/* Render Vertices for Polygons */}
           {mode === 'edit_vertex' && isSelected && shape.type === 'polygon' && (
              <group rotation={[-Math.PI/2, 0, 0]}> 
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

      {/* Transform Controls */}
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
