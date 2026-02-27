const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Get a random cat image.'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const response = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await response.json();

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('🐱 Meow!')
        .setImage(data[0].url);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Failed to fetch a cat.' });
    }
  },
};