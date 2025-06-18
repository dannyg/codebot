// config.js
const fs = require('fs');
const os = require('os');
const path = require('path');

const configPath = path.join(os.homedir(), '.aicodegen', 'config.json');

function loadApiKey() {
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Missing config. Run "aicodegen init" to set your OpenAI API key.`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.OPENAI_API_KEY;
}

function initConfig(apiKey) {
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

  const config = { OPENAI_API_KEY: apiKey };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ API key saved to ${configPath}`);
}

module.exports = { loadApiKey, initConfig };
