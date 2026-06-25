const path = require('node:path');

module.exports = {
  plugins: [
    require(path.join(__dirname, 'node_modules/tailwindcss')),
    require('autoprefixer'),
  ],
};
