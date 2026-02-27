const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { addWarning } = require('../../utils/warningManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    // Defer the reply to gain up to 15 minutes
    await interaction.deferReply();

    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ content: '❌ That user is not in this server.', flags: MessageFlags.Ephemeral });
    }

    // Save warning
    const warnings = addWarning(interaction.guild.id, target.id, interaction.user.id, reason);

    // Try to DM the user
    try {
      await target.send(`You have been warned in **${interaction.guild.name}** for: ${reason}\nYou now have ${warnings.length} warning(s).`);
    } catch (error) {
      // DM failed – ignore
    }

    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('⚠️ Member Warned')
      .addFields(
        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Total Warnings', value: `${warnings.length}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};