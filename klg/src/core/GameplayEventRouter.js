export class GameplayEventRouter {
  constructor(game){this.game=game;this.history=[];this.maxHistory=32;}
  emit(name,payload={}){
    const event={name,payload,time:performance.now()};
    this.history.unshift(event);
    this.history=this.history.slice(0,this.maxHistory);
    this.game.events.emit(name,payload);
    return event;
  }
  recent(name){return this.history.find(e=>e.name===name)||null;}
  all(){return this.history.slice();}
}
