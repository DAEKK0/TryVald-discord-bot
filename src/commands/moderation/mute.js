const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

// parse duration strings 
function parseDuration(durationStr) {
  const regex = /^(\d+)([smhd])$/;
  const match = durationStr.match(regex);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * multipliers[unit];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user in all channels for a specific duration.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration (e.g., 10m, 2h, 1d)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ That user is not in this server.', flags: MessageFlags.Ephemeral });
    }

    // Role hierarchy check
    if (!member.moderatable) {
      return interaction.reply({ content: '❌ I cannot mute that user. They may have higher permissions than me.', flags: MessageFlags.Ephemeral });
    }

    // Parse duration
    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      return interaction.reply({ content: '❌ Invalid duration format. Use e.g., `10m`, `2h`, `1d`.', flags: MessageFlags.Ephemeral });
    }

    // Discord timeouts max 28 days
    const maxTimeout = 28 * 24 * 60 * 60 * 1000; // 28 days in ms
    if (durationMs > maxTimeout) {
      return interaction.reply({ content: '❌ Mute duration cannot exceed 28 days.', flags: MessageFlags.Ephemeral });
    }

    // Apply timeout
    const muteUntil = new Date(Date.now() + durationMs);
    await member.timeout(durationMs, reason);

    // Try to DM the user
    try {
      await target.send(`You have been muted in **${interaction.guild.name}** for ${durationStr}. Reason: ${reason}`);
    } catch (error) {
      // DM failed – ignore
    }

    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('🔇 User Muted')
      .addFields(
        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Duration', value: durationStr, inline: true },
        { name: 'Muted until', value: `<t:${Math.floor(muteUntil / 1000)}:F>`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};