// Extension and internal-rotation teaching cues; no contact or geometry changes.
const bound=x=>Math.max(0,Math.min(1,x));
export function ligamentEngagement({flex=90,rot=0}={}){
 const extension=1-bound(flex/30),ext=extension*extension*(3-2*extension);
 const ir=bound(-rot/15);
 return {acl:Math.max(ext,ir),pcl:ir,mcl:ext,lcl:ext};
}
export function ligamentAppearance(score,now,state='on'){
 const g=bound(score),pulse=.85+.15*Math.sin(now*.004);
 return {opacity:state==='fade'?.3:1,paleness:.46*(1-g),glow:(.06*g+.69*Math.pow(g,2.3))*pulse*(state==='fade'?.3:1),maximum:g>=.95};
}
