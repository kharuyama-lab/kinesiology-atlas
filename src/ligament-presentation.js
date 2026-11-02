// Qualitative teaching cues requested for rotation/stress, never measured strain.
const bound=x=>Math.max(0,Math.min(1,x));
export function ligamentEngagement({rot=0,valgus=0}){
 const ir=bound(-rot/15),er=bound(rot/30);
 return {acl:ir,pcl:ir,mcl:Math.max(er,bound(valgus/3)),lcl:Math.max(er,bound(-valgus/3))};
}
export function ligamentAppearance(score,now,state='on'){
 const g=bound(score),pulse=.85+.15*Math.sin(now*.004);
 return {opacity:state==='fade'?.3:.28+.71*Math.pow(g,1.03),paleness:.46*(1-g),glow:(.06*g+.69*Math.pow(g,2.3))*pulse*(state==='fade'?.3:1),maximum:g>=.95};
}
