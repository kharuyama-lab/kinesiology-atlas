import {Vector3} from 'three';

// Bone following and terminal footprints remain synchronous. Resolve only the
// small exterior coverage correction off the input/render thread. Coalesce
// requests; never queue outdated poses behind a slider drag.
export class AsyncRetinaculumCoverage{
 constructor(retinacula,muscles){
  this.retinacula=retinacula;const needed=new Set(retinacula.entries.flatMap(e=>e.covers));this.muscles=muscles.entries.filter(e=>needed.has(e.name));this.targets=[];this.smooth=[];this.lastTime=performance.now();
  this.generation=0;
  this.worker=new Worker(new URL('./ankle-retinaculum-worker.js',import.meta.url),{type:'module'});
  const description=e=>({name:e.name,rest:e.rest.map(p=>p.toArray()),indices:Array.from(e.mesh.geometry.index.array),covers:e.covers,pins:e.bindings?.map(b=>b.pin)});
  this.worker.postMessage({type:'init',muscles:this.muscles.map(description),retinacula:retinacula.entries.map(description)});
  this.worker.onmessage=({data})=>{this.busy=false;this.workerMs=data.ms;if(this.active&&data.generation===this.generation&&data.kind===this.kind&&Math.abs(data.value-this.value)<3){this.targets=data.offsets;this.settling=true;}if(this.active&&this.pending)this.start();};
  this.worker.onerror=event=>{this.error=event.message;this.busy=false;console.error('Ankle retinaculum worker:',event.message);};
 }
 submit(kind,value){
  if(!this.active){this.active=true;this.generation++;}
  if(kind!==this.kind){this.targets=[];this.smooth=[];}
  this.kind=kind;this.value=value;
  this.retinacula.entries.forEach(e=>{e.asyncBase=new Float32Array(e.mesh.geometry.attributes.position.array);});
  this.pending=true;this.baseChanged=true;if(!this.busy)this.start();
 }
 start(){
  if(this.error)return;this.pending=false;this.busy=true;const transfer=[];
  const pose=(entry,base=null)=>{const positions=new Float32Array(base||entry.mesh.geometry.attributes.position.array);transfer.push(positions.buffer);return {positions,matrix:entry.mesh.matrixWorld.toArray()};};
  const retinacula=this.retinacula.entries.map(e=>{const result=pose(e,e.asyncBase);result.normals=new Float32Array(e.bindings.length*3);e.bindings.forEach((b,i)=>new Vector3().copy(b.normal).transformDirection(b.first.delta).toArray(result.normals,i*3));transfer.push(result.normals.buffer);return result;});
  this.worker.postMessage({type:'pose',generation:this.generation,kind:this.kind,value:this.value,muscles:this.muscles.map(e=>pose(e)),retinacula},transfer);
 }
 apply(){
  if(!this.active)return;
  const now=performance.now(),alpha=1-Math.exp(-Math.min(.05,(now-this.lastTime)/1000)*40);this.lastTime=now;if(!this.baseChanged&&!this.settling)return;
  let settling=false;
  this.retinacula.entries.forEach((e,i)=>{
   if(!e.asyncBase)return;const a=e.mesh.geometry.attributes.position,target=this.targets[i];this.smooth[i]||=new Float32Array(a.array.length);const current=this.smooth[i];let changed=false;
   for(let k=0;k<a.array.length;k++){const wanted=e.bindings[Math.floor(k/3)].pin?0:target?.[k]||0,delta=wanted-current[k];if(Math.abs(delta)>.0000001){current[k]+=delta*alpha;settling=true;}else current[k]=wanted;const next=e.asyncBase[k]+current[k];if(a.array[k]!==Math.fround(next))changed=true;a.array[k]=next;}
   if(changed){a.needsUpdate=true;e.mesh.geometry.computeVertexNormals();}
  });this.settling=settling;this.baseChanged=false;
 }
 get pendingWork(){return !!(this.busy||this.pending||this.settling);}
 suspend(){this.active=false;this.generation++;this.targets=[];this.smooth=[];this.pending=false;this.settling=false;this.baseChanged=false;}
 dispose(){this.worker.terminate();}
}
