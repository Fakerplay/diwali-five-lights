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
 float root=.305+sqrt(max(0.,.25-min(p.x*p.x,.25)));
 float plumeRoot=.305+sqrt(max(0.,.25-min(p.x*p.x*.49,.25)));
 float rise=max(0.,p.y-plumeRoot);
 // Upward advection is shared by the crown and perimeter flames.
 vec3 flow=p*vec3(1.8,.85,2.2)-vec3(0.,uTime*1.35,0.);
 vec3 warp=vec3(noise3(flow*2.+3.),noise3(flow*2.+7.),noise3(flow*2.+13.))-.5;
 float n=fbm(flow*5.+warp*2.8);
 float fine=noise3(flow*vec3(15.,4.,9.)+warp*3.);
 float x=p.x+sin(p.y*5.-uTime*1.6)*rise*.065+warp.x*rise*.18;
 float fingers=.5+.5*sin(x*24.+sin(p.y*3.-uTime*1.4)*1.4+uTime*.65);
 float height=(.32+.20*fingers+.16*n+.10*(1.-smoothstep(.1,.8,abs(x))))*(.18+.82*uOpen);
 float reach=.90-rise*.28;
 float lateral=1.-smoothstep(reach-.18,reach,abs(x));
 float crown=smoothstep(-.10,.18,1.-rise/max(.04,height)+(n-.5)*.95)*lateral;
 // Shoulder fuel widens the crown; fire remains rooted to the actual curved edge.
 float shoulder=exp(-max(0.,root-p.y)*9.);
 float upper=smoothstep(-.06,.52+warp.y*.18,p.y);
 crown*=shoulder*upper;
 crown*=1.-smoothstep(.48,.85,abs(x))*(1.-smoothstep(.38,.92,p.y));
 // A turbulent skin follows the complete stadium, including lower curved corners.
 float edgeFlow=sin(p.y*19.-uTime*4.+sign(p.x)*2.)*.5+.5;
 float edgeWidth=.025+.05*edgeFlow+.025*fine;
 edgeWidth*=.55+.45*smoothstep(-.75,.55,p.y);
 float skin=1.-smoothstep(edgeWidth*.25,edgeWidth+.025,max(0.,d)+(n-.5)*.036);
 skin*=.35+.65*smoothstep(.2,.8,n+fine*.35);
 float outside=smoothstep(-.018,.015,d);
 float dz=p.z/(.16+rise*.13);float depth=exp(-dz*dz*2.3);
 float filaments=.20+.80*smoothstep(.18,.83,fine);
 float body=max(crown*filaments,skin*1.1)*outside*depth;
 float heat=clamp(.98-rise/max(height,.1)*.94+(n-.5)*.2,0.,1.);
 // Side flames stay orange-red, while the crown roots burn peach-white.
 heat=mix(.63+.16*fine,heat,clamp(crown*2.,0.,1.));
 heat*=1.-smoothstep(.07,.25,d)*.45;
 return vec2(body,heat);
}
void main(){
 vec3 p=vec3(vLocal.xy,.57);vec3 sum=vec3(0.);float transmission=1.;
 const float stepSize=1.14/36.;
 for(int i=0;i<36;i++){
  vec2 f=field(p);float density=f.x*6.6;
  float opacity=1.-exp(-density*stepSize);
  vec3 color=mix(vec3(.58,.006,.004),vec3(1.45,.055,.012),smoothstep(.12,.65,f.y));
  color=mix(color,vec3(3.1,2.05,1.7),smoothstep(.77,1.02,f.y));
  sum+=transmission*opacity*color;
  transmission*=1.-opacity;
  p.z-=stepSize;if(transmission<.025)break;
 }
 float edge=smoothstep(.0,.05,vUv.x)*smoothstep(.0,.05,1.-vUv.x)*smoothstep(.0,.05,vUv.y)*smoothstep(.0,.05,1.-vUv.y);
 outColor=vec4(sum*uStrength*edge,(1.-transmission)*uStrength*edge);
}`;
const surfaceFragment=`precision highp float;
in vec3 vLocal;in vec2 vUv;out vec4 outColor;
uniform float uTime;uniform float uFill;uniform float uOpacity;uniform float uReflection;uniform sampler2D uPalette;
float gauss(vec2 p,vec2 center,vec2 radius){vec2 q=(p-center)/radius;return exp(-dot(q,q)*2.);}
void main(){vec2 p=vec2(vUv.x-.5,(vUv.y-.5)*1.61);float d=length(vec2(p.x,max(abs(p.y)-.305,0.)))-.5;float aa=mix(fwidth(d),.035,uReflection);float mask=1.-smoothstep(-aa,aa,d);if(mask<.005)discard;
vec3 dark=mix(vec3(.015,.009,.014),vec3(.24,.025,.07),pow(1.-vUv.y,3.));
vec2 paletteUv=vec2(clamp(vUv.x+sin(uTime*.23+vUv.y*2.)*.012,0.,1.),1.-vUv.y);
vec3 col=texture(uPalette,(paletteUv*vec2(4.,5.)+.5)/vec2(5.,6.)).rgb;
float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
col+=grain*.012;
vec3 srgb=mix(dark,col,uFill);vec3 linear=pow(max(srgb,vec3(0.)),vec3(2.2));
float fade=mix(1.,pow(1.-vUv.y,2.6),uReflection);outColor=vec4(linear,mask*uOpacity*fade);
}`;
const sparkVertex=`in float aSeed;in float aDrift;in float aSize;out float vFade;out float vSeed;
uniform float uTime;uniform float uStrength;uniform float uPixelRatio;
void main(){float life=fract(uTime*(.28+aDrift*.48)+aSeed);float theta=(aSize-.5)*6.2831853;vec3 root=vec3(sin(theta)*.53,sign(cos(theta))*.305+cos(theta)*.53,0.);vec3 p=root+vec3((aDrift-.5)*life*.45,life*(.7+aSeed*.45),.04);p.x+=sin(uTime*.7+aSeed*60.)*life*.025;float edge=length(vec2(p.x,max(abs(p.y)-.305,0.)))-.5;vFade=sin(life*3.14159265)*uStrength*smoothstep(.005,.04,edge);vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=(1.15+aSize*2.1)*uPixelRatio;}`;
const sparkFragment=`precision highp float;in float vFade;in float vSeed;out vec4 outColor;
float segment(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
void main(){vec2 p=gl_PointCoord*2.-1.;float mask;if(vSeed>.91){float d=min(segment(p,vec2(0.,-.75),vec2(.7,.6)),min(segment(p,vec2(.7,.6),vec2(-.7,.6)),segment(p,vec2(-.7,.6),vec2(0.,-.75))));mask=1.-smoothstep(.07,.18,d);}else{float d=length(p);mask=exp(-d*d*4.5)*(1.-smoothstep(.7,1.,d));}outColor=vec4(vec3(2.1,1.25,.69)*mask*vFade,mask*vFade);}`;


const rimFragment=`precision highp float;in vec3 vLocal;in vec2 vUv;out vec4 outColor;uniform float uStrength;
void main(){float d=length(vec2(vLocal.x,max(abs(vLocal.y)-.305,0.)))-.5;float core=1.-smoothstep(.002,.008,abs(d));float halo=exp(-abs(d)*85.)*.22;float light=(core*.8+halo)*uStrength;outColor=vec4(vec3(1.5,.055,.022)*light,light);}`;
const floorFragment=`precision highp float;in vec3 vLocal;in vec2 vUv;out vec4 outColor;uniform float uStrength;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-p.x*p.x*3.-p.y*p.y*8.)*uStrength;outColor=vec4(vec3(.48,.008,.012)*a,a);}`;

export class DiyaRenderer{
 constructor(container){
  this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
  this.renderer.setClearColor(0x000000,1);this.renderer.toneMapping=THREE.NoToneMapping;
  this.renderer.domElement.id='diya-webgl';this.renderer.domElement.setAttribute('aria-hidden','true');
  container.insertBefore(this.renderer.domElement,container.querySelector('#cards'));
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,4000);this.camera.position.z=2000;
  const noiseData=new Uint8Array(64*64*64);let seed=7431;for(let i=0;i<noiseData.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noiseData[i]=seed>>>24;}
  this.noise=new THREE.Data3DTexture(noiseData,64,64,64);this.noise.format=THREE.RedFormat;this.noise.type=THREE.UnsignedByteType;this.noise.minFilter=this.noise.magFilter=THREE.LinearFilter;this.noise.wrapS=this.noise.wrapT=this.noise.wrapR=THREE.RepeatWrapping;this.noise.unpackAlignment=1;this.noise.needsUpdate=true;
  const additive={blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,transparent:true,depthWrite:false,depthTest:false,toneMapped:false};
  this.fireUniforms={uNoise:{value:this.noise},uTime:{value:0},uStrength:{value:1},uOpen:{value:1}};
  const material=new THREE.ShaderMaterial({...additive,glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:fireFragment,uniforms:this.fireUniforms});
  const geometry=new THREE.BoxGeometry(2.2,3.1,1.14);geometry.translate(0,.45,0);
  this.fire=new THREE.Mesh(geometry,material);this.fire.renderOrder=1;this.scene.add(this.fire);
  const paletteSamples=[[[227, 161, 140], [227, 161, 140], [227, 161, 140], [227, 161, 140], [227, 161, 140]], [[218, 114, 161], [184, 106, 149], [192, 136, 125], [190, 138, 94], [212, 152, 91]], [[203, 92, 136], [180, 74, 138], [161, 60, 82], [196, 106, 60], [202, 127, 55]], [[149, 37, 65], [178, 48, 95], [179, 51, 97], [204, 85, 102], [204, 94, 83]], [[126, 15, 40], [140, 15, 55], [175, 46, 95], [211, 120, 127], [193, 135, 118]], [[166, 42, 58], [166, 42, 58], [166, 42, 58], [166, 42, 58], [166, 42, 58]]];const palettePixels=new Uint8Array(paletteSamples.flat(2).length/3*4);let paletteIndex=0;for(const row of paletteSamples)for(const rgb of row){palettePixels.set([...rgb,255],paletteIndex);paletteIndex+=4;}
  this.palette=new THREE.DataTexture(palettePixels,5,6,THREE.RGBAFormat);this.palette.minFilter=this.palette.magFilter=THREE.LinearFilter;this.palette.needsUpdate=true;
  this.surfaceUniforms={uTime:{value:0},uFill:{value:1},uOpacity:{value:1},uReflection:{value:0},uPalette:{value:this.palette}};
  const surfaceMaterial=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:surfaceFragment,uniforms:this.surfaceUniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  this.surface=new THREE.Mesh(new THREE.PlaneGeometry(1,1.61),surfaceMaterial);this.surface.renderOrder=2;this.scene.add(this.surface);
  this.rimUniforms={uStrength:{value:1}};this.rimMaterial=new THREE.ShaderMaterial({...additive,glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:rimFragment,uniforms:this.rimUniforms});
  const rimGeometry=new THREE.PlaneGeometry(1.12,1.73);rimGeometry.translate(0,0,.1);this.rim=new THREE.Mesh(rimGeometry,this.rimMaterial);this.rim.renderOrder=3;this.scene.add(this.rim);
  this.surfaceReflection=new THREE.Mesh(this.surface.geometry,surfaceMaterial.clone());this.surfaceReflection.material.uniforms=THREE.UniformsUtils.clone(this.surfaceUniforms);this.surfaceReflection.material.uniforms.uPalette.value=this.palette;this.surfaceReflection.material.uniforms.uReflection.value=1;this.surfaceReflection.renderOrder=0;this.scene.add(this.surfaceReflection);
  this.floorUniforms={uStrength:{value:0}};this.floorWash=new THREE.Mesh(new THREE.PlaneGeometry(3,.22),new THREE.ShaderMaterial({...additive,glslVersion:THREE.GLSL3,vertexShader:vertex,fragmentShader:floorFragment,uniforms:this.floorUniforms}));this.floorWash.renderOrder=0;this.scene.add(this.floorWash);
  const count=112,sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));for(const name of ['aSeed','aDrift','aSize']){let values=new Float32Array(count);for(let i=0;i<count;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;values[i]=seed/4294967296;}sparkGeo.setAttribute(name,new THREE.BufferAttribute(values,1));}
  this.sparkUniforms={uTime:{value:0},uStrength:{value:1},uPixelRatio:{value:1}};
  this.sparks=new THREE.Points(sparkGeo,new THREE.ShaderMaterial({...additive,glslVersion:THREE.GLSL3,vertexShader:sparkVertex,fragmentShader:sparkFragment,uniforms:this.sparkUniforms}));this.sparks.frustumCulled=false;this.sparks.renderOrder=4;this.scene.add(this.sparks);
  this.reflection=new THREE.Mesh(geometry,material.clone());this.reflection.material.uniforms=THREE.UniformsUtils.clone(this.fireUniforms);this.reflection.material.uniforms.uNoise.value=this.noise;this.reflection.renderOrder=0;this.scene.add(this.reflection);
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
  this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.36,.18,1.05);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.renderer.domElement.dataset.engine='Three.js r180';this.renderer.compile(this.scene,this.camera);
 }
 resize(width,height){this.W=width;this.H=height;const dpr=Math.min(devicePixelRatio||1,width<640?1.15:1.25);this.renderer.setPixelRatio(dpr);this.renderer.setSize(width,height);this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();this.composer.setPixelRatio(dpr);this.composer.setSize(width,height);this.sparkUniforms.uPixelRatio.value=dpr;}
 begin(){for(const o of [this.fire,this.surface,this.rim,this.sparks,this.reflection,this.surfaceReflection,this.floorWash])o.visible=false;}
 update({x,y,w,fill,visibility,time,life,floor}){let screenX=x-this.W/2,screenY=this.H/2-y;for(const o of [this.fire,this.surface,this.rim,this.sparks]){o.position.set(screenX,screenY,0);o.scale.setScalar(w);o.visible=true;}
  this.fire.visible=life.strength>.004;this.sparks.visible=life.strength>.004;this.fireUniforms.uTime.value=time;this.fireUniforms.uStrength.value=life.strength*visibility;this.fireUniforms.uOpen.value=Math.max(.04,life.open)*(1-life.decay*.35);
  this.surfaceUniforms.uTime.value=time;this.surfaceUniforms.uFill.value=fill;this.surfaceUniforms.uOpacity.value=visibility*(.76+.24*fill);this.rimUniforms.uStrength.value=(.035+fill*.65)*visibility;
  this.sparkUniforms.uTime.value=time;this.sparkUniforms.uStrength.value=life.strength*visibility;
  this.surfaceReflection.visible=this.W>=640;this.surfaceReflection.position.set(screenX,this.H/2-(2*floor-y),0);this.surfaceReflection.scale.set(w,-w,w);const reflect=this.surfaceReflection.material.uniforms;reflect.uTime.value=time;reflect.uFill.value=fill;reflect.uOpacity.value=visibility*(.012+.12*fill);
  this.floorWash.visible=life.strength>.004;this.floorWash.position.set(screenX,this.H/2-floor,0);this.floorWash.scale.setScalar(w);this.floorUniforms.uStrength.value=life.strength*.09;
  this.reflection.visible=this.W>=640&&life.strength>.004;this.reflection.position.set(screenX,this.H/2-(2*floor-y),0);this.reflection.scale.set(w,-w,w);this.reflection.material.uniforms.uTime.value=time;this.reflection.material.uniforms.uStrength.value=life.strength*.08;this.reflection.material.uniforms.uOpen.value=life.open;
 }
 render(){const now=performance.now();if(this.lastRender){this.frameMs=(this.frameMs||16.7)*.95+(now-this.lastRender)*.05;this.renderer.domElement.dataset.frameMs=this.frameMs.toFixed(1);}this.lastRender=now;this.composer.render();this.renderer.domElement.dataset.fireStrength=this.fireUniforms.uStrength.value.toFixed(3);}
 dispose(){this.noise.dispose();this.palette.dispose();this.surfaceReflection.material.dispose();this.floorWash.geometry.dispose();this.floorWash.material.dispose();for(const o of [this.fire,this.surface,this.rim,this.sparks]){o.geometry.dispose();o.material.dispose()}this.reflection.material.dispose();this.composer.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}

export { vertex, surfaceFragment, rimFragment, floorFragment };
