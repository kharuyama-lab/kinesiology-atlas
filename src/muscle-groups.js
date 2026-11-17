import {hipMuscleGroups} from './hip-motion.js';
const knee={flex:{label:'屈曲',names:['Long head of biceps femoris.r','Short head of biceps femoris.r','Semitendinosus muscle.r','Semimembranosus muscle.r','Sartorius muscle.r','Gracilis muscle.r','Popliteus muscle.r','Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Calcaneal tendon.r']},ext:{label:'伸展',names:['Rectus femoris muscle.r','Vastus medialis muscle.r','Vastus lateralis muscle.r','Vastus intermedius muscle.r']},ir:{label:'内旋',names:['Semitendinosus muscle.r','Semimembranosus muscle.r','Sartorius muscle.r','Gracilis muscle.r','Popliteus muscle.r']},er:{label:'外旋',names:['Long head of biceps femoris.r','Short head of biceps femoris.r']}};
const ankle={
 dorsiflex:{label:'背屈筋群',title:'背屈 / Dorsiflexion',names:['Tibialis anterior muscle.r','Extensor hallucis longus.r','Extensor digitorum longus.r','Tendon of extensor digitorum longus.r','Fibularis tertius muscle.r']},
 plantarflex:{label:'底屈筋群',title:'底屈 / Plantarflexion',names:['Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Soleus muscle.r','Plantaris muscle.r','Calcaneal tendon.r','Tibialis posterior muscle.r','Fibularis longus muscle.r','Fibularis brevis muscle.r','Flexor hallucis longus.r','Flexor digitorum longus.r']},
 pronation:{label:'回内筋群',title:'回内筋群（外転・外返し） / Pronation',names:['Fibularis longus muscle.r','Fibularis brevis muscle.r','Fibularis tertius muscle.r','Extensor digitorum longus.r','Tendon of extensor digitorum longus.r']},
 supination:{label:'回外筋群',title:'回外筋群（内転・内返し） / Supination',names:['Tibialis anterior muscle.r','Tibialis posterior muscle.r','Flexor hallucis longus.r','Flexor digitorum longus.r','Extensor hallucis longus.r']}
};
export const muscleGroups={hip:hipMuscleGroups,knee,ankle};
