// Qualitative teaching envelopes, NOT measured force/strain or slack length.
// Takao et al. 2020, doi:10.1186/s12891-020-03296-0.
// Separate direct elongation/strain evidence from sectioning-based restraint.
export const ankleTensionEvidence={
 'Tibionavicular ligament.r':{direction:-1,range:30,source:'https://pubmed.ncbi.nlm.nih.gov/32386522/'},
 'Tibiocalcaneal ligament.r':{direction:1,range:20,source:'https://pubmed.ncbi.nlm.nih.gov/32386522/'},
 // Generic source mesh: do not claim a superficial/deep band identification.
 'Posterior tibiotalar ligament.r':{direction:1,range:20,source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9201323/'}
};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function ankleTensionCues(kind,value,active=true,stAxis=null){
 if(!active||!Number.isFinite(value))return {};
 if(kind!=='flex'){
  // All three controls drive the same oblique ST axis. Use its actual coronal
  // component so identical bone poses have identical cues in every control.
  const coronal=kind==='invert'||kind==='compound'?value:kind==='adduct'&&stAxis&&Math.abs(stAxis.y)>1e-6?value*stAxis.z/stAxis.y:null;
  if(coronal===null)return {};
  return {
   'Tibiocalcaneal ligament.r':{engagement:smooth(-coronal/10),slack:0,basis:'elongation',source:'https://doi.org/10.3113/FAI.2011.0457'},
   // Sectioning studies differ. This is a restraint contribution cue in both
   // directions, NOT a claim of measured tension or laxity in the reverse one.
   'Talocalcaneal interosseous ligament.r':{engagement:smooth(Math.abs(coronal)/(coronal<0?10:20)),slack:0,basis:'restraint',source:coronal<0?'https://doi.org/10.1007/s00167-023-07622-6':'https://pubmed.ncbi.nlm.nih.gov/9385243/'}
  };
 }
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
