import * as THREE from 'three';
import { SUBTRACTION, ADDITION, INTERSECTION, Brush, Evaluator } from 'three-bvh-csg';
import { BaseShape } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function performCSG(shapes: BaseShape[], operation: 'union' | 'subtract' | 'intersect'): BaseShape | null {
  if (shapes.length < 2) return null;

  const evaluator = new Evaluator();
  
  // Convert BaseShapes to Brushes
  const brushes = shapes.map(shape => {
    let geometry: THREE.BufferGeometry;
    
    if (shape.type === 'custom' && shape.geometryData) {
       const loader = new THREE.BufferGeometryLoader();
       geometry = loader.parse(shape.geometryData);
    } else {
        // Recreate 2D shape -> Extrude
        const s = new THREE.Shape();
        if (shape.type === 'rectangle' && shape.width && shape.height) {
            const w = shape.width;
            const h = shape.height;
            s.moveTo(-w/2, -h/2);
            s.lineTo(w/2, -h/2);
            s.lineTo(w/2, h/2);
            s.lineTo(-w/2, h/2);
            s.lineTo(-w/2, -h/2);
        } else if (shape.type === 'circle' && shape.radius) {
            s.absarc(0, 0, shape.radius, 0, Math.PI * 2, false);
        } else if (shape.type === 'polygon' && shape.points) {
             s.moveTo(shape.points[0][0], shape.points[0][1]);
             for(let i=1; i<shape.points.length; i++) s.lineTo(shape.points[i][0], shape.points[i][1]);
             s.lineTo(shape.points[0][0], shape.points[0][1]);
        }
        
        geometry = new THREE.ExtrudeGeometry(s, {
            depth: shape.extrusionDepth,
            bevelEnabled: false
        });
    }
    
    const brush = new Brush(geometry);
    
    // Apply transforms
    // Note: The ShapeRenderer rotates standard shapes by Math.PI/2 on X to align XY plane to XZ.
    // We must mimic this to ensure CSG happens in the visual orientation.
    // If it's a custom shape, we assume its geometry is already correctly oriented (Y-up in world space),
    // but the ShapeRenderer MIGHT rotate it if we aren't careful. 
    // In our ShapeRenderer logic (planned), custom shapes won't get the extra rotation.
    // So for standard shapes, apply PI/2 X. For custom, do not (assuming geometry is already baked).
    
    // HOWEVER, the `shape.position` and `shape.rotation` are "user transforms".
    // 1. Inherent geometry orientation
    const inherentRot = new THREE.Matrix4();
    if (shape.type !== 'custom') {
       inherentRot.makeRotationX(Math.PI / 2);
    }
    
    // 2. User Transform
    const userMatrix = new THREE.Matrix4();
    const euler = new THREE.Euler(shape.rotation[0], shape.rotation[1], shape.rotation[2]);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    userMatrix.compose(
        new THREE.Vector3(shape.position[0], shape.position[1], shape.position[2]),
        quaternion,
        new THREE.Vector3(1, 1, 1)
    );
    
    brush.matrix.multiplyMatrices(userMatrix, inherentRot);
    brush.matrixAutoUpdate = false; 
    
    brush.material = new THREE.MeshStandardMaterial({ color: shape.color });
    return brush;
  });

  let resultBrush = brushes[0];
  
  for (let i = 1; i < brushes.length; i++) {
      const brushB = brushes[i];
      
      let mode;
      if (operation === 'union') mode = ADDITION;
      else if (operation === 'subtract') mode = SUBTRACTION;
      else if (operation === 'intersect') mode = INTERSECTION;
      
      // resultBrush is overwritten with a NEW brush containing the result geometry
      resultBrush = evaluator.evaluate(resultBrush, brushB, mode);
  }

  // Center the result geometry
  const resultGeometry = resultBrush.geometry;
  resultGeometry.computeBoundingBox();
  const center = new THREE.Vector3();
  if (resultGeometry.boundingBox) {
      resultGeometry.boundingBox.getCenter(center);
  }
  
  resultGeometry.translate(-center.x, -center.y, -center.z);
  
  return {
      id: uuidv4(),
      name: `CSG ${operation}`,
      type: 'custom',
      position: [center.x, center.y, center.z],
      rotation: [0, 0, 0], 
      color: shapes[0].color,
      extrusionDepth: 0, 
      visible: true,
      geometryData: resultGeometry.toJSON()
  };
}
