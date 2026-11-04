// Reflect at both endpoints, preserving overshoot even across multiple cycles.
export function advancePlayback(value,direction,seconds,min,max,speed){
 const span=max-min;if(!(span>0))return {value:min,direction:1};
 const v=Math.max(min,Math.min(max,value));const phase=(direction<0?2*span-(v-min):v-min)+Math.max(0,seconds)*Math.max(0,speed);
 const wrapped=phase%(2*span);return {value:min+(wrapped<=span?wrapped:2*span-wrapped),direction:wrapped<span?1:-1};
}
export const playbackSpeed=Object.freeze({flex:42,rot:15,stress:1.5});
