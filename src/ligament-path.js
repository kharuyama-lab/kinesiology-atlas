import {Vector3} from 'three';
export function pathLength(a,b,direction,amplitude){const c=a.distanceTo(b),h=4*Math.abs(amplitude);if(h<1e-12)return c;if(c<1e-12)return h/2;return .5*Math.hypot(c,h)+c*c/(2*h)*Math.asinh(h/c);}
export function ligamentPath(a,b,referenceLength,direction){
 const axis=b.clone().sub(a).normalize(),normal=direction.clone().addScaledVector(axis,-direction.dot(axis));
 if(normal.lengthSq()<1e-10)normal.crossVectors(axis,new Vector3(0,0,1));if(normal.lengthSq()<1e-10)normal.crossVectors(axis,new Vector3(1,0,0));normal.normalize();
 const chord=a.distanceTo(b),target=Math.max(referenceLength,chord);let lo=0,hi=target;
 if(target-chord>1e-9)for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(pathLength(a,b,normal,mid)<target)lo=mid;else hi=mid;}
 else hi=0;
 const amplitude=(lo+hi)/2;
 return {chord,length:pathLength(a,b,normal,amplitude),amplitude,point:t=>a.clone().lerp(b,t).addScaledVector(normal,4*t*(1-t)*amplitude)};
}
