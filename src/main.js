import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KNEE,PRESETS} from '../config/knee.js';
import {clamp,screwHomeExternalRotationDeg,teachingLigamentTendency} from './kinematics.js';

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
const BASES=['https://nqwrc.github.io/3d-anatomy/models/','https://raw.githubusercontent.com/nqwrc/3d-anatomy/master/public/models/'];
const assets=['skeletal','joints','muscular'];const registered=new Map(),originalMaterials=new Map(),category=new Map(),meshInfo=new Map(),visibleStates=new Map();
let mode='anatomy',focus='body',motion='flex',motionValue=90,activeSelection=null,hipAnchor=null,kneeAnchor=null;
let hipWorldPoint=null,kneeWorldPoint=null,kneeModelReady=false,sideSign=1,fullBox=null,kneeScale=1,lastPointer=null,modelLoaded=false,patellaBasePosition=new THREE.Vector3();
const DEG=Math.PI/180;
const boneNames=['Femur.r','Tibia.r','Fibula.r','Patella.r','Hip bone.r','Hip bone.l','Sacrum'];
const kneeTissueNames={
 'Anterior cruciate ligament.r':['前十字靭帯','ACL'],
 'Posterior cruciate ligament.r':['後十字靭帯','PCL'],
 'Superficial part of tibial collateral ligament.r':['内側側副靭帯・浅層','MCL superficial'],
 'Deep part of tibial collateral ligament.r':['内側側副靭帯・深層','MCL deep'],
 'Fibular collateral ligament.r':['外側側副靭帯','LCL'],
 'Medial meniscus.r':['内側半月板','Medial meniscus'],
 'Lateral meniscus.r':['外側半月板','Lateral meniscus']
};
const muscleList={
 'Rectus femoris muscle.r':'大腿直筋','Vastus medialis.r':'内側広筋','Vastus lateralis.r':'外側広筋','Vastus intermedius.r':'中間広筋',
 'Long head of biceps femoris.r':'大腿二頭筋長頭','Short head of biceps femoris.r':'大腿二頭筋短頭',
 'Semitendinosus muscle.r':'半腱様筋','Semimembranosus muscle.r':'半膜様筋','Sartorius muscle.r':'縫工筋','Gracilis muscle.r':'薄筋',
 'Popliteus muscle.r':'膝窩筋','Medial head of gastrocnemius.r':'腓腹筋内側頭','Lateral head of gastrocnemius.r':'腓腹筋外側頭'
};
const displayNames={...Object.fromEntries(Object.entries(kneeTissueNames).map(([k,v])=>[k,v[0]])),...muscleList,
 'Femur.r':'右大腿骨','Tibia.r':'右脛骨','Fibula.r':'右腓骨','Patella.r':'右膝蓋骨','Hip bone.r':'右寛骨','Hip bone.l':'左寛骨','Sacrum':'仙骨'};
const materialPalette={bone:0xe6e0d5,patella:0xe3ecf1,acl:0xec739b,pcl:0xb88add,mcl:0x53c9a3,lcl:0xf1b96b,meniscus:0x79b6df,muscle:0xc98283};
const rig={hip:new THREE.Group(),knee:new THREE.Group(),patella:new THREE.Group()};
scene.add(rig.hip);
const axisGroup=new THREE.Group();scene.add(axisGroup);axisGroup.visible=false;
function diagnostics(s){$('diagnostics').textContent=s}
function status(s){$('modelStatus').textContent=s}
function zaName(n){return typeof n.userData?.za_name==='string'?n.userData.za_name.trim():''}
function nearestNamed(mesh){for(let p=mesh;p;p=p.parent){const nm=zaName(p);if(nm)return nm}return ''}
function classify(name,sys){if(sys==='skeletal')return 'bone';if(sys==='muscular')return 'muscle';return name.toLowerCase().includes('meniscus')?'meniscus':'ligament'}
function isTracked(name,sys){return sys==='skeletal'||Object.hasOwn(kneeTissueNames,name)||Object.hasOwn(muscleList,name)}
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
 mat.opacity=state==='transparent'?.3:1;mat.transparent=state==='transparent';mat.depthWrite=state!=='transparent';
 for(const obj of getMeshes(name))obj.visible=state!=='off';}
function updateVisibility(){
 for(const name of registered.keys()){
  const kind=category.get(name);
  let v='off';
  if(kind==='bone'){
   if(mode==='anatomy'&&focus==='body')v=$('bones').value;
   else if(mode==='anatomy'&&focus==='hip')v=/^(Femur\.r|Hip bone\.[rl]|Sacrum|Coccyx)$/.test(name)?$('bones').value:'off';
   else if(mode==='anatomy'&&focus==='knee')v=/^(Femur\.r|Tibia\.r|Fibula\.r|Patella\.r)$/.test(name)?$('bones').value:'off';
   else if(mode==='knee')v=/^(Femur\.r|Tibia\.r|Fibula\.r|Patella\.r|Hip bone\.[rl]|Sacrum)$/.test(name)?$('bones').value:'off';
  }else if(kind==='muscle'){
    const state=document.querySelector(`[data-muscle="${CSS.escape(name)}"]`)?.dataset.state||'off';
    if(mode==='anatomy'&&focus!=='body')v=state;
    else if(mode==='anatomy'&&focus==='body')v=state;
    else if(mode==='knee')v='off'; // Dynamic muscle model will be developed after skeletal validation.
  }else if(kind==='ligament'||kind==='meniscus'){
    v=mode==='anatomy'&&focus!=='body'?$('ligaments').value:'off';
  }
  visibility(name,v);
 }
 if(activeSelection)highlightSelected(activeSelection);
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
  const fem=worldBox('Femur.r'),tib=worldBox('Tibia.r');if(!fem||!tib){diagnostics('大腿骨または脛骨を検出できませんでした。');return;}
  const femDist=nearBoneEnd('Femur.r',.11,false),tibProx=nearBoneEnd('Tibia.r',.11,true);
  // The center is a diagnostic estimate; locked model calibration must occur before release.
  const k=femDist.clone().lerp(tibProx,.45);const hb=fem.getSize(new THREE.Vector3());
  const h=new THREE.Vector3(fem.min.x+hb.x*.564,fem.min.y+hb.y*.949,fem.min.z+hb.z*.690);
  hipWorldPoint=h.clone();kneeWorldPoint=k.clone();sideSign=Math.sign(fem.getCenter(new THREE.Vector3()).x-h.x)||1;
  const bsize=fem.getSize(new THREE.Vector3());kneeScale=Math.max(bsize.x,bsize.y*.20,bsize.z);
  rig.hip.position.copy(h);rig.hip.quaternion.identity();rig.hip.updateWorldMatrix(true,true);
  for(const name of ['Femur.r','Tibia.r','Fibula.r','Patella.r']){
    const o=registered.get(name);if(o)rig.hip.attach(o);
  }
  scene.add(rig.knee);rig.knee.position.copy(k);rig.hip.attach(rig.knee);
  for(const name of ['Tibia.r','Fibula.r']){const obj=registered.get(name);if(obj)rig.knee.attach(obj)}
  // Menisci follow tibia only in the skeletal prototype, with no simulated tissue deformation.
  for(const name of ['Medial meniscus.r','Lateral meniscus.r']){const obj=registered.get(name);if(obj)rig.knee.attach(obj)}
  scene.add(rig.patella);rig.patella.position.copy(k);rig.hip.attach(rig.patella);
  if(registered.get('Patella.r'))rig.patella.attach(registered.get('Patella.r'));
  patellaBasePosition.copy(rig.patella.position);
  scene.add(axisGroup);axisGroup.position.copy(k);rig.hip.attach(axisGroup);
  buildAxis();kneeModelReady=true;updatePose();
  diagnostics('各構造を読み込みました。\n右膝中心：骨形状からの暫定推定\n股関節90°・膝90°の観察姿勢は試作設定です。\n動的靭帯張力・半月板変形は未校正です。');
}
function buildAxis(){axisGroup.clear();const l=Math.max(kneeScale*1.35,.001);
 const a=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-l,0),new THREE.Vector3(0,l*.23,0)]),new THREE.LineBasicMaterial({color:0x62c7ff,depthTest:false}));axisGroup.add(a);
 const pts=[new THREE.Vector3(0,-l*.60,0),new THREE.Vector3(0,-l*.60,l*.27)];
 const arrow=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffbd72,depthTest:false}));axisGroup.add(arrow);
 axisGroup.traverse(o=>{o.renderOrder=50});}
function updatePose(){if(!kneeModelReady)return;
 const flex=motion==='flex'?motionValue:motion==='rot'?90:30;
 const rot=motion==='rot'?motionValue:0;
 const valgus=motion==='stress'?motionValue:0;
 // Femur follows a fixed educational hip flexion posture; knee axes remain in the femoral local frame.
 rig.hip.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),-KNEE.startingHipFlexionDeg*DEG);
 const screw=screwHomeExternalRotationDeg(flex,KNEE.screwHomeMaxExternalRotationDeg,KNEE.screwHomeWindowDeg);
 const qFlex=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),flex*DEG);
 const qRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),sideSign*(rot+screw)*DEG);
 const qStress=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-sideSign*valgus*DEG);
 rig.knee.quaternion.copy(qFlex).multiply(qRotation).multiply(qStress);
 axisGroup.quaternion.copy(rig.knee.quaternion);
 // Small, illustrative proximal/distal patellar glide; not a measured patellofemoral trajectory.
 rig.patella.position.copy(patellaBasePosition);
 rig.patella.position.y-=(flex/140)*kneeScale*.10;
 axisGroup.visible=$('axisToggle').checked&&mode==='knee';
 const p=teachingLigamentTendency(motion,motionValue);
 $('ligamentStatus').innerHTML=['mcl','lcl','acl','pcl'].map(key=>`<div class="ligItem"><strong>${key.toUpperCase()}</strong><span>${p[key]||'通常'}</span></div>`).join('');
 $('angleReadout').textContent=motion==='stress'?(motionValue<0?'内反 ':motionValue>0?'外反 ':'中間 ')+Math.abs(motionValue)+'°':
  motion==='rot'?(motionValue<0?'内旋 ':motionValue>0?'外旋 ':'中間 ')+Math.abs(motionValue)+'°':`${flex}°`;
}
function frame(target,extent){const d=Math.max(extent,.02);controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(d*.5,d*.32,d*2.45));camera.near=Math.max(.0001,d/1500);camera.far=Math.max(1000,d*200);camera.updateProjectionMatrix();controls.update()}
function frameFocus(f=focus){if(!modelLoaded)return;
 if(f==='body'&&fullBox){const center=fullBox.getCenter(new THREE.Vector3()),d=fullBox.getSize(new THREE.Vector3()).length();frame(center,d*.65);return;}
 if(f==='knee'&&kneeWorldPoint){const k=kneeWorldPoint.clone();if(mode==='knee'&&kneeModelReady)rig.knee.getWorldPosition(k);frame(k,kneeScale*3.1);return;}
 if(f==='hip'&&hipWorldPoint){frame(hipWorldPoint,kneeScale*4.2);return;}
}
function setFocus(f){focus=f;for(const el of document.querySelectorAll('[data-focus]'))el.classList.toggle('selected',el.dataset.focus===f);updateVisibility();frameFocus(f)}
function setMotion(m){motion=m;motionValue=PRESETS[m].knee===90?90:0;if(m==='rot'||m==='stress')motionValue=0;
 for(const el of document.querySelectorAll('[data-motion]'))el.classList.toggle('selected',el.dataset.motion===m);
 const sl=$('motionSlider');const ranges={flex:[0,140,90,'伸展 0°','屈曲 140°'],rot:[-15,30,0,'内旋 15°','外旋 30°'],stress:[-3,3,0,'内反 3°','外反 3°']};
 const v=ranges[m];sl.min=v[0];sl.max=v[1];sl.value=v[2];motionValue=v[2];$('negativeLabel').textContent=v[3];$('positiveLabel').textContent=v[4];updatePose()}
function setMode(m){mode=m;const hip=(m==='hip');$('hipFrame').hidden=!hip;for(const el of document.querySelectorAll('[data-mode]'))el.classList.toggle('selected',el.dataset.mode===m);
 if(hip){const iframe=$('hipFrame').querySelector('iframe');if(iframe.src.endsWith('about:blank'))iframe.src=iframe.dataset.src;return;}
 $('motionSection').hidden=m!=='knee';document.querySelectorAll('.anatomyOnly').forEach(e=>e.hidden=m!=='anatomy');
 $('sectionEyebrow').textContent=m==='knee'?'MODE 2':'MODE 1';$('sectionTitle').textContent=m==='knee'?'右膝関節の運動学':'全身静止解剖';
 $('stageBadge').textContent=m==='knee'?'Joint Kinesiology · 骨運動の校正前試作':'Static Anatomy · 右側主体';
 if(m==='knee'){focus='knee';for(const el of document.querySelectorAll('[data-focus]'))el.classList.toggle('selected',el.dataset.focus==='knee');setMotion(motion)}
 else{if(rig.hip){rig.hip.quaternion.identity();rig.knee.quaternion.identity();rig.patella.position.copy(patellaBasePosition)}axisGroup.visible=false;}
 updateVisibility();frameFocus(m==='knee'?'knee':focus);
}
function setView(v){if(!modelLoaded)return;const target=controls.target.clone(),d=Math.max(camera.position.distanceTo(target),.01);
 const dirs={front:[0,0,1],back:[0,0,-1],lateral:[sideSign,0,0],medial:[-sideSign,0,0],iso:[sideSign*.8,.4,1]};camera.position.copy(target).add(new THREE.Vector3(...dirs[v]).normalize().multiplyScalar(d));camera.up.set(0,1,0);controls.update();}
function uiMuscleList(){const box=$('muscleList');for(const [name,jp] of Object.entries(muscleList)){
 const b=document.createElement('button');b.type='button';b.dataset.muscle=name;b.dataset.state='on';b.innerHTML=`<span>${jp}</span><small>ON</small>`;
 b.addEventListener('click',()=>{const seq={off:'on',on:'transparent',transparent:'off'};b.dataset.state=seq[b.dataset.state];b.querySelector('small').textContent=b.dataset.state==='transparent'?'透過':b.dataset.state.toUpperCase();updateVisibility()});box.append(b);
 }}
function highlightSelected(name){for(const [k,m] of originalMaterials){const picked=k===name&&visibleStates.get(k)!=='off';m.emissive.setHex(picked?0x2e7baa:0x000000);m.emissiveIntensity=picked?.12:0;}}
function selectStructure(name){activeSelection=name;highlightSelected(name);const el=$('selectedStructure');const state=visibleStates.get(name)||'off';
 const jp=displayNames[name]||(name.replace(/\.[rl]$/,''));const en=name.replace(/\.[rl]$/,'');
 el.replaceChildren();const title=document.createElement('div');title.className='selectedName';title.textContent=jp;
 const sub=document.createElement('div');sub.className='selectedEnglish';sub.textContent=en;
 const buttons=document.createElement('div');buttons.className='selectedActions';
 for(const [v,label] of [['on','ON'],['transparent','透過30%'],['off','OFF']]){
 const b=document.createElement('button');b.textContent=label;b.classList.toggle('selected',v===state);b.addEventListener('click',()=>{
 if(category.get(name)==='muscle'){
  const row=document.querySelector(`[data-muscle="${CSS.escape(name)}"]`);if(row){row.dataset.state=v;row.querySelector('small').textContent=v==='transparent'?'透過':v.toUpperCase()}
 }else if(category.get(name)==='bone')$('bones').value=v;
 else $('ligaments').value=v;
 updateVisibility();selectStructure(name);
 });buttons.append(b);
 }
 el.append(title,sub,buttons);
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let mouseDown=null;
function hitAt(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);
 raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(scene.children,true);
 for(const hit of hits){const o=hit.object;if(meshInfo.has(o)&&o.visible)return meshInfo.get(o)}return null;
}
renderer.domElement.addEventListener('pointerdown',e=>{mouseDown={x:e.clientX,y:e.clientY,t:performance.now()}});
renderer.domElement.addEventListener('pointerup',e=>{if(!mouseDown)return;const dist=Math.hypot(e.clientX-mouseDown.x,e.clientY-mouseDown.y);if(dist<9&&performance.now()-mouseDown.t<550){const name=hitAt(e.clientX,e.clientY);if(name)selectStructure(name)}mouseDown=null});
renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons){$('hoverPopup').hidden=true;return}
 const name=hitAt(e.clientX,e.clientY),tip=$('hoverPopup');if(!name){tip.hidden=true;return}
 tip.hidden=false;tip.replaceChildren();let strong=document.createElement('strong');strong.textContent=displayNames[name]||name.replace(/\.[rl]$/,'');let sub=document.createElement('small');sub.textContent=name.replace(/\.[rl]$/,'');tip.append(strong,sub);
 const b=$('viewport').getBoundingClientRect();tip.style.left=Math.min(e.clientX-b.left+12,b.width-220)+'px';tip.style.top=Math.max(10,e.clientY-b.top-48)+'px';
});
renderer.domElement.addEventListener('pointerleave',()=>{$('hoverPopup').hidden=true});
function size(){const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
new ResizeObserver(size).observe(host);size();
uiMuscleList();
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));
for(const b of document.querySelectorAll('[data-focus]'))b.addEventListener('click',()=>setFocus(b.dataset.focus));
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>setView(b.dataset.view));
for(const b of document.querySelectorAll('[data-motion]'))b.addEventListener('click',()=>setMotion(b.dataset.motion));
for(const id of ['bones','ligaments','muscles'])$(id).addEventListener('change',()=>{
 if(id==='muscles'){for(const b of document.querySelectorAll('[data-muscle]')){b.dataset.state=$('muscles').value;b.querySelector('small').textContent=$('muscles').value==='transparent'?'透過':$('muscles').value.toUpperCase()}}
 updateVisibility();
});
$('axisToggle').addEventListener('change',updatePose);
$('motionSlider').addEventListener('input',e=>{motionValue=+e.target.value;updatePose()});
$('resetPose').addEventListener('click',()=>setMotion(motion));
$('mobilePanel').addEventListener('click',()=>{$('sidebar').classList.toggle('collapsed');size()});
if(matchMedia('(max-width:740px)').matches)$('sidebar').classList.add('collapsed');
async function loadOne(name){const errs=[];for(const base of BASES){try{
 const gltf=await loader.loadAsync(base+name+'.glb');gltf.scene.traverse(o=>{if(o.isMesh)o.visible=false});scene.add(gltf.scene);const count=register(gltf.scene,name);return `${name}: ${count}構造`;
 }catch(err){errs.push((new URL(base)).hostname+': '+String(err.message||err).slice(0,80))}}
 throw Error(`${name}.glb — ${errs.join(' / ')}`)}
async function afterLoad(){flatten();assignMaterials();for(const btn of document.querySelectorAll('[data-muscle]')){if(!registered.has(btn.dataset.muscle)){btn.disabled=true;btn.dataset.state='off';btn.querySelector('small').textContent='未収録';}}const allBones=[...registered.keys()].filter(n=>category.get(n)==='bone');fullBox=new THREE.Box3();for(const nm of allBones){const b=worldBox(nm);if(b)fullBox.union(b)}
 prepareRig();modelLoaded=true;updateVisibility();setMode('anatomy');setFocus('body');
 $('loadOverlay').hidden=true;status('読込完了');diagnostics(`登録構造：${registered.size}、骨：${allBones.length}\n基準座標は未校正。\nスクリューホーム・膝蓋骨軌道は教育用の暫定模式挙動。`);
}
async function boot(){status('読込中');
 const results=await Promise.allSettled(assets.map(loadOne));
 const got=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const errs=results.filter(r=>r.status==='rejected').map(r=>String(r.reason));
 if(registered.has('Femur.r')&&registered.has('Tibia.r')){
  try{await afterLoad();diagnostics(got.join('\n')+'\n'+(errs.length?'取得できなかったモデル：\n'+errs.join('\n')+'\n':'')+$('diagnostics').textContent)}
  catch(e){status('初期化失敗');$('loadOverlay').innerHTML='<strong>3D初期化エラー</strong><small>診断欄を確認してください。</small>';diagnostics(String(e));console.error(e)}
 }else{
  status('読み込み失敗');$('loadOverlay').innerHTML='<strong>骨データを読み込めませんでした</strong><small>左パネルの診断欄で通信エラーを確認し、GLBを手動読み込みしてください。</small>';
  diagnostics(errs.join('\n')||'Femur.r / Tibia.r を検出できませんでした');
 }
}
$('manualFiles').addEventListener('change',async e=>{try{for(const f of e.target.files){const system=f.name.toLowerCase().replace(/\.glb$/,'');if(!assets.includes(system))continue;const gltf=await loader.parseAsync(await f.arrayBuffer(),'');gltf.scene.traverse(o=>{if(o.isMesh)o.visible=false});scene.add(gltf.scene);register(gltf.scene,system)}await afterLoad()}catch(err){diagnostics(String(err));console.error(err)}});
function tick(){requestAnimationFrame(tick);controls.update();renderer.render(scene,camera)}tick();boot();
