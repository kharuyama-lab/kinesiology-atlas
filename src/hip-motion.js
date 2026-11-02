import {Quaternion,Vector3} from 'three';
// Ported from legacy/hip: instructor-reviewed signs, ranges and qualitative actions.
export const hipRanges={flex:[-20,110,0,'伸展 / Extension 20°','屈曲 / Flexion 110°'],abd:[-25,45,0,'内転 / Adduction 25°','外転 / Abduction 45°'],rot:[-45,45,0,'内旋 / Internal 45°','外旋 / External 45°']};
const actions={
 glutMax:{flex:-1,rot:.40},glutMed:{abd:1,rot:-.20},glutMin:{abd:1,rot:-.40},
 iliacus:{flex:1,rot:.2},adductor:{abd:-1,flex:-.15},addMin:{abd:-1},psoas:{flex:1,rot:.2},rectus:{flex:1},
 sartorius:{flex:1,abd:.20,rot:.30},tfl:{abd:1,flex:.35,rot:-.35},
 pectineus:{abd:-1,flex:.35},addLong:{abd:-1,flex:.20},addBrevis:{abd:-1,flex:.20},
 gracilis:{abd:-1},semiten:{flex:-1},semimem:{flex:-1},bicepsLong:{flex:-1},
 piriformis:{rot:1,abd:.15},obturatorIn:{rot:1},obturatorEx:{rot:1},
 quadratus:{rot:1},gemSup:{rot:1},gemInf:{rot:1}
};
const names={
 "glutMax": "Gluteus maximus muscle.r",
 "glutMed": "Gluteus medius muscle.r",
 "glutMin": "Gluteus minimus muscle.r",
 "iliacus": "Iliacus muscle.r",
 "adductor": "Adductor magnus.r",
 "addMin": "(Adductor minimus).r",
 "psoas": "Psoas major.r",
 "rectus": "Rectus femoris muscle.r",
 "sartorius": "Sartorius muscle.r",
 "tfl": "Tensor fasciae latae.r",
 "pectineus": "Pectineus muscle.r",
 "addLong": "Adductor longus.r",
 "addBrevis": "Adductor brevis.r",
 "gracilis": "Gracilis muscle.r",
 "semiten": "Semitendinosus muscle.r",
 "semimem": "Semimembranosus muscle.r",
 "bicepsLong": "Long head of biceps femoris.r",
 "piriformis": "Piriformis muscle.r",
 "obturatorIn": "Obturator internus.r",
 "obturatorEx": "Obturator externus.r",
 "quadratus": "Quadratus femoris muscle.r",
 "gemSup": "Superior gemellus muscle.r",
 "gemInf": "Inferior gemellus muscle.r"
};
export const hipActions=Object.fromEntries(Object.entries(names).map(([key,name])=>[name,actions[key]]));
export function hipPose(kind,value,side){const p={flex:0,abd:0,rot:0};p[kind]=value;return new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-p.flex*Math.PI/180).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),-side*p.abd*Math.PI/180)).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),-side*p.rot*Math.PI/180));}
export function hipMuscleAction(name,kind,value){const limit=kind==='flex'?(value<0?20:80):kind==='abd'?(value<0?25:45):45;return Math.max(-1,Math.min(1,(hipActions[name]?.[kind]||0)*Math.max(-1,Math.min(1,value/limit))));}
export function hipLigamentScore(name,kind,value){const table={'Transverse part of iliofemoral ligament.r':{ext:1,abd:0,add:2,er:1,ir:0},'Descending part of iliofemoral ligament.r':{ext:2,abd:1,add:1,er:1,ir:0},'Pubofemoral ligament.r':{ext:1,abd:2,add:0,er:1,ir:0},'Ischiofemoral ligament.r':{ext:1,abd:1,add:0,er:0,ir:1}};const dir=kind==='flex'?'ext':kind==='abd'?(value<0?'add':'abd'):(value<0?'ir':'er');if(kind==='flex'&&value>=0)return 0;const limit={ext:20,abd:45,add:25,er:45,ir:45}[dir];return (table[name]?.[dir]||0)*Math.min(1,Math.abs(value)/limit)/2;}
