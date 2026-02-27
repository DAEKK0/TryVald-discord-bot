const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/warnings.json');

function readWarnings() {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeWarnings(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  addWarning(guildId, userId, moderatorId, reason) {
    const data = readWarnings();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) data[guildId][userId] = [];

    data[guildId][userId].push({
      id: Date.now().toString(),
      moderatorId,
      reason,
      timestamp: new Date().toISOString()
    });

    writeWarnings(data);
    return data[guildId][userId];
  },

  getWarnings(guildId, userId) {
    const data = readWarnings();
    return data[guildId]?.[userId] || [];
  },

  removeWarning(guildId, userId, warningId) {
    const data = readWarnings();
    if (data[guildId]?.[userId]) {
      data[guildId][userId] = data[guildId][userId].filter(w => w.id !== warningId);
      writeWarnings(data);
      return true;
    }
    return false;
  }
};