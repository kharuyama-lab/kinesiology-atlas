// Review seeds in the pinned model's world metres, not patient measurements.
// Clanton 2014 (PMID 24951749), Haytmanek 2015 (PMID 25325559):
// distinguish landmark distance from vertical offset; anterior-border vs fossa.
// Regional landmarks inform these explicitly estimated 3D offsets;
// the surface matching and illustrative widths below are original estimates.
export const ankleSupplements=[
 {id:'ATFL',name:'Anterior talofibular ligament.r',jp:'前距腓靭帯',bone:'Talus.r',fibularOffset:[.001,.009,.010],fibularSide:'anterior',distalSeed:[-.085,.062,-.023],distalRegion:{z:[-.028,-.018]},width:.007,proximalFootprintWidth:.0045,distalFootprintWidth:.009,shape:'fan',outward:[-1,0,.25]},
 {id:'CFL',name:'Calcaneofibular ligament.r',jp:'踵腓靭帯',bone:'Calcaneus.r',fibularOffset:[.002,.0015,.003],fibularRegion:{y:[.056,.0582],z:[-.049,-.043]},fibularSide:'anterior',distalSeed:[-.099,.039,-.060],width:.005,outward:[-1,0,0]},
 {id:'PTFL',name:'Posterior talofibular ligament.r',jp:'後距腓靭帯',bone:'Talus.r',fibularOffset:[.007,.005,-.002],fibularSide:'medial-posterior',distalSeed:[-.081,.058,-.066],distalRegion:{x:[-.088,-.077],y:[.055,.062],z:[-.069,-.060]},width:.007,proximalFootprintWidth:.002,distalFootprintWidth:.008,distalFanDirection:[0,1,0],shape:'fan',outward:[.6,0,-1]}
];

// Proposed bone landmarks for joint review, not independent registrations.
export const ankleReviewLandmarks=[
 {id:'F0',label:'外果先端',bone:'Fibula.r',method:'mesh minimum Y'},
 {id:'F1',label:'外果前縁下部（推定）',bone:'Fibula.r',seed:[-.100,.058,-.047],normal:[0,0,1]},
 {id:'T1',label:'距骨外側面の前縁・頸部境界（推定）',bone:'Talus.r',seed:[-.085,.064,-.024],normal:[-.6,0,.8]},
 {id:'T2',label:'距骨後突起外側結節の領域（推定）',bone:'Talus.r',seed:[-.081,.0575,-.066],normal:[0,0,-1]}
];
