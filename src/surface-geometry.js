import {Vector3,Matrix4,Triangle,Ray} from 'three';
export function geometryInFrame(meshes,inverse){
 const vertices=[],triangles=[];
 for(const mesh of meshes){mesh.updateWorldMatrix(true,false);const m=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),a=mesh.geometry.attributes.position,points=Array.from({length:a.count},(_,i)=>new Vector3().fromBufferAttribute(a,i).applyMatrix4(m)),ids=mesh.geometry.index?.array||Array.from({length:a.count},(_,i)=>i);vertices.push(...points);for(let i=0;i<ids.length;i+=3)triangles.push(new Triangle(points[ids[i]],points[ids[i+1]],points[ids[i+2]]));}
 return {vertices,triangles};
}
export function upperSurface(triangles,depth=.025){
 const max=Math.max(...triangles.flatMap(t=>[t.a.y,t.b.y,t.c.y]));
 const faces=triangles.filter(t=>Math.min(t.a.y,t.b.y,t.c.y)>max-depth&&Math.abs(t.getNormal(new Vector3()).y)>.35).map(t=>({source:t,flat:new Triangle(...[t.a,t.b,t.c].map(p=>new Vector3(p.x,0,p.z)))}));
 if(!faces.length)throw Error('No tibial support surface');
 const points=faces.flatMap(t=>[t.source.a,t.source.b,t.source.c]),x0=Math.min(...points.map(p=>p.x)),z0=Math.min(...points.map(p=>p.z)),step=.0015,nx=Math.ceil((Math.max(...points.map(p=>p.x))-x0)/step)+1,nz=Math.ceil((Math.max(...points.map(p=>p.z))-z0)/step)+1,grid=[];
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)grid.push(surfaceHeight(faces,x0+i*step,z0+j*step));
 // Coarse cortical triangles contain sharp boundaries. A continuous, lightly
 // smoothed envelope avoids jumping between separate nearest triangles.
 const heights=grid.map((p,index)=>{const i=index%nx,j=Math.floor(index/nx);let sum=0,w=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const x=Math.max(0,Math.min(nx-1,i+dx)),z=Math.max(0,Math.min(nz-1,j+dz)),weight=(dx?1:2)*(dz?1:2);sum+=grid[z*nx+x].height*weight;w+=weight;}return sum/w;});
 return {faces,x0,z0,step,nx,nz,heights,distances:grid.map(p=>p.distance)};
}
export function surfaceHeight(surface,x,z){
 if(!Array.isArray(surface)){
  const {x0,z0,step,nx,nz}=surface,fx=Math.max(0,Math.min(nx-1,(x-x0)/step)),fz=Math.max(0,Math.min(nz-1,(z-z0)/step)),i=Math.min(nx-2,Math.floor(fx)),j=Math.min(nz-2,Math.floor(fz)),u=fx-i,v=fz-j;
  const sample=a=>(a[j*nx+i]*(1-u)+a[j*nx+i+1]*u)*(1-v)+(a[(j+1)*nx+i]*(1-u)+a[(j+1)*nx+i+1]*u)*v;
  return {height:sample(surface.heights),distance:sample(surface.distances)+Math.hypot(x-(x0+fx*step),z-(z0+fz*step))};
 }
 const query=new Vector3(x,0,z),closest=new Vector3(),bary=new Vector3();let best=null;
 for(const t of surface){t.flat.closestPointToPoint(query,closest);const distance=closest.distanceTo(query);t.flat.getBarycoord(closest,bary);const height=t.source.a.y*bary.x+t.source.b.y*bary.y+t.source.c.y*bary.z;
  if(!best||distance<best.distance-1e-8||Math.abs(distance-best.distance)<1e-8&&height>best.height)best={height,distance,x:closest.x,z:closest.z};}
 if(!best)throw Error('No tibial support surface');return best;
}
export function radialSurface(triangles,origin,outward,maxRadius=.12){
 const start=origin.clone().addScaledVector(outward,maxRadius),ray=new Ray(start,outward.clone().negate()),hit=new Vector3();let best=null,near=Infinity;
 for(const t of triangles){if(!ray.intersectTriangle(t.a,t.b,t.c,false,hit))continue;const distance=hit.distanceTo(start);if(distance<near){near=distance;best=hit.clone();}}
 return best;
}
