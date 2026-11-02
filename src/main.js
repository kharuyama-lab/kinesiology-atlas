import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KNEE,KNEE_REVIEW} from '../config/knee.js';
import {teachingLigamentTendency} from './kinematics.js';
import {muscleColors,hipLigamentColors} from './palette.js';
import {kneePose} from './joint-motion.js';
import {ligamentEngagement,ligamentAppearance} from './ligament-presentation.js';
import {TissueFollower} from './tissue-follow.js';
import {LigamentFollower,kneeLigamentBones} from './ligament-follow.js';
import {MeniscusFollower} from './meniscus-follow.js';
import {PatellaTracker} from './patella-track.js';
import {buildKneeContact} from './knee-contact.js';
import {advancePlayback,playbackSpeed} from './playback.js';
import {estimateCondyleAxis} from './knee-calibration.js';

import {tissues,tissueByName,nextVisibility,relevant,focusStates,englishName,japaneseName,bulkGroup} from './anatomy.js';

const $=id=>document.getElementById(id);const host=$('canvasHost');
const scene=new THREE.Scene();scene.background=new THREE.Color('#081320');
const camera=new THREE.PerspectiveCamera(38,1,.002,100000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;
scene.add(new THREE.HemisphereLight(0xcee5fc,0x425b77,2));
for(const [pos,intensity] of [[[4,7,8],2.05],[[-5,3,-7],1.2]]){let l=new THREE.DirectionalLight(0xffffff,intensity);l.position.set(...pos);scene.add(l)}
const loader=new GLTFLoader();const draco=new DRACOLoader();
draco.setDecoderPath(new URL('../vendor/three/draco/',import.meta.url).href);loader.setDRACOLoader(draco);
const localPreview=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const ligamentReview=new URLSearchParams(location.search).get('review')==='ligaments';
const boneReview=ligamentReview||new URLSearchParams(location.search).get('review')==='knee';
const axisTrial=boneReview&&new URLSearchParams(location.search).get('axis')==='condyle';
const coupledMotion=new URLSearchParams(location.search).get('motion')!=='fixed';
const kneeBasePosition=new THREE.Vector3();
// A femoral observation anchor: do not chase the translating tibia with the camera.
function kneeObservation(){return kneeBasePosition.clone().applyQuaternion(rig.hip.quaternion).add(rig.hip.position);}
const patellaTrial=axisTrial&&new URLSearchParams(location.search).get('patella')==='arc';
const BASES=[...(localPreview||new URLSearchParams(location.search).has('localModels')?['.cache/']:[]),'https://nqwrc.github.io/3d-anatomy/models/','https://raw.githubusercontent.com/nqwrc/3d-anatomy/master/public/models/'];
const assets=['skeletal','joints','muscular'];const modelSources=new Map(),liveRoots=[];const registered=new Map(),originalMaterials=new Map(),category=new Map(),meshInfo=new Map(),visibleStates=new Map();
let poseTarget=null;
let patellaState='on';
let boneState='on';
let renderedMeniscusActive=0;
const renderedAngles={flex:0,rot:0,valgus:0};let renderedScrew=0;
let mode='anatomy',focus='body',motion='flex',motionValue=90,activeSelection=null;
const motionValues={flex:90,rot:0,stress:0};
let playing=false,playDirection=1,modeTransition=false;
let hipWorldPoint=null,kneeWorldPoint=null,kneeModelReady=false,sideSign=1,fullBox=null,kneeScale=1,modelLoaded=false,patellaBasePosition=new THREE.Vector3();
let landmarkReview=null;
let condyleReview=null,activeFlexAxis=[1,0,0];
let kneeContactModel=null,renderedContact=null;
const tissueStates=focusStates('body');
const bulkStates={bone:'on',connective:'on',muscle:'on'};
const bodyStates=new Map();
const materialPalette={bone:0xe6e0d5,patella:0xe3ecf1,acl:0xec739b,pcl:0xb88add,mcl:0x53c9a3,lcl:0xf1b96b,meniscus:0x79b6df,muscle:0xc98283};
const rig={hip:new THREE.Group(),knee:new THREE.Group(),patella:new THREE.Group()};
const tissueFollower=new TissueFollower();
const ligamentFollower=new LigamentFollower();
const meniscusFollower=new MeniscusFollower();
const patellaTracker=new PatellaTracker();
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
 if(kind==='muscle')color=muscleColors[name];if(kind==='meniscus')color=materialPalette.meniscus;
 if(hipLigamentColors[name])color=hipLigamentColors[name];
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
 for(const name of registered.keys()){
  const kind=category.get(name);
  const state=focus==='body'?bodyStates.get(name)||'on':kind==='bone'?(boneState==='off'?'off':name==='Patella.r'?(patellaState==='off'?'off':boneState==='fade'||patellaState==='fade'?'fade':'on'):boneState):relevant(name,focus)?tissueStates.get(name)||'off':'off';
  visibility(name,state);
 }
 for(const button of document.querySelectorAll('[data-bulk]')){const group=button.dataset.bulk,states=new Set([...registered.keys()].filter(n=>bulkGroup(n,category.get(n))===group).map(n=>bodyStates.get(n)||'on'));const state=states.size>1?'mixed':[...states][0]||'on';bulkStates[group]=state;button.dataset.state=state;button.querySelector('small').textContent=state==='fade'?'Fade':state==='mixed'?'Mixed':state.toUpperCase();}
 for(const row of document.querySelectorAll('[data-body-tissue]')){const state=bodyStates.get(row.dataset.bodyTissue)||'on';row.dataset.state=state;row.querySelector('small').textContent=state==='fade'?'Fade':state.toUpperCase();}
 syncTissueUI();
 $('boneVisibility').dataset.state=boneState;$('boneVisibility').querySelector('small').textContent=boneState==='fade'?'Fade':boneState.toUpperCase();
 $('patellaVisibility').dataset.state=patellaState;$('patellaVisibility').querySelector('small').textContent=patellaState==='fade'?'Fade':patellaState.toUpperCase();
 if(activeSelection)highlightSelected(activeSelection);
}
function cycleTissue(name){tissueStates.set(name,nextVisibility(tissueStates.get(name)));updateVisibility();if(activeSelection)selectStructure(activeSelection,{showFloating:!$('floatingSelection').hidden});}
function cyclePatella(){patellaState=nextVisibility(focus==='body'?bodyStates.get('Patella.r')||'on':patellaState);bodyStates.set('Patella.r',patellaState);updateVisibility();if(activeSelection)selectStructure(activeSelection,{showFloating:!$('floatingSelection').hidden});}
$('patellaVisibility').addEventListener('click',cyclePatella);
$('boneVisibility').addEventListener('click',()=>{boneState=nextVisibility(boneState);updateVisibility();});
function cycleBulk(group){bulkStates[group]=nextVisibility(bulkStates[group]);
 for(const name of registered.keys())if(bulkGroup(name,category.get(name))===group)bodyStates.set(name,bulkStates[group]);
 for(const [name] of tissues)if(bulkGroup(name,category.get(name))===group)tissueStates.set(name,bulkStates[group]);
 updateVisibility();if(activeSelection)selectStructure(activeSelection,{showFloating:!$('floatingSelection').hidden});
}
function uiBodyLists(){for(const id of ['bodyBoneList','bodyConnectiveList','bodyMuscleList'])$(id).replaceChildren();
 const containers={bone:'bodyBoneList',connective:'bodyConnectiveList',muscle:'bodyMuscleList'};
 for(const [name,kind] of category){const row=document.createElement('button');row.type='button';row.dataset.bodyTissue=name;
  const title=document.createElement('span');title.textContent=(japaneseName(name)||englishName(name))+(kind==='bone'&&/\.[rl]$/.test(name)?(name.endsWith('.l')?'（左）':'（右）'):'');const state=document.createElement('small');row.append(title,state);
  const color=muscleColors[name]||hipLigamentColors[name];if(color)row.style.setProperty('--tissue-color','#'+color.toString(16).padStart(6,'0'));
  row.addEventListener('click',()=>{const value=nextVisibility(bodyStates.get(name)||'on');bodyStates.set(name,value);if(name==='Patella.r')patellaState=value;if(tissueByName.has(name))tissueStates.set(name,value);updateVisibility();if(activeSelection)selectStructure(activeSelection,{showFloating:!$('floatingSelection').hidden});});$(containers[bulkGroup(name,kind)]).append(row);
 }
}
function syncTissueUI(){for(const row of document.querySelectorAll('[data-tissue]')){
 const name=row.dataset.tissue;row.hidden=!relevant(name,focus);row.dataset.state=tissueStates.get(name)||'off';
 row.querySelector('small').textContent=registered.has(name)?(row.dataset.state==='fade'?'Fade':row.dataset.state.toUpperCase()):'Unavailable';
 row.disabled=!registered.has(name);
}}
// Fade only when left geometry overlaps the right skeleton in screen space and is nearer.
// Skeleton meshes remain in the scene and visible throughout.
const skeletonBounds=new Map();
const jointSurfaces={femur:[],tibia:[]};
function captureJointSurfaces(){for(const [key,name,proximal] of [['femur','Femur.r',false],['tibia','Tibia.r',true]]){
 const box=worldBox(name),cut=(box.max.y-box.min.y)*.2,vertices=[];
 for(const mesh of getMeshes(name)){mesh.updateWorldMatrix(true,false);const p=new THREE.Vector3(),a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);if(proximal?p.y>=box.max.y-cut:p.y<=box.min.y+cut)vertices.push({mesh,index:i});}}
 const step=Math.max(1,Math.ceil(vertices.length/600));jointSurfaces[key]=vertices.filter((_,i)=>i%step===0);
}}
function fadeLeftSkeleton(){
 const projectBox=name=>{const bounds=skeletonBounds.get(name);if(!bounds)return null;const root=registered.get(name);root.updateWorldMatrix(true,false);
  const pts=bounds.map(v=>v.clone().applyMatrix4(root.matrixWorld).project(camera));
  return {x0:Math.min(...pts.map(p=>p.x)),x1:Math.max(...pts.map(p=>p.x)),y0:Math.min(...pts.map(p=>p.y)),y1:Math.max(...pts.map(p=>p.y)),z:pts.reduce((v,p)=>v+p.z,0)/8};};
 const right=[...skeletonBounds.keys()].filter(n=>n.endsWith('.r')&&visibleStates.get(n)!=='off').map(projectBox).filter(Boolean);
 for(const name of skeletonBounds.keys()){if(!name.endsWith('.l'))continue;const l=projectBox(name);
  const overlap=right.some(r=>l.z<r.z&&l.x0<r.x1&&l.x1>r.x0&&l.y0<r.y1&&l.y1>r.y0);
  const mat=originalMaterials.get(name),fade=overlap||visibleStates.get(name)==='fade';mat.opacity=fade?.3:1;mat.transparent=fade;mat.depthWrite=!fade;
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
  // Independent review candidate only. A mesh-end centroid is NOT a validated attachment.
  // Keep the current pivot unchanged until anatomical review; export the comparison for QA.
  const medial=nearBoneEnd('Superficial part of tibial collateral ligament.r',.2,true);
  const lateral=nearBoneEnd('Fibular collateral ligament.r',.2,true);
  if(medial&&lateral){const candidate=medial.clone().lerp(lateral,.5),flexAxis=medial.clone().sub(lateral).normalize();if(flexAxis.x<0)flexAxis.negate();
   const tibialAxis=tibProx.clone().sub(nearBoneEnd('Tibia.r',.11,false)).normalize();
   landmarkReview={status:'REVIEW ONLY — mesh-end estimates',method:'proximal 20% centroids of superficial MCL and LCL meshes',medial:medial.toArray(),lateral:lateral.toArray(),center:candidate.toArray(),flexAxis:flexAxis.toArray(),tibialAxis:tibialAxis.toArray(),distanceFromCurrent:candidate.distanceTo(k)};
  }else landmarkReview=null;
  const points=[];for(const mesh of getMeshes('Femur.r')){const a=mesh.geometry.attributes.position;mesh.updateWorldMatrix(true,false);for(let i=0;i<a.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).toArray());}
  condyleReview=estimateCondyleAxis(points);activeFlexAxis=[1,0,0];if(condyleReview)condyleReview.previousCenter=k.toArray();
  if(axisTrial){if(!condyleReview)throw Error('Condyle trial could not be estimated');k.fromArray(condyleReview.center);activeFlexAxis=[...condyleReview.flexAxis];}
  if(!condyleReview)throw Error('Condylar geometry unavailable for contact review');
  kneeContactModel=buildKneeContact(points,k,activeFlexAxis,condyleReview);
  hipWorldPoint=h.clone();kneeWorldPoint=k.clone();sideSign=Math.sign(fem.getCenter(new THREE.Vector3()).x-(worldBox('Femur.l')?.getCenter(new THREE.Vector3()).x||0))||1;
  const bsize=fem.getSize(new THREE.Vector3());kneeScale=Math.max(bsize.x,bsize.y*.20,bsize.z);
  rig.hip.position.copy(h);rig.hip.quaternion.identity();rig.hip.updateWorldMatrix(true,true);
  for(const name of ['Femur.r','Tibia.r','Fibula.r','Patella.r']){
    const o=registered.get(name);if(o)rig.hip.attach(o);
  }
  scene.add(rig.knee);rig.knee.position.copy(k);rig.hip.attach(rig.knee);
  kneeBasePosition.copy(rig.knee.position);
  for(const name of ['Tibia.r','Fibula.r']){const obj=registered.get(name);if(obj)rig.knee.attach(obj)}
  // Keep the entire right distal skeleton attached to the tibia.
  for(const [name,kind] of category){if(kind==='bone'&&name.endsWith('.r')&&!['Tibia.r','Fibula.r','Patella.r','Femur.r'].includes(name)){
    const box=worldBox(name);if(box&&box.max.y<tib.min.y+kneeScale*.2)rig.knee.attach(registered.get(name));
  }}
  for(const [name,,kind,joints] of tissues)if(kind==='ligament'&&joints==='knee'&&registered.has(name))rig.hip.attach(registered.get(name));
  // Tibia is the support frame; the separate follower supplies relative excursion.
  for(const name of ['Medial meniscus.r','Lateral meniscus.r']){const obj=registered.get(name);if(obj)rig.knee.attach(obj)}
  scene.add(rig.patella);rig.patella.position.copy(k);rig.hip.attach(rig.patella);
  if(registered.get('Patella.r'))rig.patella.attach(registered.get('Patella.r'));
  patellaBasePosition.copy(rig.patella.position);
  patellaTracker.prepare({getMeshes,knee:rig.knee,flexAxis:activeFlexAxis});
  scene.add(axisGroup);axisGroup.position.copy(k);rig.hip.attach(axisGroup);

  meniscusFollower.prepare({getMeshes,knee:rig.knee,referenceContacts:kneeContactModel.profiles});
  buildAxis();kneeModelReady=true;updatePose();
  diagnostics('Provisional hip and knee centers. Tissue motion is uncalibrated.');
}
const axisReference=new THREE.Group();rig.hip.add(axisReference);
// Central shaft bands exclude the femoral head and articular ends.
function shaftGuide(name,parent){
 const points=[];for(const mesh of getMeshes(name)){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));}
 const lo=Math.min(...points.map(p=>p.y)),hi=Math.max(...points.map(p=>p.y)),length=hi-lo;
 const centroid=f=>{const band=points.filter(p=>Math.abs((p.y-lo)/length-f)<.06);return band.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/band.length);};
 const low=centroid(.32),high=centroid(.68),direction=high.clone().sub(low).normalize();
 return [parent.worldToLocal(low.clone().addScaledVector(direction,-length*.4)),parent.worldToLocal(high.clone().addScaledVector(direction,length*.28))];
}
function buildAxis(){axisReference.clear();axisGroup.clear();const l=Math.max(kneeScale*1.35,.001);

 const line=(group,name,points,color,dashed=false)=>{const mat=dashed?new THREE.LineDashedMaterial({color,dashSize:kneeScale*.045,gapSize:kneeScale*.025,depthTest:false,depthWrite:false}):new THREE.LineBasicMaterial({color,depthTest:false,depthWrite:false});const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat);o.name=name;o.computeLineDistances();o.renderOrder=60;group.add(o);};

 // Fixed femoral condylar reference: projected onto the floor plane.
 const ml=new THREE.Vector3(...activeFlexAxis);ml.y=0;ml.normalize();
 const shaft=shaftGuide('Tibia.r',rig.knee),si=shaft[1].clone().sub(shaft[0]).normalize();
 const tibML=ml.clone().addScaledVector(si,-ml.dot(si)).normalize();
 const ap=new THREE.Vector3().crossVectors(tibML,si).normalize();
 // The motion pivot lies in the femoral condyles; the display triad belongs
 // at the proximal tibia, with that offset rotated together with the bone.
 const tibialOrigin=rig.knee.worldToLocal(nearBoneEnd('Tibia.r',.08,true));
 const tibialThrough=(direction,extent)=>through(direction,extent).map(p=>p.add(tibialOrigin));
 const through=(direction,extent)=>[direction.clone().multiplyScalar(-extent),direction.clone().multiplyScalar(extent)];
 line(axisGroup,'SI tibia',tibialThrough(si,l*.85),0x75d69c);
 line(axisGroup,'ML tibia',tibialThrough(tibML,l*.7),0x65caff);
 line(axisGroup,'AP tibia',tibialThrough(ap,l*.55),0xffbd72);
 line(axisReference,'SI femur',shaftGuide('Femur.r',rig.hip),0x75d69c,true);
 line(axisReference,'ML femur',through(ml,l*.7).map(p=>p.add(kneeBasePosition)),0x65caff,true);

}
function updatePose(){if(!kneeModelReady)return;
 const moving=mode==='kinesiology'&&focus==='knee';
 const pose=kneePose(motion,motionValue,sideSign,{anatomy:!moving,flexAxis:activeFlexAxis,coupled:coupledMotion,contactModel:kneeContactModel});const flex=pose.angles.flex;
 if(moving&&!patellaTrial)$('stageBadge').textContent=coupledMotion?'Mesh contact · Under review':'Fixed axis · Comparison';
 const patellar=patellaTracker.pose(flex),patellaPosition=patellaBasePosition.clone().add(patellar.translation);
 const patellaRotation=patellar.rotation;
 if(patellaTrial){patellaPosition.copy(patellaBasePosition);patellaRotation.setFromAxisAngle(new THREE.Vector3(...activeFlexAxis),flex*KNEE_REVIEW.patellaArcFraction*Math.PI/180);}
 poseTarget={hip:pose.hip,knee:pose.knee,kneePosition:kneeBasePosition.clone().add(pose.translation),angles:pose.angles,screw:pose.coupledAxial,instantaneous:pose.instantaneous,extrapolated:pose.extrapolated,patella:patellaPosition,patellaRotation};
 const axisOn=$('axisToggle').checked;
 $('axisVisibility').dataset.state=axisOn?'on':'off';$('axisVisibility').querySelector('small').textContent=axisOn?'ON':'OFF';$('axisVisibility').setAttribute('aria-pressed',String(axisOn));
 axisGroup.visible=axisOn&&moving;
 axisReference.visible=axisOn&&moving;
 if(!boneReview){const p=teachingLigamentTendency(motion,motionValue);
 const markup=['mcl','lcl','acl','pcl'].map(key=>`<div class="ligItem"><strong>${key.toUpperCase()}</strong><span>${({'強調':'Emphasized','通常':'Baseline','角度依存':'Angle dependent','弛緩傾向':'Reduced restraint'})[p[key]]||'Baseline'}</span></div>`).join('');if($('ligamentStatus').innerHTML!==markup)$('ligamentStatus').innerHTML=markup;}
 const shown=Math.round(motionValue);
 $('angleReadout').textContent=motion==='stress'?(motionValue<0?'内反 / Varus ':motionValue>0?'外反 / Valgus ':'Neutral ')+Math.abs(shown)+'°':
  motion==='rot'?(motionValue<0?'内旋 / Internal ':motionValue>0?'外旋 / External ':'Neutral ')+Math.abs(shown)+'°':`${Math.round(flex)}°`;
}
function frame(target,extent){const d=Math.max(extent,.02);controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(d*.5,d*.32,d*2.45));camera.near=Math.max(.0001,d/1500);camera.far=Math.max(1000,d*200);camera.updateProjectionMatrix();controls.update()}
function frameFocus(f=focus){if(!modelLoaded)return;
 if(f==='body'&&fullBox){const d=fullBox.getSize(new THREE.Vector3()).length();frame(hipWorldPoint,d*.65);return;}
 if(f==='knee'&&kneeWorldPoint){frame(kneeModelReady?kneeObservation():kneeWorldPoint,kneeScale*3.1);return;}
 if(f==='hip'&&hipWorldPoint){frame(hipWorldPoint,kneeScale*4.2);return;}
}
function setFocus(f){focus=f;renderedMeniscusActive=mode==='kinesiology'&&f==='knee'?1:0;activeSelection=null;$('selectedStructure').textContent='Click a structure';$('floatingSelection').hidden=true;
 for(const el of document.querySelectorAll('[data-focus]'))el.classList.toggle('selected',el.dataset.focus===f);
 for(const [name,state] of focusStates(f))tissueStates.set(name,boneReview&&f!=='body'?(category.get(name)==='meniscus'||ligamentReview&&name in kneeLigamentBones?'on':'off'):state);
 if(f==='body'){boneState='on';patellaState='on';bodyStates.clear();for(const name of registered.keys())bodyStates.set(name,'on');Object.assign(bulkStates,{bone:'on',connective:'on',muscle:'on'});document.querySelectorAll('[data-body-details]').forEach(el=>el.open=false);Object.assign(motionValues,{flex:90,rot:0,stress:0});setMotion('flex');}
 updateModeUI();updatePose();updateVisibility();
 // Focus is an intentional framing operation; frame the target pose rather than an intermediate tween.
 if(poseTarget){Object.assign(renderedAngles,poseTarget.angles);renderedScrew=poseTarget.screw;rig.hip.quaternion.copy(poseTarget.hip);rig.knee.quaternion.copy(poseTarget.knee);rig.knee.position.copy(poseTarget.kneePosition);rig.patella.position.copy(poseTarget.patella);rig.patella.quaternion.copy(poseTarget.patellaRotation);modeTransition=false;scene.updateMatrixWorld(true);}
 frameFocus(f);
}
function setPlaying(value){playing=value;if(value&&poseTarget&&(rig.hip.quaternion.angleTo(poseTarget.hip)>.001||rig.knee.quaternion.angleTo(poseTarget.knee)>.001))modeTransition=true;$('playMotion').textContent=value?'Pause':'Auto';$('playMotion').setAttribute('aria-pressed',String(value));}
function setMotion(m){setPlaying(false);playDirection=1;motion=m;motionValue=motionValues[m];
 for(const el of document.querySelectorAll('[data-motion]'))el.classList.toggle('selected',el.dataset.motion===m);
 const sl=$('motionSlider');const ranges={flex:[...KNEE.flexionRange,90,'伸展 / Extension 0°',`屈曲 / Flexion ${KNEE.flexionRange[1]}°`],rot:[-15,30,0,'内旋 / Internal 15°','外旋 / External 30°'],stress:[-3,3,0,'内反 / Varus 3°','外反 / Valgus 3°']};
 const v=ranges[m];sl.min=v[0];sl.max=v[1];sl.step='.1';sl.value=motionValue;$('negativeLabel').textContent=v[3];$('positiveLabel').textContent=v[4];updatePose()}
function updateModeUI(){
 const moving=mode==='kinesiology';
 $('bodyDisplay').hidden=focus!=='body';$('patellaDisplay').hidden=focus!=='knee';document.querySelectorAll('.jointDisplay').forEach(el=>el.hidden=focus==='body'||boneReview);
 if(ligamentReview&&focus==='knee')$('ligamentList').parentElement.hidden=false;
 $('ligamentTendency').hidden=boneReview;$('axisLabel').textContent='Axes';$('axisLabel').title='Femur: fixed shaft and horizontal condylar reference (dashed). Tibia: three axes sharing one origin (solid). Shaft estimates; FTA is not calibrated.';
 $('motionSection').hidden=!(moving&&focus==='knee');
 $('playMotion').hidden=!(moving&&focus==='knee');
 $('sectionEyebrow').textContent=moving?'MODE 2':'MODE 1';
 $('sectionTitle').textContent=({body:'Whole Body',hip:'股関節 / Hip',knee:'膝関節 / Knee'})[focus];
 $('stageBadge').textContent=moving?(focus==='knee'?(patellaTrial?'Patella arc test · Rejected':coupledMotion?'Roll + slide · Reference trajectory':'Fixed axis · Comparison'):'Joint Kinesiology · Movement pending calibration'):'Anatomy';
}
function setMode(m){if(mode===m)return;mode=m;modeTransition=true;
 for(const el of document.querySelectorAll('[data-mode]'))el.classList.toggle('selected',el.dataset.mode===m);
 updateModeUI();updatePose();
 // Deliberately preserve camera, focus, selection, tissue states and common UI.
}
function setView(v){if(!modelLoaded)return;const target=controls.target.clone(),d=Math.max(camera.position.distanceTo(target),.01);
 const dirs={front:[0,0,1],back:[0,0,-1],lateral:[sideSign,0,0],medial:[-sideSign,0,0],iso:[sideSign*.8,.4,1]};camera.position.copy(target).add(new THREE.Vector3(...dirs[v]).normalize().multiplyScalar(d));camera.up.set(0,1,0);controls.update();}
function uiMuscleList(){for(const [name,jp,kind] of tissues){
 const b=document.createElement('button');b.type='button';b.dataset.tissue=name;
 const title=document.createElement('span');title.textContent=jp;const state=document.createElement('small');b.append(title,state);
 const color=muscleColors[name]||hipLigamentColors[name];if(color)b.style.setProperty('--tissue-color','#'+color.toString(16).padStart(6,'0'));
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
  if(name==='Patella.r'||focus==='body'||category.get(name)!=='bone'){const button=document.createElement('button');const group=bulkGroup(name,category.get(name)),state=name==='Patella.r'?(focus==='body'?bodyStates.get(name)||'on':patellaState):focus==='body'?bulkStates[group]:tissueStates.get(name)||'off';button.textContent=(focus==='body'&&name!=='Patella.r'?'All · ':'')+(state==='fade'?'Fade':state.toUpperCase());button.addEventListener('click',()=>name==='Patella.r'?cyclePatella():focus==='body'?cycleBulk(group):cycleTissue(name));el.append(button);}
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
for(const b of document.querySelectorAll('[data-bulk]'))b.addEventListener('click',()=>cycleBulk(b.dataset.bulk));
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));
for(const b of document.querySelectorAll('[data-focus]'))b.addEventListener('click',()=>setFocus(b.dataset.focus));
for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>setView(b.dataset.view));
for(const b of document.querySelectorAll('[data-motion]'))b.addEventListener('click',()=>setMotion(b.dataset.motion));
$('axisToggle').addEventListener('change',updatePose);
$('axisVisibility').addEventListener('click',()=>{$('axisToggle').checked=!$('axisToggle').checked;updatePose();});
$('motionSlider').addEventListener('input',e=>{setPlaying(false);motionValue=+e.target.value;motionValues[motion]=motionValue;updatePose()});
$('playMotion').addEventListener('click',()=>setPlaying(!playing));
$('resetPose').addEventListener('click',()=>{motionValues[motion]=motion==='flex'?90:0;setMotion(motion)});
$('mobilePanel').addEventListener('click',()=>{$('sidebar').classList.toggle('collapsed');size()});
if(matchMedia('(max-width:740px)').matches)$('sidebar').classList.add('collapsed');
async function loadOne(name){const errs=[];for(const base of BASES){try{
 const url=new URL(base+name+'.glb',location.href),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let response;
 try{response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);var data=await response.arrayBuffer();}finally{clearTimeout(timer);}
 let decodeTimer;const gltf=await Promise.race([loader.parseAsync(data,new URL('.',url).href),new Promise((_,reject)=>{decodeTimer=setTimeout(()=>reject(Error('Model decoding timed out')),15000);})]).finally(()=>clearTimeout(decodeTimer));
 modelSources.set(name,gltf.scene);return name+': loaded';
 }catch(err){errs.push((new URL(base,location.href)).hostname+': '+String(err.message||err).slice(0,80))}}
 throw Error(`${name}.glb — ${errs.join(' / ')}`)}
async function afterLoad(){
 // Rebuild from pristine sources so manual retries cannot accumulate rotations or duplicate meshes.
 poseTarget=null;modelLoaded=false;kneeModelReady=false;tissueFollower.clear();ligamentFollower.clear();meniscusFollower.clear();
 for(const obj of registered.values())obj.removeFromParent();for(const root of liveRoots)root.removeFromParent();liveRoots.length=0;
 for(const m of originalMaterials.values())m.dispose();
 registered.clear();originalMaterials.clear();category.clear();meshInfo.clear();visibleStates.clear();skeletonBounds.clear();
 rig.hip.quaternion.identity();rig.knee.quaternion.identity();rig.patella.quaternion.identity();
 for(const [sys,source] of modelSources){const root=source.clone(true);root.traverse(o=>{if(o.isMesh)o.visible=false});scene.add(root);liveRoots.push(root);register(root,sys);}
 if(!registered.has('Femur.r')||!registered.has('Tibia.r'))throw Error('Femur.r / Tibia.r not found');
 flatten();assignMaterials();const allBones=[...registered.keys()].filter(n=>category.get(n)==='bone');fullBox=new THREE.Box3();for(const nm of allBones){const b=worldBox(nm);if(b)fullBox.union(b)}
 prepareRig();scene.updateMatrixWorld(true);captureJointSurfaces();ligamentFollower.prepare({getMeshes,bones:{femur:registered.get('Femur.r'),'Tibia.r':registered.get('Tibia.r'),'Fibula.r':registered.get('Fibula.r')}});tissueFollower.prepare({tissues,getMeshes,hipCenter:hipWorldPoint,kneeCenter:kneeWorldPoint});uiBodyLists();modelLoaded=true;
 for(const name of allBones){const root=registered.get(name);root.updateWorldMatrix(true,true);const box=new THREE.Box3();
  for(const mesh of getMeshes(name)){mesh.geometry.computeBoundingBox();const mb=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);box.union(mb);}
  const inv=root.matrixWorld.clone().invert();const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).applyMatrix4(inv));skeletonBounds.set(name,corners);
 }
 updateVisibility();setFocus('body');
 if(boneReview){setFocus('knee');setMode('kinesiology');$('axisToggle').checked=true;updatePose();setView('lateral');}
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
 const advancing=playing&&!modeTransition&&mode==='kinesiology'&&focus==='knee'&&modelLoaded;
 if(advancing){const slider=$('motionSlider'),next=advancePlayback(motionValue,playDirection,dt,+slider.min,+slider.max,playbackSpeed[motion]);motionValue=next.value;playDirection=next.direction;motionValues[motion]=motionValue;slider.value=motionValue;updatePose();}
 if(poseTarget){const before=kneeObservation();const t=1-Math.exp(-dt*10);rig.hip.quaternion.slerp(poseTarget.hip,t);
  // Interpolate angles, then re-evaluate the coupled path; never interpolate
  // translations independently of rotation or show a target axis on a lagging bone.
  for(const key of ['flex','rot','valgus'])renderedAngles[key]+= (poseTarget.angles[key]-renderedAngles[key])*(advancing?1:t);
  renderedScrew+=(poseTarget.screw-renderedScrew)*(advancing?1:t);
  const drawn=kneePose(motion,motionValue,sideSign,{flexAxis:activeFlexAxis,coupled:coupledMotion,anglesOverride:renderedAngles,coupledRotationOverride:renderedScrew,contactModel:kneeContactModel});renderedContact=drawn;
  rig.knee.quaternion.copy(drawn.knee);rig.knee.position.copy(kneeBasePosition).add(drawn.translation);
  const neutral=Math.abs(renderedAngles.rot)+Math.abs(renderedAngles.valgus)<1e-8?drawn:kneePose(motion,motionValue,sideSign,{flexAxis:activeFlexAxis,coupled:coupledMotion,anglesOverride:{flex:renderedAngles.flex,rot:0,valgus:0},coupledRotationOverride:renderedScrew,contactModel:kneeContactModel,diagnostic:false});
  renderedMeniscusActive+=((mode==='kinesiology'&&focus==='knee'?1:0)-renderedMeniscusActive)*(advancing?1:t);
  meniscusFollower.update(renderedAngles.flex,{pose:drawn,neutral,active:renderedMeniscusActive});
  if(!patellaTrial){const p=patellaTracker.pose(renderedAngles.flex);rig.patella.position.copy(patellaBasePosition).add(p.translation);rig.patella.quaternion.copy(p.rotation);}else{rig.patella.position.lerp(poseTarget.patella,t);rig.patella.quaternion.slerp(poseTarget.patellaRotation,t);}axisGroup.position.copy(rig.knee.position);axisGroup.quaternion.copy(rig.knee.quaternion);

  // Follow the moving right knee without changing the user's viewing direction, zoom or pan offset.
  if(modelLoaded&&focus==='knee'){const delta=kneeObservation().sub(before);camera.position.add(delta);controls.target.add(delta);}
  if(modeTransition&&rig.hip.quaternion.angleTo(poseTarget.hip)<.001&&rig.knee.quaternion.angleTo(poseTarget.knee)<.001&&rig.knee.position.distanceTo(poseTarget.kneePosition)<.00001)modeTransition=false;
 }
 tissueFollower.update(rig.hip.quaternion,rig.knee.quaternion,now);controls.update();scene.updateMatrixWorld(true);ligamentFollower.update({active:mode==='kinesiology'&&focus==='knee'});updateLigamentPresentation(now);fadeLeftSkeleton();renderer.render(scene,camera);
}tick();boot();
// Read-only QA snapshot, opt in locally with ?qa; no remote controls.
if(new URLSearchParams(location.search).has('qa'))window.atlasQA=()=>({mode,focus,patellaState,patellaNDC:worldBox('Patella.r')?.getCenter(new THREE.Vector3()).project(camera).toArray(),renderedMeniscusActive,contactStatus:kneeContactModel?.status,contacts:renderedContact?.contacts,menisci:meniscusFollower.snapshot(),coupledAxial:renderedScrew,renderedAngles:{...renderedAngles},coupledMotion,kneeTranslation:rig.knee.position.clone().sub(kneeBasePosition).toArray(),instantaneous:renderedContact?.instantaneous,extrapolated:poseTarget?.extrapolated,axisTrial,patellaTrial,condyleReview,activeFlexAxis:[...activeFlexAxis],patellaRotation:rig.patella.quaternion.toArray(),patellaCenter:worldBox('Patella.r')?.getCenter(new THREE.Vector3()).toArray(),playing,playDirection,followers:tissueFollower.snapshot(),bodyStates:Object.fromEntries(bodyStates),bulkStates:{...bulkStates},landmarkReview,landmarkNDC:landmarkReview?new THREE.Vector3(...landmarkReview.center).sub(hipWorldPoint).applyQuaternion(rig.hip.quaternion).add(hipWorldPoint).project(camera).toArray():null,motion,motionValue,motionValues:{...motionValues},calibration:{status:KNEE.status,hipCenter:hipWorldPoint?.toArray(),kneeCenter:kneeWorldPoint?.toArray(),axes:{flex:[...activeFlexAxis],axial:[0,1,0],stress:[0,0,1]},sideSign},camera:camera.position.toArray(),target:controls.target.toArray(),states:Object.fromEntries(tissueStates),tissueMeshes:tissues.map(([n])=>({name:n,group:bulkGroup(n,category.get(n)),color:originalMaterials.get(n)?.color.getHex(),count:getMeshes(n).length,visible:getMeshes(n).every(m=>m.visible),opacity:originalMaterials.get(n)?.opacity})),focusNDC:(focus==='knee'?kneeObservation():hipWorldPoint?.clone())?.project(camera).toArray(),bones:[...category].filter(([,k])=>k==='bone').map(([n])=>({name:n,group:bulkGroup(n,category.get(n)),visible:getMeshes(n).every(m=>m.visible),opacity:originalMaterials.get(n).opacity})),registered:[...registered.keys()],hip:rig.hip.quaternion.toArray(),knee:rig.knee.quaternion.toArray()});

if(new URLSearchParams(location.search).has('qa'))window.atlasSurfaceQA=()=>Object.fromEntries(Object.entries(jointSurfaces).map(([key,vertices])=>[key,vertices.map(({mesh,index})=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index).applyMatrix4(mesh.matrixWorld).toArray())]));
if(new URLSearchParams(location.search).has('qa'))window.atlasMeshQA=name=>{
 if(!['Femur.r','Tibia.r','Fibula.r','Patella.r','Medial meniscus.r','Lateral meniscus.r',...Object.keys(kneeLigamentBones)].includes(name))return null;
 return getMeshes(name).map(mesh=>{mesh.updateWorldMatrix(true,false);const positions=[],a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)positions.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).toArray());return {positions,indices:mesh.geometry.index?Array.from(mesh.geometry.index.array):null};});
};

if(new URLSearchParams(location.search).has('qa'))window.atlasContactQA=()=>kneeContactModel;
if(new URLSearchParams(location.search).has('qa'))window.atlasTrackingQA=()=>patellaTracker.snapshot();
if(new URLSearchParams(location.search).has('qa'))window.atlasMeniscusSupportQA=()=>({surface:meniscusFollower.surface,entries:meniscusFollower.entries.map(e=>({name:e.name,points:e.points.map(p=>p.toArray()),offsets:e.offsets,loadWeights:e.loadWeights}))});

if(new URLSearchParams(location.search).has('qa'))window.atlasAxisQA=()=>({visible:axisGroup.visible&&axisReference.visible,names:[...axisGroup.children,...axisReference.children].map(o=>o.name),segments:[...axisGroup.children,...axisReference.children].map(o=>{const a=o.geometry.attributes.position;return [0,1].map(i=>o.localToWorld(new THREE.Vector3().fromBufferAttribute(a,i)).toArray())}),directions:[...axisGroup.children,...axisReference.children].map(o=>{const a=o.geometry.attributes.position;return new THREE.Vector3().fromBufferAttribute(a,1).sub(new THREE.Vector3().fromBufferAttribute(a,0)).normalize().applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion())).toArray()})});

if(new URLSearchParams(location.search).has('qa'))window.atlasLigamentQA=()=>({entries:ligamentFollower.snapshot(),bindings:ligamentFollower.entries.map(e=>({name:e.name,proximal:e.pinned.proximal.map(i=>({index:i,expected:e.rest[i].clone().applyMatrix4(e.femur.matrixWorld).toArray()})),distal:e.pinned.distal.map(i=>({index:i,expected:e.rest[i].clone().applyMatrix4(e.femRest).applyMatrix4(e.distalRestInverse).applyMatrix4(e.distal.matrixWorld).toArray()}))}))});

function updateLigamentPresentation(now){
 const active=mode==='kinesiology'&&focus==='knee',scores=ligamentEngagement(renderedAngles);
 for(const name of Object.keys(kneeLigamentBones)){
  const mat=originalMaterials.get(name);if(!mat)continue;
  const key=name.startsWith('Anterior')?'acl':name.startsWith('Posterior')?'pcl':name.startsWith('Fibular')?'lcl':'mcl',base=new THREE.Color(materialPalette[key]),state=visibleStates.get(name);
  mat.color.copy(base);mat.emissive.setHex(0);mat.emissiveIntensity=0;
  if(active&&state!=='off'){
   const entry=ligamentFollower.entries.find(e=>e.name===name);
   const recruitment=(key==='mcl'||key==='lcl')&&entry?Math.max(0,Math.min(1,1-Math.max(0,entry.restSpan-entry.span)/(entry.restSpan*.08))):1;
   const appearance=ligamentAppearance(Math.min(scores[key],recruitment),now,state);
   mat.color.lerp(new THREE.Color(0xe0e7ed),appearance.paleness);mat.opacity=appearance.opacity;mat.transparent=mat.opacity<.995;mat.depthWrite=mat.opacity>.96;
   mat.emissive.copy(base);mat.emissiveIntensity=appearance.glow;
  }else{mat.opacity=state==='fade'?.3:1;mat.transparent=state==='fade';mat.depthWrite=state!=='fade';}
  if(activeSelection===name&&state!=='off'){mat.emissive.lerp(new THREE.Color(0x2e7baa),.12);mat.emissiveIntensity+=.065;}
 }
}
if(new URLSearchParams(location.search).has('qa'))window.atlasPresentationQA=()=>({boneState,scores:ligamentEngagement(renderedAngles),materials:Object.fromEntries(Object.keys(kneeLigamentBones).map(name=>{const m=originalMaterials.get(name);return [name,{opacity:m?.opacity,color:m?.color.toArray(),glow:m?.emissiveIntensity,visible:getMeshes(name).some(mesh=>mesh.visible)}];}))});

if(new URLSearchParams(location.search).has('qa'))window.atlasLigamentGeometryQA=()=>ligamentFollower.entries.map(e=>({name:e.name,proximal:e.proximal.toArray(),distal:e.distalPoint.toArray(),stations:e.stations,rest:e.rest.map(p=>p.toArray()),femRest:e.femRest.toArray(),distalRestInverse:e.distalRestInverse.toArray(),femWorld:e.femur.matrixWorld.toArray(),distalWorld:e.distal.matrixWorld.toArray()}));
