const serverless = require('serverless-http');
const app = require('../../server');

// Wrap the Express app for Serverless
module.exports.handler = serverless(app);
