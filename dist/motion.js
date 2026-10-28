/* One clock owns both DOM and effects, including their overlapping lifecycles. */
(function(scope){
const clamp=x=>Math.max(0,Math.min(1,x));
const easeOut=x=>1-Math.pow(1-clamp(x),4);
const IGNITION_DELAY=180,DECAY_DURATION=430,SLIDE_DURATION=520;
class CarouselMotion{
 constructor(count,now=0){this.count=count;this.current=0;this.started=now-SLIDE_DURATION;this.from=Array.from({length:count},(_,i)=>i>count/2?i-count:i);this.to=[...this.from];this.enter=Array(count).fill(-1e9);this.exit=Array(count).fill(-1e9);this.enter[0]=now-1800;this.exitLevel=Array(count).fill(0);}
 position(i,now){return this.from[i]+(this.to[i]-this.from[i])*easeOut((now-this.started)/SLIDE_DURATION)}
 fill(i,now){if(i===this.current)return easeOut((now-this.enter[i]-90)/350);return this.exitLevel[i]*(1-easeOut((now-this.exit[i])/300));}
 effect(i,now){if(i===this.current){let age=Math.max(0,now-this.enter[i]-IGNITION_DELAY);return {strength:easeOut(age/450),open:clamp(age/650),age:age/1000,decay:0};}let decay=clamp((now-this.exit[i])/DECAY_DURATION);return {strength:this.exitLevel[i]*(1-decay)*(1-decay),open:1,age:Math.max(0,now-this.enter[i]-IGNITION_DELAY)/1000,decay};}
 move(direction,now){let old=this.current;this.exitLevel[old]=this.effect(old,now).strength;this.exit[old]=now;let next=(old+direction+this.count)%this.count;this.current=next;this.enter[next]=now;for(let i=0;i<this.count;i++){let p=this.position(i,now),target=(i-next+this.count)%this.count;if(target>this.count/2)target-=this.count;if(Math.abs(target-p)>2){p=target+direction;}this.from[i]=p;this.to[i]=target;}this.started=now;return next;}
 settled(now){return now-this.started>=SLIDE_DURATION}
}
scope.CarouselMotion=CarouselMotion;if(typeof module!=='undefined')module.exports={CarouselMotion,IGNITION_DELAY,DECAY_DURATION};
})(typeof window!=='undefined'?window:globalThis);
