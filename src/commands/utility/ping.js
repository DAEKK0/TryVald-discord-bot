const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong! and shows response time'),
  async execute(interaction) {
    // Calculate response time using interaction timestamp
    const responseTime = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`Pong! 🏓 (Response time: ${responseTime}ms)`);
  },
};