const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const ownerConfig = require('../utils/ownerConfig');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;

    // Check if listening to this server
    if (!ownerConfig.isListening(message.guild.id)) return;

    // Check if this channel is ignored
    if (ownerConfig.isIgnored(message.guild.id, message.channel.id)) return;

    const owner = await message.client.users.fetch(config.ownerId).catch(() => null);
    if (!owner) return;

    const embed = new EmbedBuilder()
      .setColor('Random')
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
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
    } catch (error) {
      console.error('Failed to send DM to owner:', error);
    }
  },
};