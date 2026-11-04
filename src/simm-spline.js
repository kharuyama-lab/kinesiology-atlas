// Adapted from OpenSim/Common/SimmSpline.cpp (Peter Loan, Stanford University
// and Authors, 2005–2017), Apache-2.0. See vendor/opensim/LICENSE and NOTICE.
export function simmSpline(x,y){
 const n=x.length,b=Array(n).fill(0),c=Array(n).fill(0),d=Array(n).fill(0);
 if(n<2||n!==y.length||x.some((v,i)=>!Number.isFinite(v)||i&&v<=x[i-1])||y.some(v=>!Number.isFinite(v)))throw Error('Invalid spline knots');
 if(n===2)b.fill((y[1]-y[0])/(x[1]-x[0]));
 else{
  d[0]=x[1]-x[0];c[1]=(y[1]-y[0])/d[0];
  for(let i=1;i<n-1;i++){d[i]=x[i+1]-x[i];b[i]=2*(d[i-1]+d[i]);c[i+1]=(y[i+1]-y[i])/d[i];c[i]=c[i+1]-c[i];}
  b[0]=-d[0];b[n-1]=-d[n-2];
  if(n>3){c[0]=(c[2]/(x[3]-x[1])-c[1]/(x[2]-x[0]))*d[0]**2/(x[3]-x[0]);c[n-1]=-(c[n-2]/(x[n-1]-x[n-3])-c[n-3]/(x[n-2]-x[n-4]))*d[n-2]**2/(x[n-1]-x[n-4]);}
  for(let i=1;i<n;i++){const t=d[i-1]/b[i-1];b[i]-=t*d[i-1];c[i]-=t*c[i-1];}
  c[n-1]/=b[n-1];for(let i=n-2;i>=0;i--)c[i]=(c[i]-d[i]*c[i+1])/b[i];
  b[n-1]=(y[n-1]-y[n-2])/d[n-2]+d[n-2]*(c[n-2]+2*c[n-1]);
  for(let i=0;i<n-1;i++){b[i]=(y[i+1]-y[i])/d[i]-d[i]*(c[i+1]+2*c[i]);d[i]=(c[i+1]-c[i])/d[i];c[i]*=3;}
  c[n-1]*=3;d[n-1]=d[n-2];
 }
 return (v,derivative=0)=>{
  if(v<x[0]||v>x[n-1]){const i=v<x[0]?0:n-1;return derivative===0?y[i]+(v-x[i])*b[i]:derivative===1?b[i]:0;}
  let i=0;while(i<n-2&&v>x[i+1])i++;const h=v-x[i];
  return derivative===0?y[i]+h*(b[i]+h*(c[i]+h*d[i])):derivative===1?b[i]+h*(2*c[i]+3*h*d[i]):2*c[i]+6*h*d[i];
 };
}
