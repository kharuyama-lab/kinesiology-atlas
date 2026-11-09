// Review seeds in the pinned model's world metres, not patient measurements.
// Clanton 2014 (PMID 24951749), Haytmanek 2015 (PMID 25325559):
// distinguish landmark distance from vertical offset; anterior-border vs fossa.
// Regional landmarks inform these explicitly estimated 3D offsets;
// the surface matching and illustrative widths below are original estimates.
export const ankleSupplements=[
 {id:'ATFL',name:'Anterior talofibular ligament.r',jp:'前距腓靭帯',bone:'Talus.r',fibularOffset:[.001,.009,.010],fibularSide:'anterior',distalSeed:[-.087,.061,-.029],width:.007,outward:[-1,0,.25]},
 {id:'CFL',name:'Calcaneofibular ligament.r',jp:'踵腓靭帯',bone:'Calcaneus.r',fibularOffset:[.001,.003,.0045],fibularSide:'anterior',distalSeed:[-.099,.039,-.060],width:.005,outward:[-1,0,0]},
 {id:'PTFL',name:'Posterior talofibular ligament.r',jp:'後距腓靭帯',bone:'Talus.r',fibularOffset:[.007,.005,-.002],fibularSide:'medial-posterior',distalSeed:[-.083,.064,-.069],width:.007,outward:[.6,0,-1]}
];
