const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICT_ANCHORS={
  Kimironko:[30.114,-1.936],Remera:[30.116,-1.953],Kacyiru:[30.092,-1.925],
  Kimihurura:[30.09,-1.95],KigaliCBD:[30.061,-1.944],Nyamirambo:[30.043,-1.969],
  Rebero:[30.09,-1.99]
};
const DEG=Math.PI/180;

export class PhysicalDeliverySystem{
  constructor(game){
    this.game=game;this.tick=0;this.state=game.state.get().physicalDelivery||this.empty();
    this.bind();this.sync();
  }
  empty(){return{active:null,history:[],updatedAt:0};}
  bind(){
    this.game.events.on('cargo:order-loaded',e=>this.start(e));
    this.game.events.on('geo:roads-loaded',()=>{if(this.state.active)this.rebuildRoute();});
    this.game.events.on('vehicle:changed',()=>{if(this.state.active)this.syncVehicle();});
  }
  worldPoint(district){
    const geo=this.game.geo;if(!geo)return null;
    const a=DISTRICT_ANCHORS[district];if(!a)return null;
    return geo.project((a[0]-geo.origin.lon)*6378137*DEG/Math.cos(geo.origin.lat*DEG),2*6378137*Math.log(Math.tan(Math.PI/4+(a[1]*DEG)/2)));
  }
  playerPosition(){
    const v=this.game.vehicles.active;return (v?.mesh||this.game.player)?.position||null;
  }
  syncVehicle(){
    if(!this.state.active)return;
    const v=this.game.vehicles.active;
    this.state.active.vehicle=v?.name||null;
    this.state.active.capacity=this.game.cargoSupplyChain?.state?.cargo?.capacity||6;
    this.sync();
  }
  rebuildRoute(){
    const a=this.state.active;if(!a)return;
    const graph=this.game.geo?.graph;
    if(!graph||!this.game.geo.loaded)return;
    const p=this.playerPosition(),target=this.worldPoint(a.to);
    if(!p||!target)return;
    const start=graph.nearest(p.x,p.z),goal=graph.nearest(target.x,target.z);
    if(!start||!goal)return;
    const route=graph.findPath?graph.findPath(start,goal):[start,goal];
    a.route=route.map(n=>({x:n.x,z:n.z}));
    a.routeIndex=0;a.routeDistance=this.pathDistance(a.route);a.distanceRemaining=this.routeDistance;
    a.destination={district:a.to,x:target.x,z:target.z};
    this.sync();
  }
  pathDistance(route=[]){let d=0;for(let i=1;i<route.length;i++)d+=Math.hypot(route[i].x-route[i-1].x,route[i].z-route[i-1].z);return d;}
  start(e={}){
    if(!e.orderId||!e.to)return;
    this.state.active={orderId:e.orderId,from:e.from||'Kigali',to:e.to,good:e.good,quantity:e.quantity||1,
      reward:e.reward||0,status:'in-transit',vehicle:this.game.vehicles.active?.name||null,
      startedAt:Date.now(),route:[],routeIndex:0,routeDistance:0,distanceRemaining:0,arrivalRadius:10};
    this.rebuildRoute();
    this.sync();
    this.game.events.emit('cargo:delivery-started',{...this.state.active});
  }
  arrive(){
    const a=this.state.active;if(!a)return;
    const econ=this.game.factionEconomy;
    if(!econ?.fulfill(a.orderId,true)){a.status='blocked';this.sync();return;}
    a.status='delivered';a.deliveredAt=Date.now();a.distanceRemaining=0;
    this.state.history.unshift({...a});
    this.state.history=this.state.history.slice(0,32);
    this.state.active=null;this.sync();
    this.game.events.emit('cargo:delivery-arrived',{orderId:a.orderId,district:a.to,reward:a.reward});
  }
  fail(reason){
    const a=this.state.active;if(!a)return;
    const econ=this.game.factionEconomy;
    econ?.fulfill(a.orderId,false);
    a.status='failed';a.reason=reason;a.failedAt=Date.now();
    this.state.history.unshift({...a});this.state.history=this.state.history.slice(0,32);
    this.state.active=null;this.sync();
    this.game.events.emit('cargo:delivery-failed',{orderId:a.orderId,reason});
  }
  update(dt){
    this.tick+=dt;if(this.tick<.25)return;const step=this.tick;this.tick=0;
    const a=this.state.active;if(!a)return;
    const p=this.playerPosition();if(!p){this.sync();return;}
    if(!a.destination)this.rebuildRoute();
    const d=Math.hypot((a.destination?.x||0)-p.x,(a.destination?.z||0)-p.z);
    a.distanceRemaining=d;
    const speed=Math.abs(this.game.vehicles.active?.speed||0);
    a.etaSeconds=speed>.2?Math.max(0,Math.round(d/speed)):null;
    if(a.route?.length){
      let nearest=a.routeIndex;
      let best=Infinity;
      for(let i=a.routeIndex;i<a.route.length;i++){const q=a.route[i],dd=(q.x-p.x)**2+(q.z-p.z)**2;if(dd<best){best=dd;nearest=i;}}
      a.routeIndex=nearest;
    }
    if(d<=a.arrivalRadius){this.arrive();return;}
    if(speed>30&&d<18)this.game.events.emit('cargo:delivery-risk',{orderId:a.orderId,risk:.12,reason:'high-speed-arrival'});
    a.updatedAt=Date.now();this.sync();
  }
  sync(){this.state.updatedAt=Date.now();this.game.state.update({physicalDelivery:this.state});}
}
