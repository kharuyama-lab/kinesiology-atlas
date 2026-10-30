import {Quaternion,Vector3} from 'three';
import {KNEE} from '../config/knee.js';
import {activeKneeAngles,screwHomeExternalRotationDeg,clamp} from './kinematics.js';

// Right body side is sideSign (negative X in the current GLB).
// +Z anterior, +Y superior. Axes remain provisional model axes.
export function kneePose(kind,value,sideSign,{anatomy=false,flexAxis=[1,0,0]}={}){
 const ranges={flex:KNEE.flexionRange,rot:KNEE.axialRotationRange,stress:KNEE.stressRange};
 const range=ranges[kind];if(!range)throw Error('Unknown knee motion: '+kind);
 const angles=anatomy?{flex:0,rot:0,valgus:0}:activeKneeAngles(kind,clamp(value,...range));
 const screw=anatomy?0:screwHomeExternalRotationDeg(angles.flex,KNEE.screwHomeMaxExternalRotationDeg,KNEE.screwHomeWindowDeg);
 const rad=Math.PI/180;
 const hip=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-(anatomy?0:KNEE.startingHipFlexionDeg)*rad);
 const axis=new Vector3(...flexAxis).normalize();if(!axis.lengthSq())throw Error('Invalid flexion axis');
 const flex=new Quaternion().setFromAxisAngle(axis,angles.flex*rad);
 const axial=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),sideSign*(angles.rot+screw)*rad);
 // Positive valgus moves the distal right tibia toward the right lateral side.
 const stress=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),sideSign*angles.valgus*rad);
 return {hip,knee:flex.multiply(axial).multiply(stress),angles,screw};
}
