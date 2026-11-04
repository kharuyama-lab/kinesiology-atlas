import {Vector3} from 'three';
import {CONTACT_REVIEW as settings} from '../config/knee-contact.js';
// Mesh-derived geometric contact reference, not a cartilage/contact-force solver.
// Fitted ellipses smooth the coarse GLB silhouette; no generic OpenSim translation
// is applied to an unrelated tibial origin.
function fitEllipse(points,origin){
 const scale=.03,rows=points.map(p=>{const y=(p[0]-origin[0])/scale,z=(p[1]-origin[1])/scale;return [y*y,z*z,y,z];});
 const m=Array.from({length:4},(_,i)=>[...Array.from({length:4},(_,j)=>rows.reduce((s,r)=>s+r[i]*r[j],0)),rows.reduce((s,r)=>s+r[i],0)]);
 for(let i=0;i<4;i++){let p=i;for(let j=i+1;j<4;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;[m[i],m[p]]=[m[p],m[i]];const d=m[i][i];if(Math.abs(d)<1e-12)throw Error('Degenerate condyle ellipse');for(let j=i;j<5;j++)m[i][j]/=d;for(let k=0;k<4;k++)if(k!==i){const f=m[k][i];for(let j=i;j<5;j++)m[k][j]-=f*m[i][j];}}
 const [a,b,c,d]=m.map(r=>r[4]),cy=-c/(2*a),cz=-d/(2*b),s=1+c*c/(4*a)+d*d/(4*b);
 if(a<=0||b<=0||s<=0)throw Error('Non-elliptic condyle fit');
 const ellipse={center:[origin[0]+scale*cy,origin[1]+scale*cz],rY:scale*Math.sqrt(s/a),rZ:scale*Math.sqrt(s/b)};
 if(Math.min(ellipse.rY,ellipse.rZ)<.008||Math.max(ellipse.rY,ellipse.rZ)>.08)throw Error('Implausible condyle ellipse');return ellipse;
}
export function buildKneeContact(points,pivot,flexAxis,condyles){
 const a=new Vector3(...flexAxis).normalize(),u=new Vector3(0,1,0).addScaledVector(a,-a.y).normalize(),v=new Vector3().crossVectors(a,u);
 const local=points.map(p=>new Vector3(...p).sub(pivot)),low=Math.min(...local.map(p=>p.dot(u)));
 const split=(new Vector3(...condyles.medial.center).sub(pivot).dot(a)+new Vector3(...condyles.lateral.center).sub(pivot).dot(a))/2;
 const profiles=['medial','lateral'].map((kind,i)=>{
  const x=new Vector3(...condyles[kind].center).sub(pivot).dot(a);
  const side=Math.sign(x-split),surface=local.filter(p=>p.dot(u)<low+settings.profileDepth&&(p.dot(a)-split)*side>settings.notchMargin);
  if(surface.length<20)throw Error('Insufficient condylar profile: '+kind);
  const projected=surface.map(p=>[p.dot(u),p.dot(v)]),outline=[];
  for(let angle=0;angle<=settings.fitThroughDeg;angle+=settings.outlineStep){const ny=Math.cos(angle*Math.PI/180),nz=Math.sin(angle*Math.PI/180);outline.push(projected.reduce((best,p)=>p[0]*ny+p[1]*nz<best[0]*ny+best[1]*nz?p:best));}
  const origin3=new Vector3(...condyles[kind].center).sub(pivot);
  return {kind,x,points:projected,ellipse:fitEllipse(outline,[origin3.dot(u),origin3.dot(v)]),posteriorTravel:i?settings.lateralContactTravel:settings.medialContactTravel};
 });
 const model={status:'MESH CONTACT REVIEW — NOT FIXED',a:a.toArray(),u:u.toArray(),v:v.toArray(),profiles};
 for(const p of profiles)p.reference=profileSupport(model,p,new Vector3(0,1,0)).point.toArray();
 return model;
}
export function profileSupport(model,profile,normal){
 const a=new Vector3(...model.a),u=new Vector3(...model.u),v=new Vector3(...model.v);
 let ny=normal.dot(u),nz=normal.dot(v);const len=Math.hypot(ny,nz);ny/=len;nz/=len;
 const {center:[cy,cz],rY,rZ}=profile.ellipse,D=Math.hypot(rY*ny,rZ*nz);
 const point=a.multiplyScalar(profile.x).addScaledVector(u,cy-rY*rY*ny/D).addScaledVector(v,cz-rZ*rZ*nz/D);
 const radius=rY*rY*rZ*rZ/D**3,n=u.multiplyScalar(ny).addScaledVector(v,nz);
 return {point,curvatureCenter:point.clone().addScaledVector(n,radius),radius};
}
export function contactTranslation(model,rotation,flexion){
 const normal=new Vector3(0,1,0).applyQuaternion(rotation),t=Math.min(1,Math.max(0,flexion/settings.reviewLimitDeg)),travel=t*t*(3-2*t);
 const translations=[],contacts=[];
 for(const profile of model.profiles){
  const support=profileSupport(model,profile,normal);
  const tibial=new Vector3(...profile.reference).add(new Vector3(0,0,-profile.posteriorTravel*travel));
  const translation=support.point.clone().sub(tibial.clone().applyQuaternion(rotation));
  translations.push(translation);contacts.push({kind:profile.kind,femoral:support.point.toArray(),tibial:tibial.toArray(),curvatureCenter:support.curvatureCenter.toArray(),curvatureRadius:support.radius});
 }
 const translation=translations.reduce((sum,p)=>sum.add(p),new Vector3()).multiplyScalar(.5);
 for(const c of contacts)c.normalResidual=new Vector3(...c.femoral).sub(new Vector3(...c.tibial).applyQuaternion(rotation)).sub(translation).dot(normal);
 return {translation,contacts};
}
