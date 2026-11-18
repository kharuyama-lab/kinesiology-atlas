import {Matrix4,Quaternion,Vector3} from 'three';
export function ankleLigamentBase(e){
 const da=new Matrix4().multiplyMatrices(e.aBone.matrixWorld,e.aInverse),db=new Matrix4().multiplyMatrices(e.bBone.matrixWorld,e.bInverse),qa=new Quaternion(),qb=new Quaternion(),q=new Quaternion(),dummy=new Vector3(),scale=new Vector3();da.decompose(dummy,qa,scale);db.decompose(dummy,qb,scale);
 return e.rest.map((p,i)=>{const anchor=e.anchors.get(i),c=e.stations[i],w=e.weights[i];if(anchor)return anchor.local.clone().applyMatrix4(anchor.bone.matrixWorld);
  if(e.supplement){const t=Math.floor(i/(e.columns+1))/e.rows,column=i%(e.columns+1),last=e.rows*(e.columns+1)+column,pa=e.rest[column],pb=e.rest[last],aa=e.anchors.get(column),bb=e.anchors.get(last),start=aa.local.clone().applyMatrix4(aa.bone.matrixWorld),end=bb.local.clone().applyMatrix4(bb.bone.matrixWorld);return p.clone().sub(pa.clone().lerp(pb,t)).applyQuaternion(q.copy(qa).slerp(qb,t)).add(start.lerp(end,t));}
  return p.clone().sub(c).applyQuaternion(q.copy(qa).slerp(qb,w)).add(c.clone().applyMatrix4(da).lerp(c.clone().applyMatrix4(db),w));
 });
}
