// Review estimates only. Regions are geometric crops, not annotated articular surfaces.
import {KNEE_REVIEW} from '../config/knee.js';
function solve3(matrix,rhs){const a=matrix.map((row,i)=>[...row,rhs[i]]);for(let i=0;i<3;i++){let pivot=i;for(let r=i+1;r<3;r++)if(Math.abs(a[r][i])>Math.abs(a[pivot][i]))pivot=r;[a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];if(Math.abs(d)<1e-14)return null;for(let c=i;c<4;c++)a[i][c]/=d;for(let r=0;r<3;r++)if(r!==i){const k=a[r][i];for(let c=i;c<4;c++)a[r][c]-=k*a[i][c];}}return a.map(row=>row[3]);}
export function fitSphere(points){
 if(points.length<6)return null;
 const mean=[0,1,2].map(a=>points.reduce((s,p)=>s+p[a],0)/points.length),q=points.map(p=>p.map((v,a)=>v-mean[a]));
 const matrix=[0,1,2].map(a=>[0,1,2].map(b=>q.reduce((s,p)=>s+p[a]*p[b],0))),rhs=[0,1,2].map(a=>q.reduce((s,p)=>s+.5*p[a]*(p[0]**2+p[1]**2+p[2]**2),0));
 const offset=solve3(matrix,rhs);if(!offset)return null;const center=offset.map((v,a)=>v+mean[a]);
 const distances=points.map(p=>Math.hypot(...p.map((v,a)=>v-center[a]))),radius=distances.reduce((s,r)=>s+r,0)/points.length;
 return {center,radius,rms:Math.sqrt(distances.reduce((s,r)=>s+(r-radius)**2,0)/points.length),count:points.length};
}
export function estimateCondyleAxis(points,roi=KNEE_REVIEW){
 if(!points.length)return null;
 const bounds=[0,1,2].map(a=>[Math.min(...points.map(p=>p[a])),Math.max(...points.map(p=>p[a]))]);
 const yCut=bounds[1][0]+roi.distalFraction*(bounds[1][1]-bounds[1][0]),zCut=bounds[2][0]+roi.posteriorFraction*(bounds[2][1]-bounds[2][0]);
 const distal=points.filter(p=>p[1]<yCut),xs=distal.map(p=>p[0]),lo=Math.min(...xs),hi=Math.max(...xs),mid=(lo+hi)/2,gap=(hi-lo)*roi.notchExclusionFraction/2;
 const region=distal.filter(p=>p[2]<zCut),lateral=fitSphere(region.filter(p=>p[0]<mid-gap)),medial=fitSphere(region.filter(p=>p[0]>mid+gap));
 if(!lateral||!medial||Math.min(lateral.count,medial.count)<20)return null;
 const delta=medial.center.map((v,a)=>v-lateral.center[a]),length=Math.hypot(...delta);if(length<1e-5)return null;
 return {status:KNEE_REVIEW.status,method:'least-squares spheres in posterior distal condyle crops',roi:{distalFraction:roi.distalFraction,posteriorFraction:roi.posteriorFraction,notchExclusionFraction:roi.notchExclusionFraction,yCut,zCut,xMid:mid},medial,lateral,center:medial.center.map((v,a)=>(v+lateral.center[a])/2),flexAxis:delta.map(v=>v/length)};
}
