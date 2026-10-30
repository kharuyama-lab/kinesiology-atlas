import {Quaternion,Vector3} from 'three';
import {KNEE} from '../config/knee.js';
import {activeKneeAngles,screwHomeExternalRotationDeg,clamp} from './kinematics.js';
import {simmSpline} from './simm-spline.js';
import {KNEE_REFERENCE} from '../config/knee-reference.js';
const ap=simmSpline(KNEE_REFERENCE.ap.x,KNEE_REFERENCE.ap.y);
const superior=simmSpline(KNEE_REFERENCE.superior.x,KNEE_REFERENCE.superior.y);
// Parent-frame displacement of the tibial origin, relative to extension.
// OpenSim X anterior / Y superior / Z right -> atlas Z / Y / -X.
export function kneeTranslation(flexDeg,flexAxis=[1,0,0]){
 const axis=new Vector3(...flexAxis).normalize();
 const anterior=new Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
 const up=new Vector3().crossVectors(anterior,axis).normalize();
 const q=-flexDeg*Math.PI/180;
 return anterior.multiplyScalar(ap(q)-ap(0)).addScaledVector(up,superior(q)-superior(0));
}

// Right body side is sideSign (negative X in the current GLB).
// +Z anterior, +Y superior. Axes remain provisional model axes.
export function kneePose(kind,value,sideSign,{anatomy=false,flexAxis=[1,0,0],coupled=true,diagnostic=true,anglesOverride=null,coupledRotationOverride=null}={}){
 const ranges={flex:KNEE.flexionRange,rot:KNEE.axialRotationRange,stress:KNEE.stressRange};
 const range=ranges[kind];if(!range)throw Error('Unknown knee motion: '+kind);
 const angles=anatomy?{flex:0,rot:0,valgus:0}:anglesOverride||activeKneeAngles(kind,clamp(value,...range));
 const naturalScrew=f=>screwHomeExternalRotationDeg(f,KNEE.screwHomeMaxExternalRotationDeg,KNEE.screwHomeWindowDeg);
 const screw=anatomy?0:naturalScrew(angles.flex);
 // The GLB anatomical extension is the locked reference, not a second pose
 // requiring another 9° of external rotation. Flexion unlocks into relative IR.
 const coupledAxial=anatomy?0:coupledRotationOverride??screw-KNEE.screwHomeMaxExternalRotationDeg;
 const rad=Math.PI/180;
 const hip=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-(anatomy?0:KNEE.startingHipFlexionDeg)*rad);
 const axis=new Vector3(...flexAxis).normalize();if(!axis.lengthSq())throw Error('Invalid flexion axis');
 const flex=new Quaternion().setFromAxisAngle(axis,angles.flex*rad);
 const axial=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),sideSign*(angles.rot+coupledAxial)*rad);
 // Positive valgus moves the distal right tibia toward the right lateral side.
 const stress=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),sideSign*angles.valgus*rad);
 const knee=flex.multiply(axial).multiply(stress);
 const translation=anatomy||!coupled?new Vector3():kneeTranslation(angles.flex,flexAxis);
 let instantaneous=null;
 if(diagnostic&&!anatomy&&kind==='flex'){
  // Spatial twist from neighbouring full rigid transforms. This also includes
  // screw-home coupling; a nonzero pitch must not be called a stationary point.
  const h=.001,lo=Math.max(0,angles.flex-h),hi=Math.min(140,angles.flex+h);
  const offset=coupledAxial-(naturalScrew(angles.flex)-KNEE.screwHomeMaxExternalRotationDeg);
  const at=f=>kneePose('flex',f,sideSign,{flexAxis,coupled,diagnostic:false,anglesOverride:{...angles,flex:f},coupledRotationOverride:naturalScrew(f)-KNEE.screwHomeMaxExternalRotationDeg+offset});
  const a=at(lo),b=at(hi);
  const dq=b.knee.clone().multiply(a.knee.clone().invert());if(dq.w<0)dq.set(-dq.x,-dq.y,-dq.z,-dq.w);
  const vector=new Vector3(dq.x,dq.y,dq.z),s=vector.length(),step=(hi-lo)*Math.PI/180;
  const omega=vector.multiplyScalar(s?2*Math.atan2(s,dq.w)/s/step:0);
  const velocity=b.translation.clone().sub(a.translation).divideScalar(step).sub(new Vector3().crossVectors(omega,translation));
  const point=new Vector3().crossVectors(omega,velocity).divideScalar(omega.lengthSq());
  instantaneous={point,direction:omega.clone().normalize(),pitch:omega.dot(velocity)/omega.lengthSq()};
 }
 return {hip,knee,translation,instantaneous,angles,screw,coupledAxial,extrapolated:coupled&&angles.flex>KNEE_REFERENCE.referenceFlexionLimit};
}
