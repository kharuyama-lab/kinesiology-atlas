// Regional anatomical crossings, not a rule that every ligament lies deep to
// every muscle. The long fibular tendon runs under the long plantar ligament.
export function deepLigamentsForMuscle(name){
 if(/Oblique head of adductor|Transverse head of adductor|interossei|Opponens/.test(name))return [];
 if(/Quadratus plantae/.test(name))return ['Plantar calcaneocuboid']; // Long plantar origin is an enthesis, not a crossing.
 if(/Fibularis (longus|brevis)/.test(name))return ['Calcaneofibular','Anterior talofibular','Posterior talofibular','Lateral talocalcaneal','Calcaneocuboid','Plantar calcaneocuboid'];
 if(/gastrocnemius|Soleus|Plantaris|Calcaneal tendon/.test(name))return ['Posterior talofibular','Posterior talocalcaneal','Posterior tibiofibular'];
 if(/Tibialis posterior|Flexor (digitorum|hallucis) longus/.test(name))return ['Posterior tibiotalar','Tibiocalcaneal','Tibionavicular','Posterior talocalcaneal','Posterior talofibular','Long plantar','Plantar calcaneocuboid'];
 if(/Extensor (digitorum|hallucis) brevis/.test(name))return ['Anterior talocalcaneal','Lateral talocalcaneal','Calcaneonavicular','Calcaneocuboid','Talonavicular'];
 if(/Abductor|Flexor.*brevis|Flexor digiti minimi|Quadratus plantae|Lumbrical/.test(name))return ['Long plantar','Plantar calcaneocuboid'];
 return ['Anterior tibiofibular','Anterior talofibular','Tibionavicular','Talonavicular','Calcaneonavicular','Calcaneocuboid'];
}
export function ligamentLayerNormal(name){
 if(/Anterior tibiofibular/.test(name))return [0,0,1];
 if(/Anterior talofibular/.test(name))return [-1,0,.3];
 if(/Long plantar|Plantar calcaneocuboid/.test(name))return [0,-1,0];
 if(/Posterior talofibular|Posterior talocalcaneal|Posterior tibiofibular|Transverse tibiofibular/.test(name))return [0,0,-1];
 if(/Tibionavicular|Tibiocalcaneal|Posterior tibiotalar|Medial talocalcaneal/.test(name))return [1,0,0];
 if(/Calcaneofibular|Lateral talocalcaneal/.test(name))return [-1,0,0];
 return [0,1,0];
}
