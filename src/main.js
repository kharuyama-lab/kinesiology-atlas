import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KNEE,PRESETS} from '../config/knee.js';
import {screwHomeExternalRotationDeg,teachingLigamentTendency} from './kinematics.js';

import {tissues,tissueByName,nextVisibility,relevant,focusStates,englishName,japaneseName} from './anatomy.js';

const $=id=>document.getElementById(id);const host=$('canvasHost');
const scene=new THREE.Scene();scene.background=new THREE.Color('#081320');
const camera=new THREE.PerspectiveCamera(38,1,.002,100000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;
scene.add(new THREE.HemisphereLight(0xcee5fc,0x425b77,2));
for(const [pos,intensity] of [[[4,7,8],2.05],[[-5,3,-7],1.2]]){let l=new THREE.DirectionalLight(0xffffff,intensity);l.position.set(...pos);scene.add(l)}
const loader=new GLTFLoader();const draco=new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');loader.setDRACOLoader(draco);
const BASES=[...(new URLSearchParams(location.search).has('localModels')?['.cache/']:[]),'https://nqwrc.github.io/3d-anatomy/models/','https://raw.githubusercontent.com/nqwrc/3d-anatomy/master/public/models/'];
const assets=['skeletal','joints','muscular'];const modelSources=new Map(),liveRoots=[];const registered=new Map(),originalMaterials=new Map(),category=new Map(),meshInfo=new Map(),visibleStates=new Map();
let poseTarget=null;
let mode='anatomy',focus='body',motion='flex',motionValue=90,activeSelection=null;
let hipWorldPoint=null,kneeWorldPoint=null,kneeModelReady=false,sideSign=1,fullBox=null,kneeScale=1,modelLoaded=false,patellaBasePosition=new THREE.Vector3();
const DEG=Math.PI/180;
const tissueStates=focusStates('body');
const materialPalette={bone:0xe6e0d5,patella:0xe3ecf1,acl:0xec739b,pcl:0xb88add,mcl:0x53c9a3,lcl:0xf1b96b,meniscus:0x79b6df,muscle:0xc98283};
const rig={hip:new THREE.Group(),knee:new THREE.Group(),patella:new THREE.Group()};
scene.add(rig.hip);
const axisGroup=new THREE.Group();scene.add(axisGroup);axisGroup.visible=false;
function diagnostics(s){$('diagnostics').textContent=s}
function status(s){$('modelStatus').textContent=s}
function zaName(n){return typeof n.userData?.za_name==='string'?n.userData.za_name.trim():''}
function nearestNamed(mesh){for(let p=mesh;p;p=p.parent){const nm=zaName(p);if(nm)return nm}return ''}
function classify(name,sys){if(sys==='skeletal')return 'bone';if(sys==='muscular')return 'muscle';return name.toLowerCase().includes('meniscus')?'meniscus':'ligament'}
function isTracked(name,sys){return sys==='skeletal'||tissueByName.has(name)}
function register(root,sys){let n=0;root.traverse(obj=>{const name=zaName(obj);if(name&&isTracked(name,sys)&&!registered.has(name)){registered.set(name,obj);category.set(name,classify(name,sys));n++;}});return n;}
function ancestryDepth(n){let k=0;for(let p=n.parent;p;p=p.parent)k++;return k}
function flatten(){scene.updateMatrixWorld(true);for(let obj of [...registered.values()].sort((a,b)=>ancestryDepth(b)-ancestryDepth(a))){if(obj.parent!==scene)scene.attach(obj)}scene.updateMatrixWorld(true)}
function getMeshes(name){const root=registered.get(name),meshes=[];if(!root)return meshes;root.traverse(o=>{if(o.isMesh&&nearestNamed(o)===name)meshes.push(o)});return meshes;}
function baseMaterial(name){const kind=category.get(name);let color=materialPalette.bone;if(name==='Patella.r')color=materialPalette.patella;
 if(kind==='muscle')color=materialPalette.muscle;if(kind==='meniscus')color=materialPalette.meniscus;
 if(name.includes('Anterior cruciate'))color=materialPalette.acl;
 if(name.includes('Posterior cruciate'))color=materialPalette.pcl;
 if(name.includes('tibial collateral'))color=materialPalette.mcl;
 if(name.includes('Fibular collateral'))color=materialPalette.lcl;
 return new THREE.MeshStandardMaterial({color,roughness:.83,side:THREE.DoubleSide});}
function assignMaterials(){for(const name of registered.keys()){
  const m=baseMaterial(name);originalMaterials.set(name,m);for(const obj of getMeshes(name)){
    // Each displayed anatomical structure has its own visual material.
    obj.material=m;obj.userData.atlasName=name;meshInfo.set(obj,name);obj.visible=false;
  }
}}
function visibility(name,state){visibleStates.set(name,state);const mat=originalMaterials.get(name);if(!mat)return;
 mat.opacity=state==='fade'?.3:1;mat.transparent=state==='fade';mat.depthWrite=state!=='fade';
 for(const obj of getMeshes(name))obj.visible=state!=='off';}
function updateVisibility(){
 for(const name of registered.keys())visibility(name,category.get(name)==='bone'?'on':tissueStates.get(name)||'off');
 syncTissueUI();
 if(activeSelection)highlightSelected(activeSelection);
}
function cycleTissue(name){tissueStates.set(name,nextVisibility(tissueStates.get(name)));updateVisibility();if(activeSelection)selectStructure(activeSelection,{showFloating:!$('floatingSelection').hidden});}
function syncTissueUI(){for(const row of document.querySelectorAll('[data-tissue]')){
 const name=row.dataset.tissue;row.hidden=!relevant(name,focus);row.dataset.state=tissueStates.get(name)||'off';
 row.querySelector('small').textContent=registered.has(name)?(row.dataset.state==='fade'?'Fade 30%':row.dataset.state.toUpperCase()):'Unavailable';
 row.disabled=!registered.has(name);
}}
// Fade only when left geometry overlaps the right skeleton in screen space and is nearer.
// Skeleton meshes remain in the scene and visible throughout.
const skeletonBounds=new Map();
function fadeLeftSkeleton(){
 const projectBox=name=>{const bounds=skeletonBounds.get(name);if(!bounds)return null;const root=registered.get(name);root.updateWorldMatrix(true,false);
  const pts=bounds.map(v=>v.clone().applyMatrix4(root.matrixWorld).project(camera));
  return {x0:Math.min(...pts.map(p=>p.x)),x1:Math.max(...pts.map(p=>p.x)),y0:Math.min(...pts.map(p=>p.y)),y1:Math.max(...pts.map(p=>p.y)),z:pts.reduce((v,p)=>v+p.z,0)/8};};
 const right=[...skeletonBounds.keys()].filter(n=>n.endsWith('.r')).map(projectBox).filter(Boolean);
 for(const name of skeletonBounds.keys()){if(!name.endsWith('.l'))continue;const l=projectBox(name);
  const overlap=right.some(r=>l.z<r.z&&l.x0<r.x1&&l.x1>r.x0&&l.y0<r.y1&&l.y1>r.y0);
  const mat=originalMaterials.get(name);mat.opacity=overlap?.3:1;mat.transparent=overlap;mat.depthWrite=!overlap;
 }
}
function worldBox(name){const obj=registered.get(name);return obj?new THREE.Box3().setFromObject(obj):null;}
const tempV=new THREE.Vector3();
function nearBoneEnd(name,frac,nearMax){const obj=registered.get(name),b=worldBox(name);if(!obj||!b)return null;
 const minY=b.min.y,maxY=b.max.y,cut=(maxY-minY)*frac;let x=0,z=0,y=0,count=0;
 obj.updateWorldMatrix(true,true);for(const mesh of getMeshes(name)){
  const a=mesh.geometry.attributes.position,step=Math.max(1,Math.floor(a.count/4200));
  for(let i=0;i<a.count;i+=step){tempV.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);if(nearMax?(tempV.y>=maxY-cut):(tempV.y<=minY+cut)){x+=tempV.x;y+=tempV.y;z+=tempV.z;count++}}
 }
 return count?new THREE.Vector3(x/count,y/count,z/count):b.getCenter(new THREE.Vector3());}
function prepareRig(){
  const fem=worldBox('Femur.r'),tib=worldBox('Tibia.r');if(!fem||!tib){diagnostics('Femur or tibia not found');return;}
  const femDist=nearBoneEnd('Femur.r',KNEE.centerEstimate.distalFemurFraction,false),tibProx=nearBoneEnd('Tibia.r',KNEE.centerEstimate.proximalTibiaFraction,true);
  // The center is a diagnostic estimate; locked model calibration must occur before release.
  const k=femDist.clone().lerp(tibProx,KNEE.centerEstimate.tibiaBlend);const hb=fem.getSize(new THREE.Vector3());
  const hf=KNEE.hipEstimateFractions;const h=new THREE.Vector3(fem.min.x+hb.x*hf[0],fem.min.y+hb.y*hf[1],fem.min.z+hb.z*hf[2]);
  hipWorldPoint=h.clone();kneeWorldPoint=k.clone();sideSign=Math.sign(fem.getCenter(new THREE.Vector3()).x-(worldBox('Femur.l')?.getCenter(new THREE.Vector3()).x||0))||1;
  const bsize=fem.getSize(new THREE.Vector3());kneeScale=Math.max(bsize.x,bsize.y*.20,bsize.z);
  rig.hip.position.copy(h);rig.hip.quaternion.identity();rig.hip.updateWorldMatrix(true,true);
  for(const name of ['Femur.r','Tibia.r','Fibula.r','Patella.r']){
    const o=registered.get(name);if(o)rig.hip.attach(o);
  }
  scene.add(rig.knee);rig.knee.position.copy(k);rig.hip.attach(rig.knee);
  for(const name of ['Tibia.r','Fibula.r']){const obj=registered.get(name);if(obj)rig.knee.attach(obj)}
  // Keep the entire right distal skeleton attached to the tibia.
  for(const [name,kind] of category){if(kind==='bone'&&name.endsWith('.r')&&!['Tibia.r','Fibula.r','Patella.r','Femur.r'].includes(name)){
    const box=worldBox(name);if(box&&box.max.y<tib.min.y+kneeScale*.2)rig.knee.attach(registered.get(name));
  }}
  for(const [name,,kind,joints] of tissues)if(kind==='ligament'&&joints==='knee'&&registered.has(name))rig.hip.attach(registered.get(name));
  // Menisci follow tibia only in the skeletal prototype, with no simulated tissue deformation.
  for(const name of ['Medial meniscus.r','Lateral meniscus.r']){const obj=registered.get(name);if(obj)rig.knee.attach(obj)}
  scene.add(rig.patella);rig.patella.position.copy(k);rig.hip.attach(rig.patella);
  if(registered.get('Patella.r'))rig.patella.attach(registered.get('Patella.r'));
  patellaBasePosition.copy(rig.patella.position);
  scene.add(axisGroup);axisGroup.position.copy(k);rig.hip.attach(axisGroup);
  buildAxis();kneeModelReady=true;updatePose();
  diagnostics('Provisional hip and knee centers. Tissue motion is uncalibrated.');
}
function buildAxis(){axisGroup.clear();const l=Math.max(kneeScale*1.35,.001);
 const a=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-l,0),new THREE.Vector3(0,l*.23,0)]),new THREE.LineBasicMaterial({color:0x62c7ff,depthTest:false}));axisGroup.add(a);
 const pts=[new THREE.Vector3(0,-l*.60,0),new THREE.Vector3(0,-l*.60,l*.27)];
 const arrow=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffbd72,depthTest:false}));axisGroup.add(arrow);
 axisGroup.traverse(o=>{o.renderOrder=50});}
function updatePose(){if(!kneeModelReady)return;
 const moving=mode==='kinesiology'&&focus==='knee';
 const flex=!moving?0:motion==='flex'?motionValue:motion==='rot'?90:30;
 const rot=moving&&motion==='rot'?motionValue:0;
 const valgus=moving&&motion==='stress'?motionValue:0;
 // Femur follows a fixed educational hip flexion posture; knee axes remain in the femoral local frame.
 const hipQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-(moving?KNEE.startingHipFlexionDeg:0)*DEG);
 const screw=!moving?0:screwHomeExternalRotationDeg(flex,KNEE.screwHomeMaxExternalRotationDeg,KNEE.screwHomeWindowDeg);
 const qFlex=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),flex*DEG);
 const qRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),sideSign*(rot+screw)*DEG);
 const qStress=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-sideSign*valgus*DEG);
 const kneeQ=qFlex.multiply(qRotation).multiply(qStress);
 // Small, illustrative proximal/distal patellar glide; not a measured patellofemoral trajectory.
 const patellaPosition=patellaBasePosition.clone();
 patellaPosition.y-=(flex/140)*kneeScale*.10;
 poseTarget={hip:hipQ,knee:kneeQ,patella:patellaPosition};
 axisGroup.visible=$('axisToggle').checked&&moving;
 const p=teachingLigamentTendency(motion,motionValue);
 $('ligamentStatus').innerHTML=['mcl','lcl','acl','pcl'].map(key=>`<div class="ligItem"><strong>${key.toUpperCase()}</strong><span>${({'強調':'Emphasized','通常':'Baseline','角度依存':'Angle dependent','弛緩傾向':'Reduced restraint'})[p[key]]||'Baseline'}</span></div>`).join('');
 $('angleReadout').textContent=motion==='stress'?(motionValue<0?'内反 / Varus ':motionValue>0?'外反 / Valgus ':'Neutral ')+Math.abs(motionValue)+'°':
  motion==='rot'?(motionValue<0?'内旋 / Internal ':motionValue>0?'外旋 / External ':'Neutral ')+Math.abs(motionValue)+'°':`${flex}°`;
}
function frame(target,extent){const d=Math.max(extent,.02);controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(d*.5,d*.32,d*2.45));camera.near=Math.max(.0001,d/1500);camera.far=Math.max(1000,d*200);camera.updateProjectionMatrix();controls.update()}
function frameFocus(f=focus){if(!modelLoaded)return;
 if(f==='body'&&fullBox){const d=fullBox.getSize(new THREE.Vector3()).length();frame(hipWorldPoint,d*.65);return;}
 if(f==='knee'&&kneeWorldPoint){const k=kneeWorldPoint.clone();if(mode==='kinesiology'&&kneeModelReady)rig.knee.getWorldPosition(k);frame(k,kneeScale*3.1);return;}
 if(f==='hip'&&hipWorldPoint){frame(hipWorldPoint,kneeScale*4.2);return;}
}
function setFocus(f){focus=f;activeSelection=null;$('selectedStructure').textContent='Click a structure';$('floatingSelection').hidden=true;
 for(const el of document.querySelectorAll('[data-focus]'))el.classList.toggle('selected',el.dataset.focus===f);
 for(const [name,state] of focusStates(f))tissueStates.set(name,state);
 if(f==='body'){motion='flex';motionValue=90;for(const b of document.querySelectorAll('[data-motion]'))b.classList.toggle('selected',b.dataset.motion==='flex');$('motionSlider').min=0;$('motionSlider').max=140;$('motionSlider').value=90;}
 updateModeUI();updatePose();updateVisibility();
 // Focus is an intentional framing operation; frame the target pose rather than an intermediate tween.
 if(poseTarget){rig.hip.quaternion.copy(poseTarget.hip);rig.knee.quaternion.copy(poseTarget.knee);rig.patella.position.copy(poseTarget.patella);scene.updateMatrixWorld(true);}
 frameFocus(f);
}
function setMotion(m){motion=m;motionValue=PRESETS[m].knee===90?90:0;if(m==='rot'||m==='stress')motionValue=0;
 for(const el of document.querySelectorAll('[data-motion]'))el.classList.toggle('selected',el.dataset.motion===m);
 const sl=$('motionSlider');const ranges={flex:[0,140,90,'伸展 / Extension 0°','屈曲 / Flexion 140°'],rot:[-15,30,0,'内旋 / Internal 15°','外旋 / External 30°'],stress:[-3,3,0,'内反 / Varus 3°','外反 / Valgus 3°']};
 const v=ranges[m];sl.min=v[0];sl.max=v[1];sl.value=v[2];motionValue=v[2];$('negativeLabel').textContent=v[3];$('positiveLabel').textContent=v[4];updatePose()}
function updateModeUI(){
 const moving=mode==='kinesiology';
 $('motionSection').hidden=!(moving&&focus==='knee');
 $('sectionEyebrow').textContent=moving?'MODE 2':'MODE 1';
 $('sectionTitle').textContent=({body:'Whole Body',hip:'股関節 / Hip',knee:'膝関節 / Knee'})[focus];
 $('stageBadge').textContent=moving?(focus==='knee'?'Joint Kinesiology · Provisional pose':'Joint Kinesiology · Movement pending calibration'):'Anatomy';
}
function setMode(m){if(mode===m)return;mode=m;
 for(const el of document.querySelectorAll('[data-mode]'))el.classList.toggle('selected',el.dataset.mode===m);
 updateModeUI();updatePose();
 // Deliberately preserve camera, focus, selection, tissue states and common UI.
}
function setView(v){if(!modelLoaded)return;const target=controls.target.clone(),d=Math.max(camera.position.distanceTo(target),.01);
 const dirs={front:[0,0,1],back:[0,0,-1],lateral:[sideSign,0,0],medial:[-sideSign,0,0],iso:[sideSign*.8,.4,1]};camera.position.copy(target).add(new THREE.Vector3(...dirs[v]).normalize().multiplyScalar(d));camera.up.set(0,1,0);controls.update();}
function uiMuscleList(){for(const [name,jp,kind] of tissues){
 const b=document.createElement('button');b.type='button';b.dataset.tissue=name;
 const title=document.createElement('span');title.textContent=kind==='muscle'?jp:jp+' / '+englishName(name);const state=document.createElement('small');b.append(title,state);
 b.addEventListener('click',()=>cycleTissue(name));$(kind==='muscle'?'muscleList':'ligamentList').append(b);
}}
function highlightSelected(name){for(const [k,m] of originalMaterials){const picked=k===name&&visibleStates.get(k)!=='off';m.emissive.setHex(picked?0x2e7baa:0x000000);m.emissiveIntensity=picked?.12:0;}}
let selectionPoint=null;
function positionSelection(){const el=$('floatingSelection');if(el.hidden||!selectionPoint)return;
 const viewport=$('viewport').getBoundingClientRect(),gap=14,pad=8;
 let x=selectionPoint.x+gap,y=selectionPoint.y+gap;
 if(x+el.offsetWidth>viewport.width-pad)x=selectionPoint.x-el.offsetWidth-gap;
 if(y+el.offsetHeight>viewport.height-pad)y=selectionPoint.y-el.offsetHeight-gap;
 el.style.left=Math.max(pad,Math.min(x,viewport.width-el.offsetWidth-pad))+'px';
 el.style.top=Math.max(pad,Math.min(y,viewport.height-el.offsetHeight-pad))+'px';
}
function selectStructure(name,{point=null,showFloating=true}={}){activeSelection=name;highlightSelected(name);
 if(point){const rect=$('viewport').getBoundingClientRect();selectionPoint={x:point.x-rect.left,y:point.y-rect.top};}
 $('hoverPopup').hidden=true;
 for(const id of ['selectedStructure','floatingSelection']){const el=$(id);el.replaceChildren();
  const title=document.createElement('div');title.className='selectedName';title.textContent=japaneseName(name)||englishName(name);el.append(title);
  if(id==='floatingSelection'){const en=document.createElement('div');en.className='selectedEnglish';en.textContent=englishName(name);el.append(en);}
  if(category.get(name)!=='bone'){const button=document.createElement('button');const state=tissueStates.get(name)||'off';button.textContent=state==='fade'?'Fade 30%':state.toUpperCase();button.addEventListener('click',()=>cycleTissue(name));el.append(button);}
  else {const label=document.createElement('small');label.textContent='Skeleton · ON';el.append(label);}
 }
 $('floatingSelection').hidden=!showFloating;positionSelection();
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let mouseDown=null;
function hitAt(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);
 raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(scene.children,true);
 for(const hit of hits){const o=hit.object;if(meshInfo.has(o)&&o.visible)return meshInfo.get(o)}return null;
}
renderer.domElement.addEventListener('pointerdown',e=>{mouseDown={x:e.clientX,y:e.clientY,t:performance.now()}});
renderer.domElement.addEventListener('pointerup',e=>{if(!mouseDown)return;const dist=Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y);if(dist<9&&performance.now()-mouseDown.t<550){const name=hitAt(e.clientX,e.clientY);if(name)selectStructure(name,{point:{x:e.clientX,y:e.clientY}});else $('floatingSelection').hidden=true;}mouseDown=null});
renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons){$('hoverPopup').hidden=true;if(mouseDown&&Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y)>=9)$('floatingSelection').hidden=true;return}
 const name=hitAt(e.clientX,e.clientY),tip=$('hoverPopup');if(!name||(! $('floatingSelection').hidden&&name===activeSelection)){tip.hidden=true;return}
 tip.hidden=false;tip.replaceChildren();let strong=document.createElement('strong');strong.textContent=japaneseName(name)||englishName(name);let sub=document.createElement('small');sub.textContent=name.replace(/\.[rl]$/,'');tip.append(strong,sub);
 const b=$('viewport').getBoundingClientRect();tip.style.left=Math.min(e.clientX-b.left+12,b.width-220)+'px';tip.style.top=Math.max(10,e.clientY-b.top-48)+'px';
});
renderer.domElement.addEventListener('pointerleave',()=>{$('hoverPopup').hidden=true});
function size(){const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);positionSelection()}
new ResizeObserver(size).observe(host);size();
uiMuscleList();
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));
for(const b of document.querySelectorAll('[data-focus]'))b.addEventListener('click',()=>setFocus(b.dataset.focus));
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>setView(b.dataset.view));
for(const b of document.querySelectorAll('[data-motion]'))b.addEventListener('click',()=>setMotion(b.dataset.motion));
$('axisToggle').addEventListener('change',updatePose);
$('motionSlider').addEventListener('input',e=>{motionValue=+e.target.value;updatePose()});
$('resetPose').addEventListener('click',()=>setMotion(motion));
$('mobilePanel').addEventListener('click',()=>{$('sidebar').classList.toggle('collapsed');size()});
if(matchMedia('(max-width:740px)').matches)$('sidebar').classList.add('collapsed');
async function loadOne(name){const errs=[];for(const base of BASES){try{
 const gltf=await loader.loadAsync(base+name+'.glb');modelSources.set(name,gltf.scene);return name+': loaded';
 }catch(err){errs.push((new URL(base,location.href)).hostname+': '+String(err.message||err).slice(0,80))}}
 throw Error(`${name}.glb — ${errs.join(' / ')}`)}
async function afterLoad(){
 // Rebuild from pristine sources so manual retries cannot accumulate rotations or duplicate meshes.
 poseTarget=null;modelLoaded=false;kneeModelReady=false;
 for(const obj of registered.values())obj.removeFromParent();for(const root of liveRoots)root.removeFromParent();liveRoots.length=0;
 for(const m of originalMaterials.values())m.dispose();
 registered.clear();originalMaterials.clear();category.clear();meshInfo.clear();visibleStates.clear();skeletonBounds.clear();
 rig.hip.quaternion.identity();rig.knee.quaternion.identity();rig.patella.quaternion.identity();
 for(const [sys,source] of modelSources){const root=source.clone(true);root.traverse(o=>{if(o.isMesh)o.visible=false});scene.add(root);liveRoots.push(root);register(root,sys);}
 if(!registered.has('Femur.r')||!registered.has('Tibia.r'))throw Error('Femur.r / Tibia.r not found');
 flatten();assignMaterials();const allBones=[...registered.keys()].filter(n=>category.get(n)==='bone');fullBox=new THREE.Box3();for(const nm of allBones){const b=worldBox(nm);if(b)fullBox.union(b)}
 prepareRig();modelLoaded=true;
 for(const name of allBones){const root=registered.get(name);root.updateWorldMatrix(true,true);const box=new THREE.Box3();
  for(const mesh of getMeshes(name)){mesh.geometry.computeBoundingBox();const mb=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);box.union(mb);}
  const inv=root.matrixWorld.clone().invert();const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).applyMatrix4(inv));skeletonBounds.set(name,corners);
 }
 updateVisibility();setFocus('body');
 $('loadOverlay').hidden=true;status('Ready');diagnostics(`Structures: ${registered.size}; bones: ${allBones.length}\nProvisional centers and axes — not calibrated.\nScrew-home and patellar tracking are illustrative.`);
}
async function boot(){status('Loading');
 const results=await Promise.allSettled(assets.map(loadOne));
 const got=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const errs=results.filter(r=>r.status==='rejected').map(r=>String(r.reason));
 if(modelSources.has('skeletal')){
  try{await afterLoad();diagnostics(got.join('\n')+'\n'+(errs.length?'Unavailable assets:\n'+errs.join('\n')+'\n':'')+$('diagnostics').textContent)}
  catch(e){status('Initialization failed');$('loadOverlay').innerHTML='<strong>3D initialization failed</strong><small>See Diagnostics</small>';diagnostics(String(e));console.error(e)}
 }else{
  status('Load failed');$('loadOverlay').innerHTML='<strong>Bone models unavailable</strong><small>See Diagnostics or load GLB files</small>';
  diagnostics(errs.join('\n')||'Femur.r / Tibia.r not found');
 }
}
$('manualFiles').addEventListener('change',async e=>{try{for(const f of e.target.files){const system=f.name.toLowerCase().replace(/\.glb$/,'');if(!assets.includes(system))continue;const gltf=await loader.parseAsync(await f.arrayBuffer(),'');modelSources.set(system,gltf.scene)}await afterLoad()}catch(err){diagnostics(String(err));console.error(err)}});
let lastTick=performance.now();
function tick(now=performance.now()){requestAnimationFrame(tick);const dt=Math.min((now-lastTick)/1000,.05);lastTick=now;
 if(poseTarget){const before=rig.knee.getWorldPosition(new THREE.Vector3());const t=1-Math.exp(-dt*10);rig.hip.quaternion.slerp(poseTarget.hip,t);rig.knee.quaternion.slerp(poseTarget.knee,t);rig.patella.position.lerp(poseTarget.patella,t);axisGroup.quaternion.copy(rig.knee.quaternion);
  // Follow the moving right knee without changing the user's viewing direction, zoom or pan offset.
  if(modelLoaded&&focus==='knee'){const delta=rig.knee.getWorldPosition(new THREE.Vector3()).sub(before);camera.position.add(delta);controls.target.add(delta);}
 }
 controls.update();scene.updateMatrixWorld(true);fadeLeftSkeleton();renderer.render(scene,camera);
}tick();boot();
// Read-only QA snapshot, opt in locally with ?qa; no remote controls.
if(new URLSearchParams(location.search).has('qa'))window.atlasQA=()=>({mode,focus,camera:camera.position.toArray(),target:controls.target.toArray(),states:Object.fromEntries(tissueStates),tissueMeshes:tissues.map(([n])=>({name:n,count:getMeshes(n).length,visible:getMeshes(n).every(m=>m.visible),opacity:originalMaterials.get(n)?.opacity})),focusNDC:(focus==='knee'?rig.knee.getWorldPosition(new THREE.Vector3()):hipWorldPoint?.clone())?.project(camera).toArray(),bones:[...category].filter(([,k])=>k==='bone').map(([n])=>({name:n,visible:getMeshes(n).every(m=>m.visible),opacity:originalMaterials.get(n).opacity})),registered:[...registered.keys()],hip:rig.hip.quaternion.toArray(),knee:rig.knee.quaternion.toArray()});
