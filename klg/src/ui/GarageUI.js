export class GarageUI {
  constructor(game){this.game=game;this.open=false;this.el=null;addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='b')this.toggle();if(k==='escape'&&this.open)this.toggle();});}
  toggle(){this.open=!this.open;this.render();}
  select(name){if(this.game.vehicles.selectVehicle(name))this.render();}
  buy(type,value){if(this.game.customization?.apply(type,value))this.render();}
  render(){
    if(!this.el){this.el=document.createElement('div');this.el.id='garage-panel';document.body.appendChild(this.el);}
    if(!this.open){this.el.innerHTML='';this.el.className='hidden';return;}
    this.el.className='garage-panel';const v=this.game.vehicles.active;
    const cards=this.game.vehicles.vehicles.map(car=>`<button class="vehicle-card ${car===v?'selected':''}" data-select="${car.name}"><strong>${car.name}</strong><span>${Math.round(car.maxSpeed)} TOP · ${Math.round((car.grip||.92)*100)} GRIP</span></button>`).join('');
    if(!v){this.el.innerHTML=`<div class="garage-card"><div class="garage-head"><div><small>KIGALI MOTORS · SHOWROOM</small><h2>SELECT VEHICLE</h2></div><button data-close>×</button></div><div class="vehicle-list">${cards}</div></div>`;this.bind();return;}
    const stat=(label,value)=>`<div class="gstat"><span>${label}</span><strong>${value}</strong></div>`;
    this.el.innerHTML=`<div class="garage-card"><div class="garage-head"><div><small>KIGALI MOTORS · TUNING BAY</small><h2>${v.name}</h2></div><button data-close>×</button></div><div class="vehicle-list">${cards}</div><div class="garage-stats">${stat('HP',Math.round(v.health))}${stat('TOP SPEED',Math.round(v.maxSpeed))}${stat('GRIP',Math.round((v.grip||.92)*100)+'%')}${stat('ENGINE',v.engineLevel||0)}${stat('BRAKES',v.brakeLevel||0)}${stat('SUSPENSION',v.suspensionLevel||0)}</div><div class="garage-section"><h3>PAINT</h3>${['red','blue','black','white','gold'].map(x=>`<button data-paint="${x}">${x.toUpperCase()} · RWF 120</button>`).join('')}</div><div class="garage-section"><h3>WHEELS</h3>${['stock','sport','offroad'].map(x=>`<button data-wheel="${x}">${x.toUpperCase()} · RWF 180</button>`).join('')}</div><div class="garage-section"><h3>PERFORMANCE</h3><button data-buy="tires">TIRES · RWF 160</button><button data-buy="engine">ENGINE · RWF 420</button><button data-buy="brakes">BRAKES · RWF 260</button><button data-buy="suspension">SUSPENSION · RWF 300</button></div></div>`;
    this.bind();
  }
  bind(){this.el.querySelector('[data-close]')?.addEventListener('click',()=>this.toggle());this.el.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>this.select(b.dataset.select)));this.el.querySelectorAll('[data-paint]').forEach(b=>b.addEventListener('click',()=>this.buy('paint',b.dataset.paint)));this.el.querySelectorAll('[data-wheel]').forEach(b=>b.addEventListener('click',()=>this.buy('wheels',b.dataset.wheel)));this.el.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>this.buy(b.dataset.buy)));}
  update(){if(this.open)this.render();}
}
