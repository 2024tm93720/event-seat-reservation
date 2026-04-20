const pino = require('pino');
const pinoHttp = require('pino-http');
const { v4: uuid } = require('uuid');
const logger = pino({ level: process.env.LOG_LEVEL || 'info', base: { service: 'order-service' } });
const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-correlation-id'] || uuid(),
  customProps: (req) => ({ cid: req.id }),
  customLogLevel: (req, res, err) => err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
});
module.exports = { logger, httpLogger };
