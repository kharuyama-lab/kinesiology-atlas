// Exact right-side za_name values from the pinned muscular GLB.
// Tendon sheaths and bursae are not muscle/tendon geometry.
export const ankleMuscles=[
 ['Tibialis anterior muscle.r','前脛骨筋','Medial cuneiform bone.r',0xd18c8c],
 ['Tibialis posterior muscle.r','後脛骨筋','Navicular bone.r',0x9a85bd],
 ['Fibularis longus muscle.r','長腓骨筋','First metatarsal bone.r',0xd5aa70],
 ['Fibularis brevis muscle.r','短腓骨筋','Fifth metatarsal bone.r',0xb69462],
 ['Fibularis tertius muscle.r','第三腓骨筋','Fifth metatarsal bone.r',0xc2ae85],
 ['Medial head of gastrocnemius.r','腓腹筋内側頭','Calcaneus.r',0x87b6cc],
 ['Lateral head of gastrocnemius.r','腓腹筋外側頭','Calcaneus.r',0x7392bb],
 ['Soleus muscle.r','ヒラメ筋','Calcaneus.r',0x6faaa9],
 ['Plantaris muscle.r','足底筋','Calcaneus.r',0xa7c4b4],
 ['Calcaneal tendon.r','アキレス腱','Calcaneus.r',0xd8cbb2],
 ['Extensor digitorum longus.r','長趾伸筋','Fifth metatarsal bone.r',0xd6989f],
 ['Tendon of extensor digitorum longus.r','長趾伸筋腱','Fifth metatarsal bone.r',0xc5b99f],
 ['Extensor hallucis longus.r','長母趾伸筋','First metatarsal bone.r',0xbd839d],
 ['Flexor digitorum longus.r','長趾屈筋','Fifth metatarsal bone.r',0xa39bc9],
 ['Flexor hallucis longus.r','長母趾屈筋','First metatarsal bone.r',0x8e92b7]
];
export const ankleMuscleNames=new Set(ankleMuscles.map(([name])=>name));
export const ankleMuscleColors=Object.fromEntries(ankleMuscles.map(([name,,,color])=>[name,color]));
export const ankleCalf=name=>/gastrocnemius|Soleus|Plantaris|Calcaneal tendon/.test(name);
