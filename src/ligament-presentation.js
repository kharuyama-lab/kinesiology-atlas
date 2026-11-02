// Qualitative teaching cues requested for rotation/stress, never measured strain.
const bound=x=>Math.max(0,Math.min(1,x));
export function ligamentEngagement({flex=90,rot=0,valgus=0}){
 const ir=bound(-rot/15),er=bound(rot/30),extension=1-bound(flex/30);
 const ext=extension*extension*(3-2*extension),deep=bound((flex-45)/75);
 return {acl:Math.max(ir,ext),pcl:Math.max(ir,deep*deep*(3-2*deep)),mcl:Math.max(er,ext,bound(valgus/3)),lcl:Math.max(er,ext,bound(-valgus/3))};
}
export function ligamentAppearance(score,now,state='on'){
 const g=bound(score),pulse=.85+.15*Math.sin(now*.004);
 return {opacity:state==='fade'?.3:1,paleness:.46*(1-g),glow:(.06*g+.69*Math.pow(g,2.3))*pulse*(state==='fade'?.3:1),maximum:g>=.95};
}
