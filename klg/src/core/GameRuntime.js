import { ServiceRegistry } from './ServiceRegistry.js';

export class GameRuntime {
  constructor(game){
    this.game=game;
    this.services=new ServiceRegistry();
    this.started=false;
    this.frame=0;
    this.elapsed=0;
    this.accumulator=0;
  }
  register(name,service){this.services.register(name,service);return service;}
  get(name){return this.services.get(name);}
  update(dt){
    const safeDt=Math.min(Math.max(dt||0,0),0.05);
    this.frame++;
    this.elapsed+=safeDt;
    this.accumulator+=safeDt;
    this.services.update(safeDt);
  }
  start(){this.started=true;}
  stop(){this.started=false;}
  dispose(){this.services.dispose();}
}
