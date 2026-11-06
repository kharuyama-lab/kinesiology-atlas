import fs from 'node:fs';
import {Vector3} from 'three';
const all=JSON.parse(fs.readFileSync('.cache/ankle-decoded-points.json','utf8'));
const talus=all['Talus.r'],x0=-.075;
// Spatial ROI excludes talar head/neck and lower facets. This is a candidate
// trochlear patch, requiring anatomical review; no cartilage is inferred.
function fit(minY){
 const p=talus.filter(p=>p[1]>minY&&p[2]<-.027&&p[0]>-.09&&p[0]<-.06);
 function loss(v){const [cy,cz,ay,az,r]=v,dir=new Vector3(1,ay,az).normalize();let s=0;for(const a of p){const d=new Vector3(a[0]-x0,a[1]-cy,a[2]-cz),rad=Math.sqrt(Math.max(0,d.lengthSq()-d.dot(dir)**2));s+=(rad-r)**2;}return s/p.length;}
 let v=[.063,-.047,.1,0,.021],best=loss(v),step=[.004,.004,.12,.12,.004];
 for(let iteration=0;iteration<180;iteration++){let improved=false;for(let k=0;k<5;k++)for(const sign of [-1,1]){const c=[...v];c[k]+=sign*step[k];if(c[0]<.04||c[0]>.08||c[1]<-.07||c[1]>-.03||Math.abs(c[2])>.5||Math.abs(c[3])>.5||c[4]<.008||c[4]>.045)continue;const e=loss(c);if(e<best){v=c;best=e;improved=true;}}if(!improved)step=step.map(x=>x*.7);if(Math.max(...step)<1e-7)break;}
 return {roi:{minY,maxZ:-.027,minX:-.09,maxX:-.06},sampleCount:p.length,center:[x0,v[0],v[1]],axis:new Vector3(1,v[2],v[3]).normalize().toArray(),radius:v[4],rms:Math.sqrt(best)};
}
// Opposed surface proximity is only a location candidate, not a functional axis.
function interfaceCenter(an,bn,filter){const a=all[an].filter(filter),b=all[bn];const pairs=a.map(p=>{let q=null,d=Infinity;for(const x of b){const v=p.reduce((s,y,k)=>s+(y-x[k])**2,0);if(v<d){d=v;q=x;}}return {p,q,d:Math.sqrt(d)};}).sort((a,b)=>a.d-b.d);const patch=pairs.slice(0,Math.max(12,Math.round(pairs.length*.15))),center=[0,1,2].map(k=>patch.reduce((s,v)=>s+(v.p[k]+v.q[k])/2,0)/patch.length);return {center,points:patch.length,minGap:pairs[0].d,maxPatchGap:patch.at(-1).d};}
const fits=[.069,.071,.073].map(fit),tc=fits[1];
const st=interfaceCenter('Talus.r','Calcaneus.r',p=>p[2]<-.03&&p[1]<.067);
const tn=interfaceCenter('Talus.r','Navicular bone.r',p=>p[2]>-.025);
const cc=interfaceCenter('Calcaneus.r','Cuboid bone.r',p=>p[2]>-.035);
// Morphological prior only. Positive-X is medial on the right. Reference is
// a geometry-derived heel-to-second-metatarsal direction, not global Z.
const mean=a=>[0,1,2].map(k=>a.reduce((s,p)=>s+p[k],0)/a.length);
const heel=mean(all['Calcaneus.r'].filter(p=>p[2]<-.08)),fore=mean(all['Second metatarsal bone.r'].filter(p=>p[2]>.075));
const ap=new Vector3(...fore).sub(new Vector3(...heel));ap.y=0;ap.normalize();const medial=new Vector3(ap.z,0,-ap.x),incline=42*Math.PI/180,deviation=23*Math.PI/180;
const stAxis=ap.clone().multiplyScalar(Math.cos(incline)*Math.cos(deviation)).addScaledVector(medial,Math.cos(incline)*Math.sin(deviation));stAxis.y=Math.sin(incline);
const config={status:'candidate-only; not approved motion calibration',joints:[
 {id:'TC',name:'距腿関節',center:tc.center,axis:tc.axis,color:0xffd479,method:'距骨上面の限定領域への円筒近似。固定軸の比較候補であり、生体の瞬間軸ではありません。'},
 {id:'ST',name:'距骨下関節',center:st.center,axis:stAxis.toArray(),color:0x72dbe7,method:'距踵骨の近接面から位置を推定。方向は足部基準の42°/23°という文献平均の初期候補で、個体の確定軸ではありません。'},
 {id:'TN',name:'足根部 · 距舟関節',center:tn.center,axis:null,color:0xc9a7f1,method:'近接骨表面から関節位置を推定。運動軸と連動量は未確定です。'},
 {id:'CC',name:'足根部 · 踵立方関節',center:cc.center,axis:null,color:0x91dda9,method:'近接骨表面から関節位置を推定。運動軸と連動量は未確定です。'}
 ],frames:[{name:'Shank',origin:[-.073,.122,-.039]},{name:'Hindfoot',origin:[-.079,.03,-.067]},{name:'Forefoot',origin:[-.099,.034,.047]}]};
// Initial reference frames are model-aligned orientation references, not
// ISB anatomical coordinate systems. They will follow their owning segments.
fs.writeFileSync('config/ankle-review.json',JSON.stringify(config,null,2)+'\n');
const report={date:'2026-11-06 Asia/Tokyo',units:'GLB coordinates (metres assumed, no independent scale validation)',trochlearFits:fits,interfaces:{st,tn,cc},footReference:{heel,fore,ap:ap.toArray()},limitations:['ROI is spatially selected, not manually segmented articular cartilage','Cylinder fit is shape approximation, not an identified physiological axis','Interface centres are nearest-surface patch averages, not measured centres of rotation','ST direction uses a literature mean prior, not patient-specific kinematics','Reference triads are model-aligned, not anatomically calibrated neutral frames'],config};
fs.writeFileSync('docs/ANKLE_SURFACE_CALIBRATION.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({fits,interfaces:report.interfaces,stAxis:stAxis.toArray()},null,2));
