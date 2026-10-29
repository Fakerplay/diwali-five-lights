import * as THREE from 'three';
import {vertex,surfaceFragment,rimFragment,floorFragment} from './diya-three.js';
import {FOUNTAIN} from './fountain-physics.mjs';

const flight=`
float flightAge(vec4 props){return mod(max(0.,uAge-props.x*${FOUNTAIN.stagger}),${FOUNTAIN.lifetime});}
vec3 flight(float age,vec4 props){float x0=(props.z-.5)*.12;float y0=.305+sqrt(.25-x0*x0);float vx=(props.y-.5)*${FOUNTAIN.fan};float vy=${FOUNTAIN.minSpeed}+props.z*${FOUNTAIN.speedRange};return vec3(x0+vx*age+sin(age*7.+props.x*20.)*.014*age,y0+vy*age-.5*${FOUNTAIN.gravity}*age*age,(props.w-.5)*.08);}
float fadeSpark(float age,vec4 props){return step(props.x*${FOUNTAIN.stagger},uAge)*smoothstep(0.,.045,age)*(1.-smoothstep(.72,${FOUNTAIN.lifetime},age))*uStrength;}
vec3 sparkColor(vec4 props){return mix(vec3(.28,1.7,.65),vec3(3.,1.95,.62),step(.31,props.w));}
`;
const trailVertex=`in vec4 aProps;out vec2 vUv;out vec3 vColor;out float vFade;uniform float uAge;uniform float uStrength;
${flight}
void main(){vUv=uv;float headAge=flightAge(aProps);float age=max(0.,headAge-uv.y*(.065+aProps.z*.055));vec3 p=flight(age,aProps);float vx=(aProps.y-.5)*${FOUNTAIN.fan};float vy=${FOUNTAIN.minSpeed}+aProps.z*${FOUNTAIN.speedRange}-${FOUNTAIN.gravity}*age;vec2 normal=normalize(vec2(-vy,vx)+.0001);float width=(.0022+aProps.w*.0028)*(.12+.88*(1.-uv.y));p.xy+=normal*position.x*width;vColor=sparkColor(aProps);vFade=fadeSpark(headAge,aProps);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const trailFragment=`precision highp float;in vec2 vUv;in vec3 vColor;in float vFade;out vec4 outColor;void main(){float edge=1.-smoothstep(.18,.5,abs(vUv.x-.5));float tail=pow(1.-vUv.y,1.7);float a=edge*tail*vFade;outColor=vec4(vColor*a,a);}`;
const headVertex=`in vec4 aProps;out vec3 vColor;out float vFade;uniform float uAge;uniform float uStrength;uniform float uPixelRatio;
${flight}
void main(){float age=flightAge(aProps);vec3 p=flight(age,aProps);float inside=length(vec2(p.x,max(abs(p.y)-.305,0.)))-.5;vFade=fadeSpark(age,aProps)*smoothstep(-.005,.012,inside);vColor=sparkColor(aProps);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=(1.2+aProps.w*1.8)*uPixelRatio;}`;
const headFragment=`precision highp float;in vec3 vColor;in float vFade;out vec4 outColor;void main(){vec2 p=gl_PointCoord*2.-1.;float d=length(p);float a=exp(-dot(p,p)*4.)*(1.-smoothstep(.6,1.,d))*vFade;outColor=vec4(vColor*a,a);}`;
const smokeFragment=`precision highp float;in vec3 vLocal;in vec2 vUv;out vec4 outColor;
uniform sampler3D uNoise;uniform float uTime;uniform float uStrength;uniform float uOpen;uniform float uDecay;
float noise3(vec3 p){return texture(uNoise,p*.055).r;}
float capsule(vec2 p){return length(vec2(p.x,max(abs(p.y)-.305,0.)))-.5;}
vec2 density(vec3 p){
 p.y-=uDecay*.22;
 float v=clamp((p.y-.20)/1.30,0.,1.);
 vec3 flow=p*vec3(3.6,2.8,5.)-vec3(0.,uTime*.46,0.);
 float n=noise3(flow*2.4);float fine=noise3(vec3(flow.x*7.5,flow.y*1.1,flow.z*3.)+vec3(n*2.));
 float curl=sin(v*8.-uTime*.42)*(.065+v*.19)+sin(v*13.+uTime*.22)*.035;
 float width=(.04+v*.11)*(.65+.8*noise3(flow*1.2));
 float total=0.;float highlight=0.;
 for(int j=0;j<2;j++){
  float side=j==0?-1.:1.;
  float phase=uTime*(j==0?.33:.27)+side*2.1;
  float center=side*.50*(1.-v*.52)+sin(v*7.5-phase+side*1.7)*(.045+v*.19)+sin(v*13.+phase*.6+side*4.)*(.02+v*.055)+side*uDecay*.3;
  center+=(noise3(flow*1.7+vec3(side*13.,0.,4.))-.5)*(.035+v*.14);
  float dx=(p.x-center+(n-.5)*.12)/width;
  float dz=(p.z-sin(v*7.-uTime*.19+side)*.055)/(.08+v*.075);
  float ribbon=exp(-dx*dx*.8-dz*dz*1.6);
  float folds=.5+.5*sin(dx*4.5+n*6.);float wisps=(.2+.8*fine)*(.35+.65*folds);
  float layer=j==0?1.:.32;total+=ribbon*wisps*layer;
  highlight+=ribbon*(.45+.55*fine)*layer;
 }
 float d=capsule(p.xy+vec2(sin(p.y*6.-uTime*.5)*.025,0.));
 float collar=exp(-pow(max(0.,d-.065)/.035,2.))*exp(-p.z*p.z*160.)*.055*(.3+.7*n)*(1.-smoothstep(.8,1.1,p.y));
 float outside=smoothstep(-.035,.015,d);
 float bottom=smoothstep(.08,.36,p.y);
 float top=1.-smoothstep(1.25,1.70,p.y);
 float opening=1.-smoothstep(.72+uOpen*.7,1.0+uOpen*.7,p.y);
 float mass=(total*bottom*top*opening+collar)*outside;
 return vec2(mass,highlight);
}
void main(){vec3 p=vec3(vLocal.xy,.55);vec3 color=vec3(0.);float transmission=1.;const float stepSize=1.1/30.;for(int k=0;k<30;k++){vec2 f=density(p);float a=1.-exp(-f.x*3.8*stepSize);vec3 tint=mix(vec3(.24,.13,.54),vec3(1.05,.82,1.5),clamp(f.y*.8,0.,1.));color+=transmission*a*tint;transmission*=1.-a;p.z-=stepSize;if(transmission<.03)break;}float edge=smoothstep(0.,.06,vUv.x)*smoothstep(0.,.06,1.-vUv.x)*smoothstep(0.,.07,vUv.y)*smoothstep(0.,.07,1.-vUv.y);outColor=vec4(color*uStrength*edge,(1.-transmission)*uStrength*edge);}`;
const haloFragment=`precision highp float;in vec2 vUv;in vec3 vLocal;out vec4 outColor;uniform vec3 uTint;uniform float uStrength;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*3.5)*uStrength;outColor=vec4(uTint*a,a);}`;
const tintRim=rimFragment.replace('uniform float uStrength;','uniform float uStrength;uniform vec3 uTint;').replace('vec3(1.5,.055,.022)','uTint');
const tintFloor=floorFragment.replace('uniform float uStrength;','uniform float uStrength;uniform vec3 uTint;').replace('vec3(.48,.008,.012)','uTint');
const tintSurface=surfaceFragment.replace('uniform sampler2D uPalette;','uniform sampler2D uPalette;uniform vec3 uDark;').replace('vec3(.24,.025,.07)','uDark');
const blend={blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,transparent:true,depthWrite:false,depthTest:false,toneMapped:false};
const config={
 1:{base:[28,156,113],dark:[.035,.21,.14],rim:[.48,1.25,.58],floor:[.04,.28,.09],blobs:[{p:[.12,.18],r:[.8,.7],c:[225,222,155]},{p:[.92,.18],r:[.7,.7],c:[92,211,154]},{p:[.16,.95],r:[.7,.8],c:[10,115,85]},{p:[.98,.92],r:[.6,.7],c:[218,223,161]}]},
 4:{base:[148,103,180],dark:[.14,.055,.23],rim:[.78,.45,1.5],floor:[.15,.055,.28],blobs:[{p:[.12,.12],r:[.8,.7],c:[211,183,217]},{p:[.94,.2],r:[.7,.7],c:[166,151,218]},{p:[.12,.98],r:[.7,.8],c:[103,43,159]},{p:[.95,.85],r:[.65,.75],c:[221,171,207]}]}
};
function paletteFor(cfg){const pixels=new Uint8Array(5*6*4);let offset=0;for(let y=0;y<6;y++)for(let x=0;x<5;x++){let col=[...cfg.base];for(const b of cfg.blobs){let dx=(x/4-b.p[0])/b.r[0],dy=(y/5-b.p[1])/b.r[1],a=Math.exp(-(dx*dx+dy*dy)*2.)*.9;col=col.map((v,k)=>v*(1-a)+b.c[k]*a)}pixels.set([...col.map(Math.round),255],offset);offset+=4;}let t=new THREE.DataTexture(pixels,5,6,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
function shader(fragment,uniforms,options={}){return new THREE.ShaderMaterial({...blend,glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:fragment,uniforms,...options});}
function randomProps(count){let seed=17431,result=new Float32Array(count*4);for(let i=0;i<result.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;result[i]=seed/4294967296;}return result;}

export class FestivalEffects{
 constructor(stage){this.stage=stage;this.cards=new Map();for(const index of [1,4])this.cards.set(index,this.createCard(index));}
 handles(index){return this.cards.has(index);}
 createCard(index){const cfg=config[index],group=new THREE.Group(),mirror=new THREE.Group();this.stage.scene.add(group,mirror);const palette=paletteFor(cfg);
 const su={uTime:{value:0},uFill:{value:0},uOpacity:{value:1},uReflection:{value:0},uPalette:{value:palette},uDark:{value:new THREE.Vector3(...cfg.dark)}};
 const faceMaterial=shader(tintSurface,su,{blending:THREE.NormalBlending});const face=new THREE.Mesh(new THREE.PlaneGeometry(1,1.61),faceMaterial);face.renderOrder=2;group.add(face);
 const ru={uStrength:{value:0},uTint:{value:new THREE.Vector3(...cfg.rim)}};const rimGeo=new THREE.PlaneGeometry(1.12,1.73);rimGeo.translate(0,0,.1);const rim=new THREE.Mesh(rimGeo,shader(tintRim,ru));rim.renderOrder=3;group.add(rim);
 const mirrorMaterial=faceMaterial.clone();mirrorMaterial.uniforms=THREE.UniformsUtils.clone(su);mirrorMaterial.uniforms.uPalette.value=palette;mirrorMaterial.uniforms.uReflection.value=1;const faceMirror=new THREE.Mesh(face.geometry,mirrorMaterial);faceMirror.renderOrder=0;mirror.add(faceMirror);
 const fu={uStrength:{value:0},uTint:{value:new THREE.Vector3(...cfg.floor)}};const floor=new THREE.Mesh(new THREE.PlaneGeometry(3,.22),shader(tintFloor,fu));floor.renderOrder=0;this.stage.scene.add(floor);
 const hu={uStrength:{value:0},uTint:{value:new THREE.Vector3(...cfg.floor)}};const halo=new THREE.Mesh(new THREE.PlaneGeometry(3.3,3.5),shader(haloFragment,hu));halo.renderOrder=0;group.add(halo);
 const card={index,group,mirror,palette,su,ru,fu,hu,floor,mirrorMaterial,face,objects:[face,rim,halo,floor,faceMirror]};
 if(index===1)this.createFountain(card);else this.createSmoke(card);
 return card;
 }
 createFountain(card){const count=112,segments=12,positions=[],uv=[],indices=[];for(let j=0;j<=segments;j++){positions.push(-1,j/segments,0,1,j/segments,0);uv.push(0,j/segments,1,j/segments);if(j<segments){let n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}}const props=randomProps(count),geo=new THREE.InstancedBufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('aProps',new THREE.InstancedBufferAttribute(props,4));geo.setIndex(indices);geo.instanceCount=count;
 const uniforms={uAge:{value:0},uStrength:{value:0},uPixelRatio:{value:1}};const trails=new THREE.Mesh(geo,new THREE.ShaderMaterial({...blend,glslVersion:THREE.GLSL3,vertexShader:trailVertex,fragmentShader:trailFragment,uniforms}));trails.frustumCulled=false;trails.renderOrder=1;card.group.add(trails);
 const headGeo=new THREE.BufferGeometry();headGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));headGeo.setAttribute('aProps',new THREE.BufferAttribute(props,4));const heads=new THREE.Points(headGeo,new THREE.ShaderMaterial({...blend,glslVersion:THREE.GLSL3,vertexShader:headVertex,fragmentShader:headFragment,uniforms}));heads.frustumCulled=false;heads.renderOrder=4;card.group.add(heads);
 card.uniforms=uniforms;card.effectObjects=[trails,heads];card.objects.push(trails,heads);
 // A mirrored draw uses the same trajectories with a dimmer uniform set.
 const mirrorUniforms=THREE.UniformsUtils.clone(uniforms),mirrorTrails=new THREE.Mesh(geo,trails.material.clone());mirrorTrails.material.uniforms=mirrorUniforms;mirrorTrails.frustumCulled=false;mirrorTrails.renderOrder=0;card.mirror.add(mirrorTrails);card.mirrorEffects=mirrorUniforms;card.mirrorTrails=mirrorTrails;
 }
 createSmoke(card){const uniforms={uNoise:{value:this.stage.noise},uTime:{value:0},uStrength:{value:0},uOpen:{value:0},uDecay:{value:0}};const geo=new THREE.BoxGeometry(2.5,3.6,1.1);geo.translate(0,.6,0);const mesh=new THREE.Mesh(geo,shader(smokeFragment,uniforms));mesh.renderOrder=1;card.group.add(mesh);card.uniforms=uniforms;card.effectObjects=[mesh];card.objects.push(mesh);const mirrorMaterial=mesh.material.clone();mirrorMaterial.uniforms=THREE.UniformsUtils.clone(uniforms);mirrorMaterial.uniforms.uNoise.value=this.stage.noise;const mirrorSmoke=new THREE.Mesh(geo,mirrorMaterial);mirrorSmoke.renderOrder=0;card.mirror.add(mirrorSmoke);card.mirrorEffects=mirrorMaterial.uniforms;card.mirrorSmoke=mirrorSmoke;
 }
 begin(){for(const card of this.cards.values()){card.group.visible=card.mirror.visible=card.floor.visible=false;}}
 update(index,{x,y,w,fill,visibility,time,life,floor}){const card=this.cards.get(index);if(!card)return;const {W,H}=this.stage;card.group.visible=true;card.group.position.set(x-W/2,H/2-y,0);card.group.scale.setScalar(w);card.su.uTime.value=time;card.su.uFill.value=fill;card.su.uOpacity.value=visibility*(.76+.24*fill);card.ru.uStrength.value=(.03+Math.max(fill*.66,life.decay*.34*(1-life.decay)))*visibility;card.hu.uStrength.value=life.strength*.015;
 for(const o of card.effectObjects)o.visible=life.strength>.004;if(card.mirrorSmoke)card.mirrorSmoke.visible=life.strength>.004;if(card.mirrorTrails)card.mirrorTrails.visible=life.strength>.004;
 const u=card.uniforms,mu=card.mirrorEffects;
 if(index===1){u.uAge.value=life.age;u.uStrength.value=life.strength*visibility;u.uPixelRatio.value=Math.min(devicePixelRatio||1,1.5);mu.uAge.value=life.age;mu.uStrength.value=life.strength*visibility*.065;}else{u.uTime.value=time;u.uStrength.value=life.strength*visibility*.70;u.uOpen.value=life.open;u.uDecay.value=life.decay;mu.uTime.value=time;mu.uStrength.value=life.strength*visibility*.055;mu.uOpen.value=life.open;mu.uDecay.value=life.decay;}
 card.mirror.visible=W>=640;card.mirror.position.set(x-W/2,H/2-(2*floor-y),0);card.mirror.scale.set(w,-w,w);card.mirrorMaterial.uniforms.uTime.value=time;card.mirrorMaterial.uniforms.uFill.value=fill;card.mirrorMaterial.uniforms.uOpacity.value=visibility*(.012+.12*fill);
 card.floor.visible=life.strength>.004;card.floor.position.set(x-W/2,H/2-floor,0);card.floor.scale.setScalar(w);card.fu.uStrength.value=life.strength*.12;
 }
 dispose(){for(const c of this.cards.values()){c.palette.dispose();for(const o of c.objects){o.geometry.dispose();o.material.dispose()}c.mirrorMaterial.dispose();c.mirrorTrails?.material.dispose();c.mirrorSmoke?.material.dispose();this.stage.scene.remove(c.group,c.mirror,c.floor)}}
}
