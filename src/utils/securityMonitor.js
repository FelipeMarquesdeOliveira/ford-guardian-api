const config = require('../config');
const { registrarEvento } = require('../observability/security-events');

/**
 * Bloqueio de conta por tentativas de login (proteção contra força bruta / credential stuffing).
 * Complementa o rate limit por IP: atacantes distribuídos em vários IPs também são barrados.
 */
class SecurityMonitor {
  constructor({ maxTentativas, janelaMs }) {
    this.maxTentativas = maxTentativas;
    this.janelaMs = janelaMs;
    this.falhas = new Map();
  }

  estaBloqueado(email) {
    const registro = this.falhas.get(email);
    if (!registro || !registro.bloqueadoAte) return false;
    if (registro.bloqueadoAte > Date.now()) return true;
    this.falhas.delete(email);
    return false;
  }

  registrarFalha(email, ip, requestId) {
    const agora = Date.now();
    const registro = this.falhas.get(email) || { tentativas: 0, inicio: agora };
    if (agora - registro.inicio > this.janelaMs) Object.assign(registro, { tentativas: 0, inicio: agora });
    registro.tentativas += 1;
    if (registro.tentativas >= this.maxTentativas) {
      registro.bloqueadoAte = agora + this.janelaMs;
      registrarEvento('auth.account.locked', { requestId, ip, attempts: registro.tentativas }, 'error');
    }
    this.falhas.set(email, registro);
    return registro.tentativas;
  }

  registrarSucesso(email) {
    this.falhas.delete(email);
  }

  status() {
    return { contasMonitoradas: this.falhas.size,
      contasBloqueadas: [...this.falhas.values()].filter(r => r.bloqueadoAte > Date.now()).length };
  }

  limpar() {
    this.falhas.clear();
  }
}

const securityMonitor = new SecurityMonitor(config.lockout);

module.exports = { SecurityMonitor, securityMonitor };
