import {createAnkleSupplements} from './ankle-supplements.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {BoneSurface} from './bone-surface.js';
import {ankleLigaments} from '../config/ankle-ligaments.js';
const host=document.querySelector('main'),renderer=new T.WebGLRenderer({antialias:true}),scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.001,10),controls=new OrbitControls(camera,renderer.domElement);
host.append(renderer.domElement);scene.add(new T.HemisphereLight(0xffffff,0x4b606e,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(-1,2,2);scene.add(light);
const loader=new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('./vendor/three/draco/')),named=[],inventory={},bones=new Map(),records=[],supplements=[],target=new T.Vector3(-.075,.06,.015);
const landmarkObjects=[];let landmarksOn=true;
let currentView='lateral',closeView=false;const footTarget=new T.Vector3();
function view(kind){currentView=kind;camera.position.copy(target).add(kind==='medial'?new T.Vector3(.46,.10,.03):kind==='posterior'?new T.Vector3(0,.10,-.46):new T.Vector3(-.46,.10,.03));if(closeView)camera.position.sub(target).multiplyScalar(.43).add(target);controls.target.copy(target);controls.update();}
function show(name=null){
 const generated=name==='supplements'||name==='cervical-review'||supplements.some(r=>r.name===name);
 for(const r of [...records,...supplements])r.node.traverse(o=>{if(o.isMesh){o.visible=name==='cervical-review'?(supplements.includes(r)||r.name==='Anterior talocalcaneal ligament.r'):name==='supplements'?supplements.includes(r):name?r.name===name:records.includes(r);o.material.emissive.setHex(r.name===name?0x174560:0);}});
 closeView=generated;for(const r of landmarkObjects){r.marker.visible=generated&&landmarksOn;r.element.hidden=!r.marker.visible;}target.copy(footTarget);if(generated){const pts=supplements.filter(r=>name==='supplements'||name==='cervical-review'||r.name===name).flatMap(r=>[new T.Vector3(...r.a),new T.Vector3(...r.b)]);target.copy(new T.Box3().setFromPoints(pts).getCenter(new T.Vector3()));}
 document.querySelector('#label').textContent=generated?(name==='cervical-review'?'補完3靭帯＋既存の前距踵靭帯':name==='supplements'?'補完3靭帯：静止形状の確認案／白点は推定付着部':supplements.find(r=>r.name===name).jp+'：'+name+'（補完・静止案）'):(name||'全構造（元形状）');
 document.querySelectorAll('#list button').forEach(b=>b.classList.toggle('selected',b.dataset.name===name));view(currentView);
}

try{
 for(const system of ['skeletal','joints','muscular']){
  const gltf=await loader.loadAsync('./.cache/'+system+'.glb');gltf.scene.updateMatrixWorld(true);scene.add(gltf.scene);const rows=[];
  gltf.scene.traverse(n=>{if(!n.userData.za_name)return;const name=n.userData.za_name,meshes=[];n.traverse(o=>{if(o.isMesh)meshes.push(o);});if(!meshes.length)return;
   const box=new T.Box3().setFromObject(n),center=box.getCenter(new T.Vector3()),foot=name.endsWith('.r')&&box.max.y<.16&&box.min.x<0;
   rows.push({name,nodeName:n.name,parent:n.parent?.userData.za_name||n.parent?.name,meshCount:meshes.length,foot,bounds:{min:box.min.toArray(),max:box.max.toArray(),center:center.toArray()}});
   named.push({system,name,node:n,meshes,foot});
  });inventory[system]=rows;
  gltf.scene.traverse(o=>{if(o.isMesh){o.visible=false;o.material=new T.MeshStandardMaterial({color:system==='skeletal'?0xc8d3d8:0x7eb9d3,roughness:.8,side:T.DoubleSide,transparent:system==='skeletal',opacity:system==='skeletal'?.24:1,depthWrite:system!=='skeletal'});}});
 }
 for(const r of named.filter(r=>r.system==='skeletal'&&/^(Tibia|Fibula|Talus|Calcaneus|Navicular bone|Cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx.*foot|Sesamoid bones of foot)\.r$/.test(r.name))){r.meshes.forEach(m=>m.visible=true);bones.set(r.name,new BoneSurface(r.node,r.meshes));}
 const foot=named.filter(r=>r.foot&&(r.system==='joints'||r.system==='muscular'&&/ligament/i.test(r.name)));
 for(const [i,r] of foot.entries()){
  const color=new T.Color().setHSL(i/foot.length,.55,.6);r.meshes.forEach(m=>{m.visible=true;m.material.color.copy(color);});
  const row=inventory[r.system].find(x=>x.name===r.name);row.activeFollower=ankleLigaments.some(([name])=>name===r.name);
  // Diagnose original geometry at both longitudinal extremes without assuming
  // that the source name identifies its actual attachment bones.
  const points=r.meshes.flatMap(m=>{const a=m.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));});
  const mean=points.reduce((p,q)=>p.add(q),new T.Vector3()).divideScalar(points.length),axis=new T.Vector3(1,.7,.3).normalize();
  for(let k=0;k<20;k++){const next=new T.Vector3();for(const p of points){const q=p.clone().sub(mean);next.addScaledVector(q,q.dot(axis));}if(next.lengthSq()>1e-20)axis.copy(next.normalize());}
  points.sort((a,b)=>a.dot(axis)-b.dot(axis));const count=Math.max(3,Math.ceil(points.length*.12));
  row.endCandidates=[points.slice(0,count),points.slice(-count)].map(cloud=>[...bones].map(([name,s])=>({bone:name,meanGap:cloud.reduce((sum,p)=>sum+s.nearestLocal(p.clone().applyMatrix4(s.inverse)).distance,0)/cloud.length})).sort((a,b)=>a.meanGap-b.meanGap).slice(0,3));
  records.push(r);const button=document.createElement('button');button.dataset.name=r.name;button.textContent=r.name+(row.activeFollower?' [追従対象]':' [未追従]');button.onclick=()=>show(r.name);document.querySelector('#list').append(button);
 }
 const footBox=new T.Box3();for(const r of records)footBox.union(new T.Box3().setFromObject(r.node));target.copy(footBox.getCenter(new T.Vector3()));footTarget.copy(target);
 const draft=createAnkleSupplements(bones);
 for(const info of draft.landmarks){const marker=new T.Mesh(new T.SphereGeometry(.00055,10,6),new T.MeshBasicMaterial({color:0xe6a2e8}));marker.position.fromArray(info.point);marker.visible=false;scene.add(marker);const element=document.createElement('span');element.className='landmarkTag';element.textContent=info.id;element.hidden=true;element.title=info.label+'：推定ランドマーク';host.append(element);landmarkObjects.push({info,marker,element});const item=document.createElement('div');item.textContent=info.id+'：'+info.label;document.querySelector('#landmarkLegend').append(item);}
 for(const r of draft){supplements.push(r);scene.add(r.node);r.node.traverse(o=>{if(o.isMesh)o.visible=false;});const button=document.createElement('button');button.dataset.name=r.name;button.textContent=r.jp+' / '+r.id+' [補完・静止案]';button.onclick=()=>show(r.name);document.querySelector('#supplementList').append(button);}
 window.sourceReview={inventory,show,view,landmarks:()=>draft.landmarks,supplements:()=>supplements.map(({node,mesh,...r})=>r)};document.querySelector('#status').textContent='Ready：右足関節・足部 '+records.length+'構造（関節包を含む）';
 document.querySelector('#landmarkToggle').onclick=()=>{landmarksOn=!landmarksOn;for(const r of landmarkObjects){r.marker.visible=closeView&&landmarksOn;r.element.hidden=!r.marker.visible;}document.querySelector('#landmarkToggle').textContent=landmarksOn?'骨の目印：ON':'骨の目印：OFF';};
 document.querySelector('#all').onclick=()=>show();document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));view('lateral');document.querySelector('#supplements').onclick=()=>show('supplements');document.querySelector('#cervicalCompare').onclick=()=>show('cervical-review');let opaque=false;document.querySelector('#boneReview').onclick=()=>{opaque=!opaque;for(const r of named.filter(r=>r.system==='skeletal'))for(const m of r.meshes){m.material.opacity=opaque?1:.24;m.material.transparent=!opaque;m.material.depthWrite=opaque;}document.querySelector('#boneReview').textContent=opaque?'骨：ON':'骨：Fade';};if(new URLSearchParams(location.search).has('supplements'))show('supplements');
}catch(e){document.querySelector('#status').textContent=String(e);console.error(e);}
new ResizeObserver(()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);}).observe(host);
renderer.setAnimationLoop(()=>{controls.update();for(const r of landmarkObjects){if(!r.marker.visible)continue;const p=r.marker.position.clone().project(camera);r.element.hidden=p.z>1||p.z<-1;r.element.style.left=((p.x+1)*host.clientWidth/2+7)+'px';r.element.style.top=((-p.y+1)*host.clientHeight/2-15)+'px';}renderer.render(scene,camera);});
