const clamp = (n, min = 0, max = 99.9) => Math.max(min, Math.min(max, n));

export class RuntimeIntegritySystem {
  constructor(game, { interval = 2 } = {}) {
    this.game = game;
    this.interval = interval;
    this.tick = 0;
    this.lastRevision = game.state.revision || 0;
    this.state = game.state.get().runtimeIntegrity || {
      score: 0,
      status: 'booting',
      checks: {},
      faults: 0,
      stateRevision: this.lastRevision,
      updatedAt: 0
    };
    this.offError = game.events.onError((error) => this.recordFault(error));
    this.sync();
  }

  recordFault(error) {
    this.state.faults = Number(this.state.faults || 0) + 1;
    this.state.lastFault = {
      name: error?.name || 'unknown',
      message: error?.message || 'runtime event handler error',
      source: error?.source || 'event-bus',
      timestamp: error?.timestamp || Date.now()
    };
  }

  criticalChecks() {
    const g = this.game;
    const fabric = g.unifiedFabric?.snapshot?.();
    const state = g.state.get();
    return {
      coreRuntime: !!g.runtime && !!g.events && !!g.state,
      unifiedFabric: !!g.unifiedFabric && fabric?.healthy !== false,
      stateContinuity: Number(g.state.revision || 0) >= this.lastRevision,
      worldBrain: !!g.unifiedWorldBrainSystem,
      worldSimulation: !!g.districtSimulationCoreSystem && !!g.worldSimulationSchedulerSystem,
      missions: !!g.missions && !!g.missionLifecycleSystem && !!g.missionObjectiveProgress,
      opportunities: !!g.unifiedOpportunity && !!g.opportunityLifecycle && !!g.opportunityDiscovery,
      socialCrew: !!g.npcInteractions && !!g.crewMissions && !!g.crewEconomy,
      economy: !!g.economy && !!g.worldEconomySimulationSystem && !!g.trafficEconomyBridgeSystem,
      persistence: !!g.saveContinuitySystem && !!g.advancedWorldPersistenceSystem && !!g.worldPersistenceCoordinatorSystem,
      aiExecution: !!g.aIDirectorV2System && !!g.aIExecutionBridgeSystem && !!g.unifiedWorldBrainSystem,
      recovery: !!g.worldConsistencyRecoverySystem && !!g.worldPersistenceRebuilderSystem,
      uxTelemetry: !!g.contextualHUD && !!g.missionHUD && !!g.opportunityFeedback && !!g.navigationFeedback && !!g.gameplayTelemetry,
      completionPipeline: !!g.completionAudit && !!g.klgCompletionScore && !!g.completionGate && !!g.completionReport,
      noEventFaults: this.state.faults === 0,
      noStateIntegrityErrors: Number(state.stateIntegrity?.errors || 0) === 0
    };
  }

  audit() {
    const checks = this.criticalChecks();
    const values = Object.values(checks);
    const passed = values.filter(Boolean).length;
    const raw = values.length ? (passed / values.length) * 100 : 0;
    const score = clamp(Math.round(raw * 10) / 10);
    const fabric = this.game.unifiedFabric?.snapshot?.() || {};
    this.state = {
      ...this.state,
      score,
      status: score >= 99.9 ? 'verified-ceiling' : score >= 95 ? 'hardening-near-complete' : score >= 85 ? 'production-hardening' : 'integration-needed',
      checks,
      passed,
      total: values.length,
      faults: Number(this.state.faults || 0),
      stateRevision: Number(this.game.state.revision || 0),
      eventFabric: {
        accepted: fabric.accepted || 0,
        rejected: fabric.rejected || 0,
        duplicates: fabric.duplicates || 0,
        recentEvents: fabric.recent?.length || 0
      },
      updatedAt: Date.now()
    };
    return this.state;
  }

  update(dt = 0.016) {
    this.tick += dt;
    if (this.tick < this.interval) return;
    this.tick = 0;
    this.audit();
    this.sync();
    this.game.events.emit('runtime:integrity', this.state, { source: 'runtime-integrity', priority: 90 });
  }

  sync() {
    this.game.state.update({ runtimeIntegrity: { ...this.state } }, 'runtime-integrity');
  }

  dispose() {
    this.offError?.();
  }
}
