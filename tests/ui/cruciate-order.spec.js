import {test,expect} from '@playwright/test';
import {Vector3,Quaternion,Mesh,BufferGeometry,Float32BufferAttribute,MeshBasicMaterial,DoubleSide,Raycaster} from 'three';
import {writeFileSync} from 'node:fs';
const names=['Anterior cruciate ligament.r','Posterior cruciate ligament.r'];
function audit(data){
 const inverse=new Quaternion(...data.state.hip).multiply(new Quaternion(...data.state.knee)).invert();
 const meshes=data.meshes.map((m,i)=>{
  const bindings=data.bindings.find(b=>b.name===names[i]),pinned=new Set([...bindings.proximal,...bindings.distal].map(v=>v.index)),indices=m.indices||m.positions.map((_,i)=>i),body=[];
  for(let j=0;j<indices.length;j+=3)if(indices.slice(j,j+3).every(i=>!pinned.has(i)))body.push(...indices.slice(j,j+3));
  const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(m.positions.flatMap(p=>new Vector3(...p).applyQuaternion(inverse).toArray()),3)).setIndex(body);geometry.computeBoundingBox();
  return new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));
 });
 const [a,b]=meshes.map(m=>m.geometry.boundingBox),loX=Math.max(a.min.x,b.min.x),hiX=Math.min(a.max.x,b.max.x),loY=Math.max(a.min.y,b.min.y),hiY=Math.min(a.max.y,b.max.y),ray=new Raycaster();
 let overlap=0,pclAhead=0,minGap=Infinity;
 for(let x=1;x<40;x++)for(let y=1;y<40;y++){
  ray.set(new Vector3(loX+(hiX-loX)*x/40,loY+(hiY-loY)*y/40,Math.max(a.max.z,b.max.z)+1),new Vector3(0,0,-1));
  const acl=ray.intersectObject(meshes[0]),pcl=ray.intersectObject(meshes[1]);if(!acl.length||!pcl.length)continue;
  const gap=pcl[0].distance-acl[0].distance;overlap++;if(gap<0)pclAhead++;minGap=Math.min(minGap,gap);
 }
 for(const m of meshes){m.geometry.dispose();m.material.dispose();}
 return {overlap,pclAhead,minGap};
}
test('ACL is anterior at the cruciate body crossing in Anatomy and flexed poses; source attachment centres fixed',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const report=[];
 for(const [mode,motion,value] of [['anatomy','flex',0],['kinesiology','flex',0],['kinesiology','flex',30],['kinesiology','flex',60],['kinesiology','flex',90],['kinesiology','flex',120],['kinesiology','rot',-15],['kinesiology','rot',30]]){
  await page.locator('[data-mode="'+mode+'"]').click();if(mode==='kinesiology'){await page.locator('[data-motion="'+motion+'"]').click();await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}
  await page.locator('[data-focus="knee"]').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const data=await page.evaluate(()=>({state:window.atlasQA(),bindings:window.atlasLigamentQA().bindings,meshes:['Anterior cruciate ligament.r','Posterior cruciate ligament.r'].map(n=>window.atlasMeshQA(n)[0])}));
  const result=audit(data);report.push({mode,motion,value,...result});expect(result.overlap).toBeGreaterThan(10);expect(result.pclAhead).toBe(0);
  for(let i=0;i<2;i++){const b=data.bindings.find(e=>e.name===names[i]);for(const {index,expected} of [...b.proximal,...b.distal])expect(new Vector3(...data.meshes[i].positions[index]).distanceTo(new Vector3(...expected))).toBeLessThan(1e-8);}
  if(mode==='anatomy'||motion==='flex'&&[0,90].includes(value)){
   await page.locator('#boneVisibility').click();await page.locator('#boneVisibility').click();while((await page.evaluate(()=>window.atlasQA())).patellaState!=='off')await page.locator('#patellaVisibility').click();await page.locator('[data-view="front"]').click();await page.mouse.move(1100,600);for(let i=0;i<34;i++)await page.mouse.wheel(0,-100);
   if(mode==='kinesiology'&&value===0){const box=await page.locator('#canvasHost').boundingBox();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.25);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.50,{steps:12});await page.mouse.up();}
   await page.mouse.move(20,20);await page.screenshot({path:'test-results/cruciate-order-'+mode+'-'+value+'.png'});await page.locator('#boneVisibility').click();
  }
 }
 // Independently reload the original GLB and compare fixed source attachment centres.
 const sourceErrors=await page.evaluate(async()=>{
  const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{DRACOLoader}=await import('three/addons/loaders/DRACOLoader.js');
  const draco=new DRACOLoader();draco.setDecoderPath('/vendor/three/draco/');const loader=new GLTFLoader();loader.setDRACOLoader(draco);const raw=await loader.loadAsync('/.cache/joints.glb');raw.scene.updateMatrixWorld(true);
  // Expected source positions are compared after returning the rig to Anatomy.
  const points={};raw.scene.traverse(n=>{if(['Anterior cruciate ligament.r','Posterior cruciate ligament.r'].includes(n.userData?.za_name)){const list=[];let indices=null;n.traverse(m=>{if(m.isMesh){indices=m.geometry.index?Array.from(m.geometry.index.array):null;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)list.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld).toArray());}});points[n.userData.za_name]={positions:list,indices};}});draco.dispose();return points;
 });
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const rest=await page.evaluate(()=>({entries:window.atlasLigamentQA().entries,bindings:window.atlasLigamentQA().bindings,meshes:['Anterior cruciate ligament.r','Posterior cruciate ligament.r'].map(n=>window.atlasMeshQA(n)[0])}));
 const meanEnd=(points,upper)=>{const y=points.map(p=>p[1]),lo=Math.min(...y),hi=Math.max(...y),region=points.filter(p=>upper?p[1]>=hi-(hi-lo)*.12:p[1]<=lo+(hi-lo)*.12);return region.reduce((v,p)=>v.add(new Vector3(...p)),new Vector3()).multiplyScalar(1/region.length);};
 const rawBindings=[];
 for(let i=0;i<2;i++){
  const points=sourceErrors[names[i]].positions,prox=meanEnd(points,true),dist=meanEnd(points,false),entry=rest.entries.find(e=>e.name===names[i]),anchor=entry.attachmentCentres;
  if(anchor){expect(new Vector3(...rest.meshes[i].positions[anchor.proximalIndex]).distanceTo(prox)).toBeLessThan(1e-8);expect(new Vector3(...rest.meshes[i].positions[anchor.distalIndex]).distanceTo(dist)).toBeLessThan(1e-8);}
  const axis=dist.clone().sub(prox),length2=axis.lengthSq(),bindings={name:names[i],proximal:[],distal:[]};
  points.forEach((p,index)=>{const t=new Vector3(...p).sub(prox).dot(axis)/length2;if(t<=.15)bindings.proximal.push({index});if(t>=.85)bindings.distal.push({index});});rawBindings.push(bindings);
 }
 const originalSource=audit({state:{hip:[0,0,0,1],knee:[0,0,0,1]},bindings:rawBindings,meshes:rest.meshes.map((m,i)=>sourceErrors[names[i]])});
 expect(originalSource.pclAhead).toBeGreaterThan(0);
 writeFileSync('test-results/cruciate-order.json',JSON.stringify({originalSource,status:'Anterior surface ordering at body-crossing samples, not full non-penetration validation',report},null,2));
});
