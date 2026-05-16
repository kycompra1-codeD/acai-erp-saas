// ============================================================
// SCALE SIMULATOR — Zullya ERP
// Simula uma balança digital emitindo peso via EventBus.
// Em produção: substituir por serialport RS232/USB + TCP/IP.
//
// API Real (Node.js backend):
//   const port = new SerialPort({ path: 'COM3', baudRate: 9600 })
//   port.on('data', data => parseWeight(data))
// ============================================================

import { eventBus, EVENTS } from './eventBus';

class ScaleSimulator {
  constructor() {
    this._interval = null;
    this._connected = false;
    this._currentWeight = 0;
    this._manualWeight = null;
    this._tare = 0; // peso da tara (recipiente)
    this._mode = 'auto'; // 'auto' | 'manual'
    this._config = {
      port: 'COM3',
      baudRate: 9600,
      protocol: 'serial', // 'serial' | 'tcp'
      tcpHost: '192.168.1.100',
      tcpPort: 8000,
      pollInterval: 1500, // ms entre leituras
    };
  }

  configure(config) {
    this._config = { ...this._config, ...config };
  }

  connect() {
    if (this._connected) return;

    this._connected = true;
    this._startReading();

    eventBus.emit(EVENTS.SCALE_CONNECTED, {
      port: this._config.port,
      protocol: this._config.protocol,
      timestamp: new Date().toISOString(),
    });

    console.info(`[Scale] Conectado — ${this._config.protocol.toUpperCase()} ${this._config.port}`);
  }

  disconnect() {
    if (!this._connected) return;
    clearInterval(this._interval);
    this._interval = null;
    this._connected = false;
    this._currentWeight = 0;

    eventBus.emit(EVENTS.SCALE_DISCONNECTED, { timestamp: new Date().toISOString() });
    eventBus.emit(EVENTS.WEIGHT_UPDATE, { weight: 0, gross: 0, tare: this._tare, net: 0, stable: false, connected: false });

    console.info('[Scale] Desconectado');
  }

  /**
   * Define a tara com o peso bruto atual (ou valor explícito em kg).
   * O peso líquido = bruto - tara.
   */
  setTare(kg) {
    this._tare = (kg !== undefined)
      ? Math.max(0, parseFloat(kg) || 0)
      : Math.max(0, this._currentWeight);
    console.info(`[Scale] Tara definida: ${this._tare.toFixed(3)} kg`);
    // Re-emite leitura imediata com nova tara
    const net = Math.max(0, this._currentWeight - this._tare);
    eventBus.emit(EVENTS.WEIGHT_UPDATE, {
      weight: net,
      gross: this._currentWeight,
      tare: this._tare,
      net,
      stable: true,
      connected: this._connected,
      source: 'tare',
    });
  }

  /** Remove a tara — volta a exibir o peso bruto. */
  clearTare() {
    this._tare = 0;
    console.info('[Scale] Tara removida');
    const net = this._currentWeight;
    eventBus.emit(EVENTS.WEIGHT_UPDATE, {
      weight: net,
      gross: net,
      tare: 0,
      net,
      stable: true,
      connected: this._connected,
      source: 'tare-clear',
    });
  }

  getTare() {
    return this._tare;
  }

  setManualWeight(kg) {
    this._manualWeight = parseFloat(kg) || 0;
    this._currentWeight = this._manualWeight;
    this._mode = 'manual';
    const net = Math.max(0, this._manualWeight - this._tare);
    eventBus.emit(EVENTS.WEIGHT_UPDATE, {
      weight: net,
      gross: this._manualWeight,
      tare: this._tare,
      net,
      stable: true,
      connected: this._connected,
      source: 'manual',
    });
  }

  setAutoMode() {
    this._mode = 'auto';
    this._manualWeight = null;
  }

  isConnected() {
    return this._connected;
  }

  getCurrentWeight() {
    return this._currentWeight;
  }

  // Simula leitura realista da balança (oscilação + estabilização)
  _startReading() {
    let targetWeight = this._generateRandomWeight();
    let readings = 0;

    this._interval = setInterval(() => {
      if (!this._connected) return;

      if (this._mode === 'manual') {
        this._currentWeight = this._manualWeight || 0;
        eventBus.emit(EVENTS.WEIGHT_UPDATE, {
          weight: this._currentWeight,
          stable: true,
          connected: true,
          source: 'manual',
        });
        return;
      }

      readings++;

      // A cada 6s, simula retirada/colocação de novo item
      if (readings % 4 === 0) {
        targetWeight = this._generateRandomWeight();
      }

      // Oscilação realista (±3g)
      const noise = (Math.random() - 0.5) * 0.006;
      const diff = targetWeight - this._currentWeight;
      this._currentWeight = parseFloat((this._currentWeight + diff * 0.4 + noise).toFixed(3));

      // Considera estável se diferença < 2g
      const stable = Math.abs(diff) < 0.002;
      const gross = Math.max(0, this._currentWeight);
      const net = Math.max(0, gross - this._tare);

      eventBus.emit(EVENTS.WEIGHT_UPDATE, {
        weight: net,
        gross,
        tare: this._tare,
        net,
        stable,
        connected: true,
        source: 'simulator',
        raw: `ST,GS, ${this._currentWeight.toFixed(3)} kg`, // Protocolo típico Toledo/Filizola
      });
    }, this._config.pollInterval);
  }

  // Pesos comuns para açaí: 300g, 500g, 700g, 1000g, 1500g
  _generateRandomWeight() {
    const commonWeights = [0.300, 0.500, 0.700, 1.000, 1.500, 0.250, 0.450];
    return commonWeights[Math.floor(Math.random() * commonWeights.length)];
  }
}

// Singleton — um único simulador no sistema
export const scaleSimulator = new ScaleSimulator();
