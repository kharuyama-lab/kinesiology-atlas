import assert from 'node:assert/strict';
import {screwHomeExternalRotationDeg,activeKneeAngles,teachingLigamentTendency} from '../src/kinematics.js';
assert.equal(screwHomeExternalRotationDeg(0),9);
assert.equal(screwHomeExternalRotationDeg(20),0);
assert.equal(screwHomeExternalRotationDeg(90),0);
let prev=9;for(let angle=1;angle<=20;angle++){const x=screwHomeExternalRotationDeg(angle);assert(x<=prev+1e-10,'nonincreasing during flexion');prev=x}
assert.deepEqual(activeKneeAngles('rot',15),{flex:90,rot:15,valgus:0});
assert.deepEqual(activeKneeAngles('stress',-2),{flex:30,rot:0,valgus:-2});
assert.equal(teachingLigamentTendency('stress',2).mcl,'強調');
assert.equal(teachingLigamentTendency('stress',-2).lcl,'強調');
assert.equal(teachingLigamentTendency('rot',-10).acl,'強調');
assert.equal(teachingLigamentTendency('rot',10).mcl,'強調');
console.log('PASS: pure kinematics, stress direction and ligament teaching rules');
