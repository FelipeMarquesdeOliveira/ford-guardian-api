/** Encaminha erros de handlers assíncronos para o errorHandler (Express 4 não faz isso sozinho). */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
