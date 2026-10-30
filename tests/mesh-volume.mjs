import {Vector3,Ray,Triangle} from 'three';
// Low-resolution anatomical meshes can contain openings and edge coincidences.
// Use seven independent ray parities, retaining votes for the audit.
export function meshVolumeProbe(mesh){
 const points=mesh.positions.map(p=>new Vector3(...p)),triangles=[];
 for(let i=0;i<mesh.indices.length;i+=3)triangles.push(new Triangle(...mesh.indices.slice(i,i+3).map(j=>points[j])));
 const directions=[[1,.13,.07],[.1,1,.2],[.2,.1,1],[-1,.23,.17],[.17,-1,.31],[.31,.13,-1],[1,1,.3]].map(v=>new Vector3(...v).normalize());
 return point=>{const votes=directions.map(direction=>{const ray=new Ray(point,direction),hits=[];for(const t of triangles){const h=ray.intersectTriangle(t.a,t.b,t.c,false,new Vector3());if(h)hits.push(h.distanceTo(point));}hits.sort((a,b)=>a-b);return hits.filter((v,i)=>!i||v-hits[i-1]>1e-7).length%2;});return {inside:votes.reduce((s,v)=>s+v,0)>=4,votes};};
}
