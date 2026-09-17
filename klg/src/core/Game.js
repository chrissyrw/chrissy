import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GameState } from './GameState.js';
import { GameRuntime } from './GameRuntime.js';
import { WorldState } from './WorldState.js';
import { GameplayEventRouter } from './GameplayEventRouter.js';
import { PlayerController } from '../player/PlayerController.js';
import { PlayerStats } from '../player/PlayerStats.js';
import { VehicleSystem } from '../vehicles/VehicleSystem.js';
import { VehicleOwnershipSystem } from '../vehicles/VehicleOwnershipSystem.js';
import { VehiclePhysicsSystem } from '../vehicles/VehiclePhysicsSystem.js';
import { VehicleEffectsSystem } from '../vehicles/VehicleEffectsSystem.js';
import { VehicleCustomizationSystem } from '../vehicles/VehicleCustomizationSystem.js';
import { TrafficSystem } from '../vehicles/TrafficSystem.js';
import { WeatherSystem } from '../world/WeatherSystem.js';
import { NPCSystem } from '../world/NPCSystem.js';
import { NPCPopulationDirector } from '../world/NPCPopulationDirector.js';
import { KigaliWorldSystem } from '../world/KigaliWorldSystem.js';
import { CityLifeSystem } from '../world/CityLifeSystem.js';
import { PoliceSystem } from '../world/PoliceSystem.js';
import { NavigationSystem } from '../world/NavigationSystem.js';
import { MissionSystem } from '../missions/MissionSystem.js';
import { AIDirector } from '../ai/AIDirector.js';
import { EconomySystem } from '../world/EconomySystem.js';
import { GarageSystem } from '../world/GarageSystem.js';
import { TrafficAI } from '../world/TrafficAI.js';
import { WantedSystem } from '../world/WantedSystem.js';
import { EnvironmentSystem } from '../world/EnvironmentSystem.js';
import { GarageUI } from '../ui/GarageUI.js';
import { CameraSystem } from './CameraSystem.js';
import { ProgressionSystem } from '../player/ProgressionSystem.js';
import { UnlockRewardsSystem } from '../player/UnlockRewardsSystem.js';
import { EconomyDirector } from '../world/EconomyDirector.js';
import { BusinessMarketSystem } from '../world/BusinessMarketSystem.js';

export class Game {
  constructor(container){
    this.container=container;
    this.events=new EventBus();
    this.state=new GameState();
    this.state.load();
    this.runtime=new GameRuntime(this);
    this.worldState=new WorldState(this);
    this.eventRouter=new GameplayEventRouter(this);
    this.runtime.register('worldState',this.worldState);
    this.stats=new PlayerStats(this.state);
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,700);
    this.renderer=new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.clock=new THREE.Clock();
    this.setupLighting();
    this.setupPlayer();
    this.vehicles=new VehicleSystem(this);
    this.vehicleOwnership=new VehicleOwnershipSystem(this);
    this.vehiclePhysics=new VehiclePhysicsSystem(this);
    this.vehicleEffects=new VehicleEffectsSystem(this);
    this.cameraSystem=new CameraSystem(this);
    this.customization=new VehicleCustomizationSystem(this);
    this.traffic=new TrafficSystem(this);
    this.trafficAI=new TrafficAI(this);
    this.weather=new WeatherSystem(this);
    this.npcs=new NPCSystem(this);
    this.populationAI=new NPCPopulationDirector(this);
    this.missions=new MissionSystem(this);
    this.ai=new AIDirector(this);
    this.world=new KigaliWorldSystem(this);
    this.cityLife=new CityLifeSystem(this);
    this.environment=new EnvironmentSystem(this);
    this.police=new PoliceSystem(this);
    this.wanted=new WantedSystem(this);
    this.nav=new NavigationSystem(this);
    this.economy=new EconomySystem(this);
    this.economyDirector=new EconomyDirector(this);
    this.businessMarket=new BusinessMarketSystem(this);
    this.garage=new GarageSystem(this);
    this.progression=new ProgressionSystem(this);
    this.unlockRewards=new UnlockRewardsSystem(this);
    this.garageUI=new GarageUI(this);
    this.bindRuntimeEvents();
    this.missions.start('first-run');
    this.worldState.refresh();
  }
  bindRuntimeEvents(){
    this.events.on('vehicle:changed',v=>{const e=document.querySelector('#vehicle');if(e)e.textContent=v?'DRIVING: '+v.name:'ON FOOT';});
    this.events.on('ai:world',d=>{this.state.update({ai:{phase:d.phase}});const e=document.querySelector('#ai');if(e)e.textContent='KLG AI: '+d.phase.toUpperCase();});
    this.events.on('camera:changed',d=>{const e=document.querySelector('#camera-mode');if(e)e.textContent='CAM: '+d.mode;});
  }
  setupLighting(){this.scene.background=new THREE.Color(0x8bb7d8);this.scene.fog=new THREE.Fog(0x8bb7d8,55,260);this.scene.add(new THREE.HemisphereLight(0xffffff,0x45604b,2.0));this.sun=new THREE.DirectionalLight(0xffffff,2.8);this.sun.position.set(35,55,20);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=300;this.scene.add(this.sun);}
  setupPlayer(){this.player=new THREE.Mesh(new THREE.CapsuleGeometry(.65,1.2,6,12),new THREE.MeshStandardMaterial({color:0x1d2630,roughness:.7}));const s=this.state.get().player.position;this.player.position.set(s.x,s.y,s.z);this.player.castShadow=true;this.scene.add(this.player);this.controller=new PlayerController(this.player,this.state,this.events);}
  update(dt){
    this.runtime.update(dt);
    this.controller.update(dt);
    this.vehicles.update(dt);
    this.vehicleOwnership.update(dt);
    this.vehiclePhysics.update(dt);
    this.vehicleEffects.update(dt);
    this.cameraSystem.update(dt);
    this.customization.update(dt);
    this.garageUI.update();
    this.traffic.update(dt);
    this.trafficAI.update(dt);
    this.weather.update(dt);
    this.npcs.update(dt);
    this.populationAI.update(dt);
    this.missions.update(dt);
    this.ai.update(dt);
    this.world.update(dt);
    this.cityLife.update(dt);
    this.environment.update(dt);
    this.police.update(dt);
    this.wanted.update(dt);
    this.nav.update();
    this.economy.update(dt);
    this.economyDirector.update(dt);
    this.businessMarket.update(dt);
    this.garage.update(dt);
    this.worldState.refresh();
    const target=this.vehicles.active?this.vehicles.active.mesh:this.player;
    this.sun.position.x=target.position.x+35;
    this.sun.position.z=target.position.z+20;
  }
  start(){this.runtime.start();const loop=()=>{requestAnimationFrame(loop);this.update(Math.min(this.clock.getDelta(),.05));this.renderer.render(this.scene,this.camera);};loop();}
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
  save(){this.state.save();}
}
