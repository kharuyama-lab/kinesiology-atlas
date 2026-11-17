// Exact names in the pinned muscular.glb; these are connective sheets.
export const ankleRetinacula=[
 ['Superior extensor retinaculum of ankle.r','上伸筋支帯',['Tibia.r','Fibula.r'],[0,0,1]],
 ['Inferior extensor retinaculum of ankle.r','下伸筋支帯',['Calcaneus.r','Tibia.r','Navicular bone.r','Medial cuneiform bone.r'],[0,0,1]],
 ['Flexor retinaculum of ankle.r','屈筋支帯',['Tibia.r','Calcaneus.r'],[1,0,0]],
 ['Superior fibular retinaculum.r','上腓骨筋支帯',['Fibula.r','Calcaneus.r'],[-1,0,0]],
 ['Inferior fibular retinaculum.r','下腓骨筋支帯',['Calcaneus.r'],[-1,0,0]]
];
export const ankleRetinaculumNames=new Set(ankleRetinacula.map(([name])=>name));
export const ankleRetinaculumColors=Object.fromEntries(ankleRetinacula.map(([name])=>[name,0x90b9b3]));
