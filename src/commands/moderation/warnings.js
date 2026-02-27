const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getWarnings } = require('../../utils/warningManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('List warnings for a member.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to check')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const warnings = getWarnings(interaction.guild.id, target.id);

    if (warnings.length === 0) {
      return interaction.reply({ content: `✅ **${target.tag}** has no warnings.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`⚠️ Warnings for ${target.tag}`)
      .setDescription(warnings.map((w, i) => 
        `**${i+1}.** ${w.reason} — <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R> (by <@${w.moderatorId}>)`
      ).join('\n'))
      .setFooter({ text: `Total: ${warnings.length}` });

    await interaction.reply({ embeds: [embed] });
  },
};