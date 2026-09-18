import * as THREE from 'three';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class Modern3DRenderSystem{
  constructor(game,{minPixelRatio=1,maxPixelRatio=2,targetFrameMs=16.7}={}){
    this.game=game;
    this.renderer=game.renderer;
    this.minPixelRatio=minPixelRatio;
    this.maxPixelRatio=Math.min(maxPixelRatio,window.devicePixelRatio||1);
    this.targetFrameMs=targetFrameMs;
    this.samples=0;
    this.frameMs=targetFrameMs;
    this.accum=0;
    this.lastAdjust=0;
    this.quality='high';
    this.configure();
  }

  configure(){
    const r=this.renderer;
    r.outputColorSpace=THREE.SRGBColorSpace;
    r.toneMapping=THREE.ACESFilmicToneMapping;
    r.toneMappingExposure=1.05;
    r.setPixelRatio(this.maxPixelRatio);
    r.shadowMap.enabled=true;
    r.shadowMap.type=THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate=true;
    r.info.autoReset=true;
    r.domElement.style.display='block';
    r.domElement.style.width='100%';
    r.domElement.style.height='100%';
  }

  setQuality(next){
    const levels={ultra:2,high:1.75,medium:1.35,low:1};
    const ratio=clamp(levels[next]||1.35,this.minPixelRatio,this.maxPixelRatio);
    this.quality=next;
    this.renderer.setPixelRatio(ratio);
    this.game.events.emit('render:quality',{quality:next,pixelRatio:ratio},{source:'modern-3d-render',priority:35});
  }

  update(dt=.016){
    const ms=clamp(dt*1000,.1,100);
    this.frameMs=this.frameMs*.9+ms*.1;
    this.samples++;
    this.accum+=dt;
    if(this.accum<2)return;
    this.accum=0;
    const ratio=this.renderer.getPixelRatio();
    if(this.frameMs>24&&ratio>this.minPixelRatio+0.05)this.renderer.setPixelRatio(Math.max(this.minPixelRatio,ratio-.15));
    else if(this.frameMs<14&&ratio<this.maxPixelRatio-0.05)this.renderer.setPixelRatio(Math.min(this.maxPixelRatio,ratio+.1));
    this.quality=ratio>=1.9?'ultra':ratio>=1.6?'high':ratio>=1.2?'medium':'low';
    this.game.state.update({renderQuality:{quality:this.quality,pixelRatio:Number(this.renderer.getPixelRatio().toFixed(2)),frameMs:Number(this.frameMs.toFixed(2))}},'modern-3d-render');
  }

  resize(){
    const r=this.renderer;
    r.setSize(window.innerWidth,window.innerHeight,false);
  }

  snapshot(){
    return {quality:this.quality,pixelRatio:this.renderer.getPixelRatio(),frameMs:this.frameMs,samples:this.samples};
  }
}
