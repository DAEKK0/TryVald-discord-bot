const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');
const ownerConfig = require('../../utils/ownerConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deafen')
    .setDescription('Stop listening to a server (owner only).')
    .setDMPermission(true)
    .addStringOption(option =>
      option.setName('server_id')
        .setDescription('The ID of the server to stop listening to')
        .setRequired(true)),
  async execute(interaction) {
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    const guildId = interaction.options.getString('server_id');
    const guild = interaction.client.guilds.cache.get(guildId);
    if (!guild) {
      return interaction.reply({ content: `❌ I am not in server with ID \`${guildId}\`.`, flags: MessageFlags.Ephemeral });
    }

    const removed = ownerConfig.removeListeningGuild(guildId);
    if (removed) {
      await interaction.reply({ content: `🔇 Stopped listening to **${guild.name}** (${guildId}).`, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: `❌ I was not listening to **${guild.name}**.`, flags: MessageFlags.Ephemeral });
    }
  },
};