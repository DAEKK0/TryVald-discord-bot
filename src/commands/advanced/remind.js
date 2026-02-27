const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder.')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time (e.g., 10m, 2h, 1d)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reminder')
        .setDescription('What to remind you about')
        .setRequired(true)),
  async execute(interaction) {
    const timeStr = interaction.options.getString('time');
    const reminderText = interaction.options.getString('reminder');
    const user = interaction.user;

    // Parse duration (same as timeout command)
    const durationRegex = /^(\d+)([smhd])$/;
    const match = timeStr.match(durationRegex);
    if (!match) {
      return interaction.reply({ content: '❌ Invalid time format. Use e.g., `10m`, `2h`, `1d`.', ephemeral: true });
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

    if (milliseconds > 14 * 24 * 60 * 60 * 1000) { // 14 days max
      return interaction.reply({ content: '❌ Reminder cannot exceed 14 days.', ephemeral: true });
    }

    await interaction.reply({ content: `✅ I'll remind you about that in ${timeStr}.` });

    setTimeout(async () => {
      try {
        await user.send(`⏰ **Reminder:** ${reminderText}`);
      } catch (error) {
        // DM failed – send in the original channel as fallback
        const channel = interaction.channel;
        if (channel) {
          await channel.send(`${user}, here's your reminder: **${reminderText}**`);
        }
      }
    }, milliseconds);
  },
};