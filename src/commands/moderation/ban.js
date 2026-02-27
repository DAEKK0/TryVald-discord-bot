const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('delete_days')
        .setDescription('Delete messages from the last X days (0‑7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }

    if (!member.bannable) {
      return interaction.reply({ content: '❌ I cannot ban that user. They may have higher permissions than me.', ephemeral: true });
    }

    try {
      await target.send(`You have been banned from **${interaction.guild.name}** for: ${reason}`);
    } catch (error) {
      // Ignore DM failure
    }

    await member.ban({ deleteMessageSeconds: deleteDays * 86400, reason }); // Discord.js v14 uses seconds
    await interaction.reply({ content: `✅ **${target.tag}** has been banned.\n📝 Reason: ${reason}\n🗑️ Messages deleted: ${deleteDays} day(s)` });
  },
};