const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../../config'); // we'll add ownerId to config

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Execute JavaScript code (owner only).')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('Code to execute')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // extra safety
    .setDMPermission(false),
  async execute(interaction) {
    // Owner check
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const code = interaction.options.getString('code');
    try {
      // eslint-disable-next-line no-eval
      let evaled = await eval(code);
      if (typeof evaled !== 'string') evaled = require('util').inspect(evaled, { depth: 0 });
      await interaction.editReply({ content: `\`\`\`js\n${evaled.slice(0, 1900)}\n\`\`\`` });
    } catch (error) {
      await interaction.editReply({ content: `\`\`\`js\n${error.toString().slice(0, 1900)}\n\`\`\`` });
    }
  },
};