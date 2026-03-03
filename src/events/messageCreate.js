const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const ownerConfig = require('../utils/ownerConfig');
const logger = require('../utils/logger'); // Import logger

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Log EVERY message to console
    if (message.guild) {
      logger.info(`[GUILD] ${message.guild.name} #${message.channel.name} | ${message.author.tag}: ${message.content}`);
    } else {
      logger.info(`[DM] ${message.author.tag}: ${message.content}`);
    }

    // If it's a DM, maybe also log to owner? (optional, but we already have console)
    // Your existing listening logic for guilds
    if (message.guild && ownerConfig.isListening(message.guild.id)) {
      if (ownerConfig.isIgnored(message.guild.id, message.channel.id)) return;
      const owner = await message.client.users.fetch(config.ownerId).catch(() => null);
      if (!owner) return;

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(message.content || '*No content*')
        .addFields(
          { name: 'Server', value: message.guild.name, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Jump', value: `[Click](${message.url})`, inline: true }
        )
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp(message.createdAt);

      try {
        await owner.send({ embeds: [embed] });
        logger.debug(`Forwarded message from ${message.author.tag} in ${message.guild.name} to owner`);
      } catch (error) {
        logger.error('Failed to send DM to owner:', error);
      }
    }
  },
};