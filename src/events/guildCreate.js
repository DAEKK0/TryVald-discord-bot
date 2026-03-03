const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    logger.info(`✅ Joined new guild: ${guild.name} (ID: ${guild.id}) | Members: ${guild.memberCount}`);
  },
};
