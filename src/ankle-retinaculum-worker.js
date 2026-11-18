import {Mesh,BufferGeometry,BufferAttribute,Matrix4,Vector3} from '../vendor/three/build/three.module.js';
import {clearRetinaculumCoverage} from './ankle-retinaculum-clearance.js';
let muscles=[],retinacula={entries:[]};const sheets=new Map();
const make=entry=>{
 const geometry=new BufferGeometry().setAttribute('position',new BufferAttribute(new Float32Array(entry.rest.length*3),3)).setIndex(entry.indices),mesh=new Mesh(geometry);mesh.matrixAutoUpdate=false;
 return {...entry,mesh,rest:entry.rest.map(p=>new Vector3(...p)),bindings:entry.pins?.map(pin=>({pin,normal:new Vector3(),first:{delta:new Matrix4()}}))};
};
self.onmessage=({data})=>{
 if(data.type==='init'){muscles=data.muscles.map(make);retinacula.entries=data.retinacula.map(make);return;}
 const started=performance.now();
 const update=(entry,pose)=>{entry.mesh.geometry.attributes.position.array.set(pose.positions);entry.mesh.matrix.fromArray(pose.matrix);entry.mesh.updateWorldMatrix(true,false);};
 muscles.forEach((e,i)=>update(e,data.muscles[i]));
 retinacula.entries.forEach((e,i)=>{update(e,data.retinacula[i]);e.bindings.forEach((b,k)=>b.normal.fromArray(data.retinacula[i].normals,k*3));});
 clearRetinaculumCoverage(retinacula,muscles,sheets);
 const offsets=retinacula.entries.map((e,i)=>{const positions=e.mesh.geometry.attributes.position.array,base=data.retinacula[i].positions,delta=new Float32Array(positions.length);for(let k=0;k<delta.length;k++)delta[k]=positions[k]-base[k];return delta;});
 self.postMessage({generation:data.generation,kind:data.kind,value:data.value,offsets,ms:performance.now()-started},offsets.map(a=>a.buffer));
};
