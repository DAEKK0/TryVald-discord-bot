const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      // Safely respond based on interaction state
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error!', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'There was an error!', flags: MessageFlags.Ephemeral });
      }
    }
  },
};