const fs = require('fs');
const http = require('http');
const https = require('https');
const config = require('./config');
const { createApp } = require('./app');
const { logger } = require('./observability/logger');

const app = createApp();

if (require.main === module) {
  const { certPath, keyPath } = config.tls;
  const servidor = certPath && keyPath
    // HTTPS com TLS 1.2 no mínimo (em produção, TLS também é terminado no proxy/ingress).
    // Os caminhos vêm de variáveis de ambiente controladas pela operação, não da requisição.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    ? https.createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath), minVersion: 'TLSv1.2' }, app)
    : http.createServer(app);
  servidor.listen(config.port, () => {
    logger.info('app.started', { event: 'app.started', port: config.port, tls: Boolean(certPath && keyPath) });
  });
}

module.exports = app;
