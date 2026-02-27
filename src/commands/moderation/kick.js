const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) // Restrict to users with kick permission
    .setDMPermission(false), // Not usable in DMs
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Fetch the member object from the guild
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }

    // Check if the bot can kick this member (role hierarchy)
    if (!member.kickable) {
      return interaction.reply({ content: '❌ I cannot kick that user. They may have higher permissions than me.', ephemeral: true });
    }

    // Attempt to DM the user before kicking (optional)
    try {
      await target.send(`You have been kicked from **${interaction.guild.name}** for: ${reason}`);
    } catch (error) {
      // DM failed – ignore, we still kick
    }

    await member.kick(reason);
    await interaction.reply({ content: `✅ **${target.tag}** has been kicked.\n📝 Reason: ${reason}` });
  },
};