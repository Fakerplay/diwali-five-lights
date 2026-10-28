import * as THREE from 'three';
import { EffectComposer } from './vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/three/addons/postprocessing/OutputPass.js';

const vertex=`out vec3 vLocal;out vec2 vUv;
void main(){vLocal=position;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fireFragment=`precision highp float;
in vec3 vLocal;in vec2 vUv;out vec4 outColor;
uniform sampler3D uNoise;uniform float uTime;uniform float uStrength;uniform float uOpen;
float noise3(vec3 p){return texture(uNoise,p*.055).r;}
float fbm(vec3 p){return .55*noise3(p)+.29*noise3(p*2.03+7.1)+.16*noise3(p*4.07+13.7);}
float capsule(vec2 p){return length(vec2(p.x,max(abs(p.y)-.305,0.)))-.5;}
vec2 field(vec3 p){
 float d=capsule(p.xy);
 // Emitter is the upper semicircle and its shoulders, never a straight strip.
 float root=.305+sqrt(max(0.,.25-min(p.x*p.x,.25)));
 float rise=max(0.,p.y-root);
 float height=(.74-.20*clamp(abs(p.x)/.8,0.,1.))*(.35+.65*uOpen);
 vec3 flow=p*vec3(1.,1.1,1.7)-vec3(0.,uTime*.8,0.);
 vec3 warp=vec3(fbm(flow*1.2+vec3(3.,0.,0.)),fbm(flow+vec3(0.,0.,7.)),fbm(flow+vec3(9.,4.,0.)))-.5;
 float n=fbm(flow*3.5+warp*2.4);
 float shape=1.-rise/max(.06,height)+(n-.5)*1.4;
 float tongues=smoothstep(-.12,.5,shape);
 float width=1.-smoothstep(.46,.83,abs(p.x+warp.x*rise*.32));
 float dz=p.z/(.15+rise*.16);float depth=exp(-dz*dz*2.5);
 float upper=smoothstep(.02,.30,p.y);
 float outside=smoothstep(-.025,.025,d);
 float collar=exp(-max(d,0.)*20.)*upper;
 float body=max(tongues*width,collar*.9)*depth*upper*outside;
 float temperature=clamp(collar*.78+max(0.,1.-rise/max(height,.1))*.55+(n-.5)*.24,0.,1.);
 return vec2(body,temperature);
}
void main(){
 vec3 p=vec3(vLocal.xy,.57);vec3 sum=vec3(0.);float transmission=1.;
 const float stepSize=1.14/36.;
 for(int i=0;i<36;i++){
  vec2 f=field(p);float density=f.x*8.5;
  float opacity=1.-exp(-density*stepSize);
  vec3 color=mix(vec3(.64,.018,.003),vec3(2.2,.31,.035),smoothstep(.12,.65,f.y));
  color=mix(color,vec3(4.4,2.9,1.7),smoothstep(.63,.99,f.y));
  sum+=transmission*opacity*color;
  transmission*=1.-opacity;
  p.z-=stepSize;if(transmission<.025)break;
 }
 float edge=smoothstep(.0,.05,vUv.x)*smoothstep(.0,.05,1.-vUv.x)*smoothstep(.0,.05,vUv.y)*smoothstep(.0,.05,1.-vUv.y);
 outColor=vec4(sum*uStrength*edge,(1.-transmission)*uStrength*edge);
}`;
const surfaceFragment=`precision highp float;
in vec3 vLocal;in vec2 vUv;out vec4 outColor;
uniform float uTime;uniform float uFill;uniform float uOpacity;
float gauss(vec2 p,vec2 center,vec2 radius){vec2 q=(p-center)/radius;return exp(-dot(q,q)*2.);}
void main(){vec2 p=vec2(vUv.x-.5,(vUv.y-.5)*1.61);float d=length(vec2(p.x,max(abs(p.y)-.305,0.)))-.5;float mask=1.-smoothstep(-fwidth(d),fwidth(d),d);if(mask<.005)discard;
vec3 dark=mix(vec3(.015,.009,.014),vec3(.24,.025,.07),pow(1.-vUv.y,3.));
float drift=sin(uTime*.23)*.03;
vec3 col=vec3(.73,.25,.40);
col=mix(col,vec3(.79,.42,.65),gauss(vUv,vec2(.12+drift,.83),vec2(.65,.72))*.95);
col=mix(col,vec3(.86,.65,.40),gauss(vUv,vec2(.93,.76),vec2(.65,.7))*.9);
col=mix(col,vec3(.77,.075,.35),gauss(vUv,vec2(.24,.18),vec2(.65,.7))*.86);
col=mix(col,vec3(.94,.67,.57),gauss(vUv,vec2(1.02+drift,.03),vec2(.65,.65))*.88);
float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
col+=grain*.012;
vec3 srgb=mix(dark,col,uFill);vec3 linear=pow(max(srgb,vec3(0.)),vec3(2.2));
outColor=vec4(linear,mask*uOpacity);
}`;
const sparkVertex=`in float aSeed;in float aDrift;in float aSize;out float vFade;out float vSeed;
uniform float uTime;uniform float uStrength;uniform float uPixelRatio;
void main(){float life=fract(uTime*(.40+aDrift*.16)+aSeed);float theta=(aSeed-.5)*3.1;vec3 root=vec3(sin(theta)*.53,.305+cos(theta)*.53,0.);vec3 p=root+vec3((aDrift-.5)*life*.45,life*(.7+aSeed*.45),.04);p.x+=sin(uTime*.7+aSeed*60.)*life*.025;vFade=sin(life*3.14159265)*uStrength;vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=(1.15+aSize*2.1)*uPixelRatio;}`;
const sparkFragment=`precision highp float;in float vFade;in float vSeed;out vec4 outColor;
float segment(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
void main(){vec2 p=gl_PointCoord*2.-1.;float mask;if(vSeed>.91){float d=min(segment(p,vec2(0.,-.75),vec2(.7,.6)),min(segment(p,vec2(.7,.6),vec2(-.7,.6)),segment(p,vec2(-.7,.6),vec2(0.,-.75))));mask=1.-smoothstep(.07,.18,d);}else{float d=length(p);mask=exp(-d*d*4.5)*(1.-smoothstep(.7,1.,d));}outColor=vec4(vec3(2.1,1.25,.69)*mask*vFade,mask*vFade);}`;

export class DiyaRenderer{
 constructor(container){
  this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
  this.renderer.setClearColor(0x000000,1);this.renderer.toneMapping=THREE.NoToneMapping;
  this.renderer.domElement.id='diya-webgl';this.renderer.domElement.setAttribute('aria-hidden','true');
  container.insertBefore(this.renderer.domElement,container.querySelector('#cards'));
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);this.camera.position.z=10;
  const noiseData=new Uint8Array(64*64*64);let seed=7431;for(let i=0;i<noiseData.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noiseData[i]=seed>>>24;}
  this.noise=new THREE.Data3DTexture(noiseData,64,64,64);this.noise.format=THREE.RedFormat;this.noise.type=THREE.UnsignedByteType;this.noise.minFilter=this.noise.magFilter=THREE.LinearFilter;this.noise.wrapS=this.noise.wrapT=this.noise.wrapR=THREE.RepeatWrapping;this.noise.unpackAlignment=1;this.noise.needsUpdate=true;
  const additive={blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,transparent:true,depthWrite:false,depthTest:false,toneMapped:false};
  this.fireUniforms={uNoise:{value:this.noise},uTime:{value:0},uStrength:{value:1},uOpen:{value:1}};
  const material=new THREE.ShaderMaterial({...additive,glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:fireFragment,uniforms:this.fireUniforms});
  const geometry=new THREE.BoxGeometry(2.2,3.1,1.14);geometry.translate(0,.45,0);
  this.fire=new THREE.Mesh(geometry,material);this.fire.renderOrder=1;this.scene.add(this.fire);
  this.surfaceUniforms={uTime:{value:0},uFill:{value:1},uOpacity:{value:1}};
  const surfaceMaterial=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:surfaceFragment,uniforms:this.surfaceUniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  this.surface=new THREE.Mesh(new THREE.PlaneGeometry(1,1.61),surfaceMaterial);this.surface.renderOrder=2;this.scene.add(this.surface);
  const rimPath=new THREE.CurvePath();const points=[];
  for(let i=0;i<=160;i++){let a=i/160*Math.PI*2;let x=Math.cos(a)*.505,y=Math.sin(a)*.505+(Math.sin(a)>=0?.305:-.305);points.push(new THREE.Vector3(x,y,.05));}
  // A closed capsule path includes the two straight sides, not an elliptical outline.
  const shape=new THREE.Shape();shape.moveTo(.505,-.305);shape.lineTo(.505,.305);shape.absarc(0,.305,.505,0,Math.PI,false);shape.lineTo(-.505,-.305);shape.absarc(0,-.305,.505,Math.PI,Math.PI*2,false);
  const rimGeo=new THREE.BufferGeometry().setFromPoints(shape.getPoints(180).map(p=>new THREE.Vector3(p.x,p.y,.1)));
  this.rimMaterial=new THREE.LineBasicMaterial({color:new THREE.Color(2.6,.78,.29),transparent:true,opacity:1,depthTest:false,toneMapped:false,blending:THREE.AdditiveBlending});this.rim=new THREE.LineLoop(rimGeo,this.rimMaterial);this.rim.renderOrder=3;this.scene.add(this.rim);
  const count=64,sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));for(const name of ['aSeed','aDrift','aSize']){let values=new Float32Array(count);for(let i=0;i<count;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;values[i]=seed/4294967296;}sparkGeo.setAttribute(name,new THREE.BufferAttribute(values,1));}
  this.sparkUniforms={uTime:{value:0},uStrength:{value:1},uPixelRatio:{value:1}};
  this.sparks=new THREE.Points(sparkGeo,new THREE.ShaderMaterial({...additive,glslVersion:THREE.GLSL3,vertexShader:sparkVertex,fragmentShader:sparkFragment,uniforms:this.sparkUniforms}));this.sparks.frustumCulled=false;this.sparks.renderOrder=4;this.scene.add(this.sparks);
  this.reflection=new THREE.Mesh(geometry,material.clone());this.reflection.material.uniforms=THREE.UniformsUtils.clone(this.fireUniforms);this.reflection.material.uniforms.uNoise.value=this.noise;this.reflection.renderOrder=0;this.scene.add(this.reflection);
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
  this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.72,.38,.85);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.renderer.domElement.dataset.engine='Three.js r180';this.renderer.compile(this.scene,this.camera);
 }
 resize(width,height){this.W=width;this.H=height;const dpr=Math.min(devicePixelRatio||1,width<640?1.25:1.5);this.renderer.setPixelRatio(dpr);this.renderer.setSize(width,height);this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();this.composer.setPixelRatio(dpr);this.composer.setSize(width,height);this.sparkUniforms.uPixelRatio.value=dpr;}
 begin(){for(const o of [this.fire,this.surface,this.rim,this.sparks,this.reflection])o.visible=false;}
 update({x,y,w,fill,visibility,time,life,floor}){let screenX=x-this.W/2,screenY=this.H/2-y;for(const o of [this.fire,this.surface,this.rim,this.sparks]){o.position.set(screenX,screenY,0);o.scale.setScalar(w);o.visible=true;}
  this.fire.visible=life.strength>.004;this.sparks.visible=life.strength>.004;this.fireUniforms.uTime.value=time;this.fireUniforms.uStrength.value=life.strength*visibility;this.fireUniforms.uOpen.value=Math.max(.04,life.open)*(1-life.decay*.35);
  this.surfaceUniforms.uTime.value=time;this.surfaceUniforms.uFill.value=fill;this.surfaceUniforms.uOpacity.value=visibility*(.76+.24*fill);this.rimMaterial.opacity=fill*.75;
  this.sparkUniforms.uTime.value=time;this.sparkUniforms.uStrength.value=life.strength*visibility;
  this.reflection.visible=this.W>=640&&life.strength>.004;this.reflection.position.set(screenX,this.H/2-(2*floor-y),0);this.reflection.scale.set(w,-w,w);this.reflection.material.uniforms.uTime.value=time;this.reflection.material.uniforms.uStrength.value=life.strength*.08;this.reflection.material.uniforms.uOpen.value=life.open;
 }
 render(){this.composer.render();this.renderer.domElement.dataset.fireStrength=this.fireUniforms.uStrength.value.toFixed(3);}
 dispose(){this.noise.dispose();for(const o of [this.fire,this.surface,this.rim,this.sparks]){o.geometry.dispose();o.material.dispose()}this.reflection.material.dispose();this.composer.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
