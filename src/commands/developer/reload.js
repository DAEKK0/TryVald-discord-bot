const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reload a command (owner only).')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('The command name to reload')
        .setRequired(true)),
  async execute(interaction) {
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    const commandName = interaction.options.getString('command').toLowerCase();
    const command = interaction.client.commands.get(commandName);

    if (!command) {
      return interaction.reply({ content: `❌ Command \`${commandName}\` not found.`, flags: MessageFlags.Ephemeral });
    }

    // Find file path
    const commandsPath = path.join(__dirname, '../../commands');
    const commandFolders = fs.readdirSync(commandsPath);
    let filePath = null;
    for (const folder of commandFolders) {
      const folderPath = path.join(commandsPath, folder);
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
      for (const file of files) {
        if (file === `${commandName}.js` || file === commandName) {
          filePath = path.join(folderPath, file);
          break;
        }
      }
      if (filePath) break;
    }

    if (!filePath) {
      return interaction.reply({ content: `❌ Could not find file for command \`${commandName}\`.`, flags: MessageFlags.Ephemeral });
    }

    try {
      // Cache delete
      delete require.cache[require.resolve(filePath)];
      const newCommand = require(filePath);
      interaction.client.commands.set(newCommand.data.name, newCommand);
      await interaction.reply({ content: `✅ Command \`${commandName}\` reloaded.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `❌ Error reloading command: \`${error.message}\``, flags: MessageFlags.Ephemeral });
    }
  },
};