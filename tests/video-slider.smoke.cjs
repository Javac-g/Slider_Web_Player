const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

class Element {
  constructor(){this._attrs={};this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.textContent='';this.children=[];this.className='';this._paused=true;}
  setAttribute(k,v){this._attrs[k]=v}
  getAttribute(k){return this._attrs[k]??null}
  hasAttribute(k){return Object.hasOwn(this._attrs,k)}
  removeAttribute(k){delete this._attrs[k]}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  append(...children){for(const child of children)this.appendChild(child)}
  appendChild(el){this.children.push(el);return el}
  click(){for(const fn of (this.listeners.click||[])) fn({stopPropagation(){}})}
}
class Video extends Element {
 constructor(src){super();this.dataset.src=src;this._paused=true;this.readyState=1;this.loads=0;this.plays=0;this.pauses=0;this.muted=true;}
 get paused(){return this._paused}
 load(){this.loads++}
 pause(){this._paused=true;this.pauses++}
 play(){this._paused=false;this.plays++;return Promise.resolve()}
}
const slides=Array.from({length:5},(_,i)=>{
 const video=new Video(`./video/${i+1}.mp4`);
 const box=new Element();
 return {video,box,querySelector(name){if(name==='.video-slider__video')return video;if(name==='.video-slider__video-box')return box;return null}};
});
const slider=new Element();
slider.querySelectorAll=()=>slides.map(s=>s.video);
const document={addEventListener(type,fn){if(type==='DOMContentLoaded')this.onReady=fn},querySelector(name){return name==='.video-slider'?slider:null},createElement(){return new Element()}};
const window={addEventListener(){}};
class Swiper {
 constructor(slider,options){this.slides=slides;this.activeIndex=0;this.params=options;this.options=options;Swiper.current=this;options.on.init.call(this)}
 slideTo(i){this.activeIndex=i;this.options.on.slideChange.call(this)}
 slideNext(){this.slideTo(this.activeIndex+1)}
 slidePrev(){this.slideTo(this.activeIndex-1)}
 update(){}
}
const errors=[];
vm.runInNewContext(fs.readFileSync(__dirname+'/../js/script.js','utf8'),{document,window,Swiper,setTimeout:()=>{},console:{error:(...args)=>errors.push(args),debug(){}}});
document.onReady();
const videos=slides.map(s=>s.video);
assert.equal(videos[0].plays,1,'first video should play on initial load');
assert.equal(videos[0].muted,true,'first video should be muted');
assert.deepEqual(videos.map(v=>v.hasAttribute('src')),[true,true,false,false,false]);
const controls=slides[0].box.children[0];
const [sound,retry,notice]=controls.children;
assert.equal(sound.textContent,'Enable sound');
sound.click();
assert.equal(videos[0].muted,false,'tap enables sound');
assert.equal(sound.textContent,'Mute');
Swiper.current.slideTo(1);
assert.equal(videos[1].plays,1,'swipe plays second video');
assert.equal(videos[1].muted,false,'explicit sound opt-in should persist when allowed');
assert.equal(videos[0].paused,true);
assert.equal(videos[0].muted,true,'prior video remuted');
assert.deepEqual(videos.map(v=>v.hasAttribute('src')),[true,true,true,false,false]);
videos[4].play=function(){this.plays++;return this.muted?Promise.resolve():Promise.reject({name:'NotAllowedError',message:'Sound autoplay blocked'})};
Swiper.current.slideTo(4);
assert.equal(videos[4].plays,1);
assert.deepEqual(videos.map(v=>v.hasAttribute('src')),[false,false,false,true,true]);
assert.equal(errors.length,0);
// iOS-style audible-autoplay rejection should retry silently, still muted.
setImmediate(()=>{
  assert.equal(videos[4].muted,true,'blocked audible autoplay should fall back to muted');
  assert.equal(videos[4].plays,2,'muted fallback should retry playback');
  // Rejected muted autoplay must expose a tap-based fallback.
  videos[3].play=function(){this.plays++;return Promise.reject({name:'NotAllowedError',message:'Autoplay blocked'})};
  Swiper.current.slideTo(3);
  setImmediate(()=>{
    assert.equal(retry.hidden,false,'a manual play action should be shown');
    assert.equal(notice.hidden,false,'playback failure notice should be visible');
    // Media errors should be reported without removing the archive entry.
    videos[3].error={code:4};
    for (const handler of (videos[3].listeners.error||[])) handler();
    assert.equal(sound.disabled,true,'sound should not be enabled for an invalid media source');
    assert.equal(notice.textContent,'Video unavailable');
    console.log('PASS: initial muted autoplay, persistent opt-in audio, iOS muted fallback, lazy-loading, unavailable-media and playback-error fallback checks');
  });
});
