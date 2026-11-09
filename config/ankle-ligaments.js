import {ankleSupplements} from './ankle-supplements.js';
// Exact extras.za_name entries from the pinned joints.glb. Attachment bones
// identify transport frames; source-derived collars remain review estimates.
export const sourceAnkleLigaments=[
 ['Anterior tibiofibular ligament.r','前脛腓靭帯','Tibia.r','Fibula.r',0xb8a1dc],
 ['Posterior tibiofibular ligament.r','後脛腓靭帯','Tibia.r','Fibula.r',0xb8a1dc],
 ['Transverse tibiofibular ligament.r','横脛腓靭帯','Tibia.r','Fibula.r',0xb8a1dc],
 ['Posterior tibiotalar ligament.r','後脛距靭帯','Tibia.r','Talus.r',0x61c8aa],
 ['Tibiocalcaneal ligament.r','脛踵靭帯','Tibia.r','Calcaneus.r',0x61c8aa],
 ['Tibionavicular ligament.r','脛舟靭帯','Tibia.r','Navicular bone.r',0x61c8aa],
 ['Anterior talocalcaneal ligament.r','前距踵靭帯','Talus.r','Calcaneus.r',0x82b9e1],
 ['Lateral talocalcaneal ligament.r','外側距踵靭帯','Talus.r','Calcaneus.r',0x82b9e1],
 ['Medial talocalcaneal ligament.r','内側距踵靭帯','Talus.r','Calcaneus.r',0x82b9e1],
 ['Posterior talocalcaneal ligament.r','後距踵靭帯','Talus.r','Calcaneus.r',0x82b9e1],
 ['Talocalcaneal interosseous ligament.r','骨間距踵靭帯','Talus.r','Calcaneus.r',0x82b9e1],
 ['Talonavicular ligament.r','距舟靭帯','Talus.r','Navicular bone.r',0xd7b17c],
 ['Calcaneonavicular ligament.r','踵舟靭帯','Calcaneus.r','Navicular bone.r',0xd7b17c],
 ['Calcaneocuboid ligament.r','踵立方靭帯','Calcaneus.r','Cuboid bone.r',0xd7b17c],
 ['Plantar calcaneocuboid ligament.r','足底踵立方靭帯','Calcaneus.r','Cuboid bone.r',0xd7b17c],
 ['Long plantar ligament.r','長足底靭帯','Calcaneus.r','Cuboid bone.r',0xd7b17c]
];
export const ankleLigaments=[...sourceAnkleLigaments,...ankleSupplements.map(s=>[s.name,s.jp,'Fibula.r',s.bone,0x82b9e1])];
export const ankleLigamentColors=Object.fromEntries(ankleLigaments.map(([n,,,,color])=>[n,color]));
// Distal long-plantar fibres reach metatarsal bases. They share the current
// forefoot transform with the cuboid but must not be fitted to cuboid alone.
export const ankleAttachmentSurfaces={
 'Long plantar ligament.r':{a:['Calcaneus.r'],b:['Cuboid bone.r','Second metatarsal bone.r','Third metatarsal bone.r','Fourth metatarsal bone.r','Fifth metatarsal bone.r']}
};
// Missing only from the pinned upstream assets; now supplied as originals.
export const missingAnkleLigaments=['Anterior talofibular ligament.r','Calcaneofibular ligament.r','Posterior talofibular ligament.r'];
