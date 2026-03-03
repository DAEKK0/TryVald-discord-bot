const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    if (guild) {
      logger.info(`❌ Left guild: ${guild.name} (ID: ${guild.id})`);
    } else {
      logger.info('❌ Left an unknown guild (likely deleted or kicked)');
    }
  },
};