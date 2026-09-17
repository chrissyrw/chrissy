export class ServiceRegistry {
  constructor(){this.services=new Map();}
  register(name,service){if(!name||!service)throw new Error('Invalid service registration');this.services.set(name,service);return service;}
  get(name){return this.services.get(name);}
  has(name){return this.services.has(name);}
  values(){return this.services.values();}
  update(dt){for(const service of this.services.values())if(typeof service.update==='function')service.update(dt);}
  dispose(){for(const service of this.services.values())if(typeof service.dispose==='function')service.dispose();this.services.clear();}
}
