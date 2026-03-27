const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member (restrict communication).')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to timeout')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Timeout duration (e.g., 10m, 2h, 1d)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I cannot timeout that user.', ephemeral: true });
    }

    // Parse duration
    const durationRegex = /^(\d+)([smhd])$/;
    const match = durationStr.match(durationRegex);
    if (!match) {
      return interaction.reply({ content: '❌ Invalid duration format. Use e.g., `10m`, `2h`, `1d`.', ephemeral: true });
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    let milliseconds = 0;
    switch (unit) {
      case 's': milliseconds = value * 1000; break;
      case 'm': milliseconds = value * 60 * 1000; break;
      case 'h': milliseconds = value * 60 * 60 * 1000; break;
      case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break;
    }

    // Discord timeouts max 28 days
    const maxTimeout = 28 * 24 * 60 * 60 * 1000; // is ms
    if (milliseconds > maxTimeout) {
      return interaction.reply({ content: '❌ Timeout cannot exceed 28 days.', ephemeral: true });
    }

    const timeoutUntil = new Date(Date.now() + milliseconds);
    await member.timeout(milliseconds, reason);

    await interaction.reply({
      content: `✅ **${target.tag}** has been timed out until <t:${Math.floor(timeoutUntil / 1000)}:f>.\n📝 Reason: ${reason}`,
    });
  },
};