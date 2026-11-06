import {Group,Vector3,Quaternion,Matrix4,Line,BufferGeometry,LineDashedMaterial} from 'three';

// Review ranges, not validated physiological limits. Positive: dorsiflexion,
// inversion, adduction and supination. No individual toe articulations.
export const ankleRanges={flex:[-40,20,0,'底屈 40°','背屈 20°'],invert:[-10,20,0,'外がえし 10°','内がえし 20°'],adduct:[-10,15,0,'外転 10°','内転 15°'],compound:[-15,20,0,'回内 15°','回外 20°']};
export const ankleKinds=[['flex','背屈・底屈','Dorsiflexion / Plantarflexion'],['invert','内がえし・外がえし','Inversion / Eversion'],['adduct','内転・外転','Adduction / Abduction'],['compound','回内・回外','Pronation / Supination']];
const rad=Math.PI/180;
export function ankleExcursions(kind,value,tcAxis,stAxis){
 if(!ankleRanges[kind]||!Number.isFinite(value))throw Error('Invalid ankle motion');
 const v=Math.max(ankleRanges[kind][0],Math.min(ankleRanges[kind][1],value));
 // Retain coupled components about oblique joint axes. Slider labels identify
 // the principal component; do not force an independent global-axis rotation.
 if(kind==='flex')return {tc:-v/tcAxis.x,st:0,mt:0};
 const component=kind==='adduct'?stAxis.y:stAxis.z;
 const total=v/component;
 return {tc:0,st:total*.85,mt:total*.15};
}


// Spatial instantaneous helical axis of the displayed forefoot relative to
// the shank. Derived from the spatial twists of the complete joint chain, including
// all pivot translations; not an averaged direction or a segment triad.
export function ankleResultantAxis(kind,value,tcAxis,stAxis,centers){
 const range=ankleRanges[kind],lo=Math.max(range[0],value-.01),hi=Math.min(range[1],value+.01);
 const a=ankleExcursions(kind,value,tcAxis,stAxis),low=ankleExcursions(kind,lo,tcAxis,stAxis),high=ankleExcursions(kind,hi,tcAxis,stAxis),m=new Matrix4(),omega=new Vector3(),velocity=new Vector3();
 for(const [key,center,axis] of [['tc',centers.tc,tcAxis],['st',centers.st,stAxis],['mt',centers.mt,stAxis]]){
  const direction=axis.clone().transformDirection(m),position=center.clone().applyMatrix4(m),jointOmega=direction.multiplyScalar((high[key]-low[key])/(hi-lo)*rad);
  omega.add(jointOmega);velocity.sub(new Vector3().crossVectors(jointOmega,position));
  const q=new Quaternion().setFromAxisAngle(axis,a[key]*rad),t=center.clone().sub(center.clone().applyQuaternion(q));m.multiply(new Matrix4().compose(t,q,new Vector3(1,1,1)));
 }
 if(omega.lengthSq()<1e-16)return null;
 return {point:new Vector3().crossVectors(omega,velocity).divideScalar(omega.lengthSq()),direction:omega.clone().normalize(),pitch:omega.dot(velocity)/omega.lengthSq()};
}

export class AnkleMotion{
 constructor(){this.tc=new Group();this.st=new Group();this.mt=new Group();this.axes=new Group();this.value=0;this.target=0;this.kind='flex';this.ready=false;this.axisObjects=[];}
 prepare({registered,parent,calibration}){
  this.clear();parent.updateWorldMatrix(true,true);
  const tc=calibration.joints.find(j=>j.id==='TC'),st=calibration.joints.find(j=>j.id==='ST'),tn=calibration.joints.find(j=>j.id==='TN'),cc=calibration.joints.find(j=>j.id==='CC');
  this.tcAxis=new Vector3(...tc.axis).normalize();this.stAxis=new Vector3(...st.axis).normalize();
  const center=new Vector3(...tn.center).lerp(new Vector3(...cc.center),.5);
  parent.add(this.tc);this.tc.position.copy(parent.worldToLocal(new Vector3(...tc.center)));this.tc.updateWorldMatrix(true,true);
  this.tc.add(this.st);this.st.position.copy(this.tc.worldToLocal(new Vector3(...st.center)));this.st.updateWorldMatrix(true,true);
  this.st.add(this.mt);this.mt.position.copy(this.st.worldToLocal(center));this.mt.updateWorldMatrix(true,true);
  this.bones=[];
  const pattern=/^(Talus|Calcaneus|Navicular bone|Cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx.*foot|Sesamoid bones of foot)\.r$/;
  for(const [name,obj] of registered)if(pattern.test(name)){(name==='Talus.r'?this.tc:name==='Calcaneus.r'?this.st:this.mt).attach(obj);this.bones.push({name,obj});}
  this.centers={tc:this.tc.position.clone(),st:this.tc.position.clone().add(this.st.position),mt:this.tc.position.clone().add(this.st.position).add(this.mt.position)};
  this.axisObjects=[];
  this.addAxis(parent,new Vector3(),this.tcAxis,0xffd479,'resultant');
  this.ready=true;this.kind='flex';this.value=this.target=0;this.update(1,false,false);
 }
 clear(){for(const e of this.axisObjects||[]){e.group.removeFromParent();e.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}this.axisObjects=[];this.tc.removeFromParent();this.st.removeFromParent();this.mt.removeFromParent();this.tc.quaternion.identity();this.st.quaternion.identity();this.mt.quaternion.identity();this.ready=false;}
 addAxis(owner,origin,axis,color,id){const group=new Group();group.position.copy(origin);owner.add(group);const l=new Line(new BufferGeometry().setFromPoints([axis.clone().multiplyScalar(-.055),axis.clone().multiplyScalar(.055)]),new LineDashedMaterial({color,dashSize:.004,gapSize:.002,depthTest:false,depthWrite:false}));l.computeLineDistances();l.renderOrder=60;group.add(l);this.axisObjects.push({group,kind:id,line:l});}
 set(kind,value,active){if(kind!==this.kind){this.kind=kind;this.value=0;}this.target=active?value:0;}
 update(dt,visible,axesOn){if(!this.ready)return;this.value+=(this.target-this.value)*(1-Math.exp(-dt*14));if(Math.abs(this.value-this.target)<1e-7)this.value=this.target;const a=ankleExcursions(this.kind,this.value,this.tcAxis,this.stAxis);this.tc.quaternion.setFromAxisAngle(this.tcAxis,a.tc*rad);this.st.quaternion.setFromAxisAngle(this.stAxis,a.st*rad);this.mt.quaternion.setFromAxisAngle(this.stAxis,a.mt*rad);this.resultant=ankleResultantAxis(this.kind,this.value,this.tcAxis,this.stAxis,this.centers);const e=this.axisObjects[0];e.group.visible=visible&&axesOn&&!!this.resultant;if(this.resultant){const {point,direction}=this.resultant;const anchor=this.centers[this.kind==='flex'?'tc':'st'],origin=point.clone().addScaledVector(direction,anchor.clone().sub(point).dot(direction));e.group.position.copy(origin);const attribute=e.line.geometry.attributes.position;attribute.setXYZ(0,-direction.x*.065,-direction.y*.065,-direction.z*.065);attribute.setXYZ(1,direction.x*.065,direction.y*.065,direction.z*.065);attribute.needsUpdate=true;e.line.geometry.computeBoundingSphere();e.line.computeLineDistances();e.line.material.color.setHex(this.kind==='flex'?0xffd479:this.kind==='compound'?0xc9a7f1:0x72dbe7);}this.excursions=a;}
 center(){return this.tc.getWorldPosition(new Vector3());}
 hoverAxis(ray){const previous=ray.params.Line.threshold;ray.params.Line.threshold=.002;let result=null;for(const e of this.axisObjects)if(e.line&&e.group.visible&&ray.intersectObject(e.line).length){result=this.kind==='flex'?['距腿関節の回転軸','Talocrural rotation axis']:['足部の合成回転軸','Resultant rotation axis'];break;}ray.params.Line.threshold=previous;return result;}
 snapshot(){return {kind:this.kind,value:this.value,target:this.target,excursions:this.excursions,axes:this.axisObjects.filter(e=>e.group.visible).map(()=>this.kind==='flex'?'TC':'resultant'),resultant:this.resultant?{point:this.resultant.point.toArray(),direction:this.resultant.direction.toArray(),pitch:this.resultant.pitch}:null,bones:(this.bones||[]).map(({name,obj})=>({name,uuid:obj.uuid,matrix:obj.matrixWorld.toArray()})),axisVersion:'ankle-bone-fix-1',status:'teaching axis convention fixed; midtarsal coupling remains an approximation'};}
}
