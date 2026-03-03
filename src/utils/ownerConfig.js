const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/ownerConfig.json');

function readConfig() {
  if (!fs.existsSync(filePath)) return { listeningGuilds: [], ignoredChannels: {} };
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { listeningGuilds: [], ignoredChannels: {} };
  }
}

function writeConfig(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  // Listening guilds
  getListeningGuilds() {
    return readConfig().listeningGuilds || [];
  },
  addListeningGuild(guildId) {
    const data = readConfig();
    if (!data.listeningGuilds) data.listeningGuilds = [];
    if (!data.listeningGuilds.includes(guildId)) {
      data.listeningGuilds.push(guildId);
      writeConfig(data);
      return true;
    }
    return false;
  },
  removeListeningGuild(guildId) {
    const data = readConfig();
    if (!data.listeningGuilds) return false;
    const index = data.listeningGuilds.indexOf(guildId);
    if (index !== -1) {
      data.listeningGuilds.splice(index, 1);
      writeConfig(data);
      return true;
    }
    return false;
  },
  isListening(guildId) {
    return this.getListeningGuilds().includes(guildId);
  },

  // Ignored channels
  getIgnoredChannels(guildId) {
    const data = readConfig();
    return data.ignoredChannels?.[guildId] || [];
  },
  addIgnoredChannel(guildId, channelId) {
    const data = readConfig();
    if (!data.ignoredChannels) data.ignoredChannels = {};
    if (!data.ignoredChannels[guildId]) data.ignoredChannels[guildId] = [];
    if (!data.ignoredChannels[guildId].includes(channelId)) {
      data.ignoredChannels[guildId].push(channelId);
      writeConfig(data);
      return true;
    }
    return false;
  },
  removeIgnoredChannel(guildId, channelId) {
    const data = readConfig();
    if (!data.ignoredChannels?.[guildId]) return false;
    const index = data.ignoredChannels[guildId].indexOf(channelId);
    if (index !== -1) {
      data.ignoredChannels[guildId].splice(index, 1);
      writeConfig(data);
      return true;
    }
    return false;
  },
  isIgnored(guildId, channelId) {
    const ignored = this.getIgnoredChannels(guildId);
    return ignored.includes(channelId);
  }
};