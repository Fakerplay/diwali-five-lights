export const FOUNTAIN=Object.freeze({gravity:3.2,lifetime:1.25,minSpeed:1.75,speedRange:.7,fan:2.25,stagger:1.25});
export function fountainPosition(age,spread,speedSeed){const t=Math.max(0,age),x0=(speedSeed-.5)*.12;return {x:x0+(spread-.5)*FOUNTAIN.fan*t,y:.305+Math.sqrt(.25-x0*x0)+(FOUNTAIN.minSpeed+speedSeed*FOUNTAIN.speedRange)*t-.5*FOUNTAIN.gravity*t*t};}
