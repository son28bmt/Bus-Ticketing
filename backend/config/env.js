const path = require('path');
const dotenv = require('dotenv');

const ENV = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: envPath });

module.exports = {
  ENV,
};
