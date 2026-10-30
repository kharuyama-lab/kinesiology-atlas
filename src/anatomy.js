// Names checked against GLB extras.za_name, 2026-10-30.
export const tissues = [
 ['Rectus femoris muscle.r','大腿直筋','muscle','hip knee'],
 ['Vastus medialis muscle.r','内側広筋','muscle','knee'],
 ['Vastus lateralis muscle.r','外側広筋','muscle','knee'],
 ['Vastus intermedius muscle.r','中間広筋','muscle','knee'],
 ['Long head of biceps femoris.r','大腿二頭筋長頭','muscle','hip knee'],
 ['Short head of biceps femoris.r','大腿二頭筋短頭','muscle','knee'],
 ['Semitendinosus muscle.r','半腱様筋','muscle','hip knee'],
 ['Semimembranosus muscle.r','半膜様筋','muscle','hip knee'],
 ['Sartorius muscle.r','縫工筋','muscle','hip knee'],
 ['Gracilis muscle.r','薄筋','muscle','hip knee'],
 ['Popliteus muscle.r','膝窩筋','muscle','knee'],
 ['Medial head of gastrocnemius.r','腓腹筋内側頭','muscle','knee'],
 ['Lateral head of gastrocnemius.r','腓腹筋外側頭','muscle','knee'],
 ['Gluteus maximus muscle.r','大殿筋','muscle','hip'],
 ['Gluteus medius muscle.r','中殿筋','muscle','hip'],
 ['Gluteus minimus muscle.r','小殿筋','muscle','hip'],
 ['Iliacus muscle.r','腸骨筋','muscle','hip'],
 ['Psoas major.r','大腰筋','muscle','hip'],
 ['Piriformis muscle.r','梨状筋','muscle','hip'],
 ['Obturator internus.r','内閉鎖筋','muscle','hip'],
 ['Obturator externus.r','外閉鎖筋','muscle','hip'],
 ['Superior gemellus muscle.r','上双子筋','muscle','hip'],
 ['Inferior gemellus muscle.r','下双子筋','muscle','hip'],
 ['Quadratus femoris muscle.r','大腿方形筋','muscle','hip'],
 ['Adductor brevis.r','短内転筋','muscle','hip'],
 ['Adductor longus.r','長内転筋','muscle','hip'],
 ['Adductor magnus.r','大内転筋','muscle','hip'],
 ['Pectineus muscle.r','恥骨筋','muscle','hip'],
 ['Anterior cruciate ligament.r','前十字靭帯','ligament','knee'],
 ['Posterior cruciate ligament.r','後十字靭帯','ligament','knee'],
 ['Superficial part of tibial collateral ligament.r','内側側副靭帯・浅層','ligament','knee'],
 ['Deep part of tibial collateral ligament.r','内側側副靭帯・深層','ligament','knee'],
 ['Fibular collateral ligament.r','外側側副靭帯','ligament','knee'],
 ['Medial meniscus.r','内側半月板','meniscus','knee'],
 ['Lateral meniscus.r','外側半月板','meniscus','knee'],
 ['Descending part of iliofemoral ligament.r','腸骨大腿靭帯・下行部','ligament','hip'],
 ['Transverse part of iliofemoral ligament.r','腸骨大腿靭帯・横行部','ligament','hip'],
 ['Ischiofemoral ligament.r','坐骨大腿靭帯','ligament','hip'],
 ['Pubofemoral ligament.r','恥骨大腿靭帯','ligament','hip']
];
export const tissueByName=new Map(tissues.map(t=>[t[0],t]));
export const nextVisibility=state=>({on:'fade',fade:'off',off:'on'})[state]||'on';
export const relevant=(name,focus)=>focus==='body'||tissueByName.get(name)?.[3].split(' ').includes(focus)||false;
export function focusStates(focus){return new Map(tissues.map(([name])=>[name,relevant(name,focus)?'on':'off']));}
export function englishName(name){return name.replace(/\.[rl]$/,'');}
const boneJP={Incus:'砧骨',Malleus:'槌骨',Stapes:'鐙骨',Calcaneus:'踵骨','Cuboid bone':'立方骨','Intermediate cuneiform bone':'中間楔状骨','Lateral cuneiform bone':'外側楔状骨','Medial cuneiform bone':'内側楔状骨','Navicular bone':'舟状骨',Talus:'距骨',Femur:'大腿骨',Fibula:'腓骨',Patella:'膝蓋骨',Tibia:'脛骨','Hip bone':'寛骨','Capitate bone':'有頭骨','Hamate bone':'有鉤骨',Humerus:'上腕骨','Lunate bone':'月状骨','Pisiform bone':'豆状骨',Radius:'橈骨','Scaphoid bone':'舟状骨','Trapezium bone':'大菱形骨','Trapezoid bone':'小菱形骨','Triquetrum bone':'三角骨',Ulna:'尺骨',Clavicle:'鎖骨',Scapula:'肩甲骨','Ethmoid bone':'篩骨','Frontal bone':'前頭骨','Inferior nasal concha bone':'下鼻甲介','Lacrimal bone':'涙骨',Maxilla:'上顎骨','Nasal bone':'鼻骨','Occipital bone':'後頭骨','Palatine bone':'口蓋骨','Parietal bone':'頭頂骨','Sphenoid bone':'蝶形骨','Temporal bone':'側頭骨',Vomer:'鋤骨','Zygomatic bone':'頬骨','Hyoid bone':'舌骨',Mandible:'下顎骨','Arytenoid cartilage':'披裂軟骨','Corniculate cartilage':'小角軟骨','Cricoid cartilage':'輪状軟骨','Thyroid cartilage':'甲状軟骨','Lateral process of nasal septal cartilage':'鼻中隔軟骨外側突起','Major alar cartilage':'大鼻翼軟骨','Nasal septal cartilage':'鼻中隔軟骨','Body of sternum':'胸骨体','Manubrium of sternum':'胸骨柄','Xiphoid process':'剣状突起','Atlas (C1)':'環椎','Axis (C2)':'軸椎',Coccyx:'尾骨',Sacrum:'仙骨','Sesamoid bones of foot':'足の種子骨','Anterior cells of ethmoid bone':'前篩骨蜂巣','Middle cells of ethmoid bone':'中篩骨蜂巣','Posterior cells of ethmoid bone':'後篩骨蜂巣','Sinus of frontal bone':'前頭洞','Sinus of sphenoid bone':'蝶形骨洞'};
const ordinals=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
export function japaneseName(name){
 const en=englishName(name);if(tissueByName.has(name))return tissueByName.get(name)[1];if(boneJP[en])return boneJP[en];
 let m=en.match(/^(First|Second|Third|Fourth|Fifth) meta(carpal|tarsal) bone$/);if(m)return `第${ordinals.indexOf(m[1].toLowerCase())+1}${m[2]==='carpal'?'中手':'中足'}骨`;
 m=en.match(/^(Distal|Middle|Proximal) phalanx of (\w+) finger of (hand|foot)$/);if(m)return `${m[3]==='hand'?'手':'足'}第${ordinals.indexOf(m[2])+1}指${{Distal:'末節',Middle:'中節',Proximal:'基節'}[m[1]]}骨`;
 m=en.match(/^(?:Costal cartilage of )?(\w+) rib$/i);if(m)return `第${ordinals.indexOf(m[1].toLowerCase())+1}${en.startsWith('Costal')?'肋軟骨':'肋骨'}`;
 m=en.match(/^Vertebra ([CTL])(\d+)$/);if(m)return `第${m[2]}${{C:'頸椎',T:'胸椎',L:'腰椎'}[m[1]]}`;
 m=en.match(/^(Lower|Upper) (?:(first|second) )?(canine|lateral incisor|medial incisor|molar tooth|premolar)$/);if(m)return `${m[1]==='Lower'?'下顎':'上顎'}${m[2]?`第${ordinals.indexOf(m[2])+1}`:''}${{'canine':'犬歯','lateral incisor':'側切歯','medial incisor':'中切歯','molar tooth':'大臼歯','premolar':'小臼歯'}[m[3]]}`;
 return '';
}
