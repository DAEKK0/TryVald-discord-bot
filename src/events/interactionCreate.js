const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Log all interactions
    if (interaction.isChatInputCommand()) {
      logger.info(`[COMMAND] ${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);
    } else if (interaction.isButton()) {
      logger.debug(`[BUTTON] ${interaction.user.tag} clicked ${interaction.customId} in ${interaction.guild?.name || 'DM'}`);
    } else if (interaction.isModalSubmit()) {
      logger.debug(`[MODAL] ${interaction.user.tag} submitted modal ${interaction.customId}`);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing /${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error!', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error!', flags: MessageFlags.Ephemeral });
      }
    }
  },
};