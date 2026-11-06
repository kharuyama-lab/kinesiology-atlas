// Qualitative teaching envelopes, NOT measured force/strain or slack length.
// Takao et al. 2020, doi:10.1186/s12891-020-03296-0.
// Only isolated DF/PF is mapped: the model's subtalar coupled motion does not
// reproduce the study's imposed DF-abduction loading condition.
export const ankleTensionEvidence={
 'Tibionavicular ligament.r':{direction:-1,range:30,source:'https://pubmed.ncbi.nlm.nih.gov/32386522/'},
 'Tibiocalcaneal ligament.r':{direction:1,range:20,source:'https://pubmed.ncbi.nlm.nih.gov/32386522/'},
 // Generic source mesh: do not claim a superficial/deep band identification.
 'Posterior tibiotalar ligament.r':{direction:1,range:20,source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9201323/'}
};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function ankleTensionCues(kind,value,active=true){
 if(!active||kind!=='flex'||!Number.isFinite(value))return {};
 return Object.fromEntries(Object.entries(ankleTensionEvidence).map(([name,r])=>{
  const directed=value*r.direction;
  return [name,{engagement:smooth(directed/r.range),slack:smooth(-directed/(r.direction===1?40:20))}];
 }));
}

// Keep the anatomical identity hue. A gentle 1.6 s pulse distinguishes
// engagement from an inherently yellow band, without a yellow/white overlay.
export function ankleTensionAppearance(score,now,state='on'){
 const g=Math.sqrt(Math.max(0,Math.min(1,Number.isFinite(score)?score:0)));
 const pulse=.5+.5*Math.sin(now*Math.PI*2/1600);
 return {darkening:g*(.18+.12*pulse),saturation:g*.18,
  glow:state==='off'?0:g*(.06+.3*pulse)*(state==='fade'?.25:1)};
}
