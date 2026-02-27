const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure server settings.')
    .addSubcommand(sub =>
      sub.setName('get')
        .setDescription('Get a config value.')
        .addStringOption(opt =>
          opt.setName('key')
            .setDescription('The config key')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a config value.')
        .addStringOption(opt =>
          opt.setName('key')
            .setDescription('The config key')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('The value')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a config key.')
        .addStringOption(opt =>
          opt.setName('key')
            .setDescription('The config key')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const key = interaction.options.getString('key');

    if (subcommand === 'get') {
      const value = guildConfig.get(guildId)[key];
      await interaction.reply({ content: `**${key}**: ${value || 'not set'}`, flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'set') {
      const value = interaction.options.getString('value');
      guildConfig.set(guildId, key, value);
      await interaction.reply({ content: `✅ Set **${key}** to \`${value}\``, flags: MessageFlags.Ephemeral });
    } else if (subcommand === 'delete') {
      const success = guildConfig.delete(guildId, key);
      await interaction.reply({ content: success ? `✅ Deleted **${key}**` : `❌ Key **${key}** not found.`, flags: MessageFlags.Ephemeral });
    }
  },
};