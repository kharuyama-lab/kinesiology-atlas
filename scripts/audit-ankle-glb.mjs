import fs from 'node:fs';
import crypto from 'node:crypto';
import {Matrix4,Vector3,Quaternion,Box3} from 'three';
import {MODEL_ASSETS} from '../config/model-assets.js';
const report={date:'2026-11-06 Asia/Tokyo',method:'GLB JSON hierarchy and transformed POSITION accessor bounds; not decoded surface or visual validation',assets:{}};
for(const system of ['skeletal','joints','muscular']){
 const b=fs.readFileSync(`.cache/${system}.glb`),sha256=crypto.createHash('sha256').update(b).digest('hex');
 if(b.length!==MODEL_ASSETS[system].bytes||sha256!==MODEL_ASSETS[system].sha256)throw Error(`${system}: asset mismatch`);
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),parents=new Map();j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parents.set(c,i)));
 const matrices=new Map();function world(i){if(matrices.has(i))return matrices.get(i);const n=j.nodes[i],m=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation||[0,0,0]),new Quaternion().fromArray(n.rotation||[0,0,0,1]),new Vector3().fromArray(n.scale||[1,1,1]));if(parents.has(i))m.premultiply(world(parents.get(i)));matrices.set(i,m);return m;}
 const names=j.nodes.map(n=>n.extras?.za_name||'');
 const pattern=system==='skeletal'?/^(Tibia|Fibula|Talus|Calcaneus|Navicular bone|Cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx.*foot|Sesamoid bones of foot)\.[rl]$/:/gastrocnemius|Calcaneal tendon|Soleus|Tibialis|Fibularis|Peroneus|hallucis|digitorum|talofibular|calcaneofibular|tibiotalar|tibionavicular|tibiocalcaneal/i;
 const nodes=[];j.nodes.forEach((n,index)=>{const name=names[index];if(!pattern.test(name))return;const box=new Box3();function add(i){const d=j.nodes[i];for(const p of j.meshes?.[d.mesh]?.primitives||[]){const a=j.accessors[p.attributes.POSITION];if(a.min&&a.max)box.union(new Box3(new Vector3().fromArray(a.min),new Vector3().fromArray(a.max)).applyMatrix4(world(i)));}(d.children||[]).forEach(add);}add(index);nodes.push({index,nodeName:n.name,zaName:name,parent:parents.has(index)?{index:parents.get(index),name:names[parents.get(index)]||j.nodes[parents.get(index)].name}:null,mesh:n.mesh,children:n.children||[],bounds:box.isEmpty()?null:{min:box.min.toArray(),max:box.max.toArray(),center:box.getCenter(new Vector3()).toArray()}});});
 report.assets[system]={bytes:b.length,sha256,skins:j.skins?.length||0,animations:j.animations?.length||0,nodes};
}
fs.writeFileSync('docs/ANKLE_GLB_AUDIT.json',JSON.stringify(report,null,2)+'\n');
for(const [system,a] of Object.entries(report.assets)){console.log(system,a.nodes.length,'nodes',a.skins,'skins',a.animations,'animations');if(system==='skeletal')for(const n of a.nodes.filter(n=>n.zaName.endsWith('.r')))console.log(n.index,n.nodeName,n.zaName,JSON.stringify(n.bounds?.center));else console.log(a.nodes.filter(n=>n.zaName.endsWith('.r')).map(n=>n.zaName).join('\n'));}
