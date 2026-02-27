const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Get a random dog image.'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const response = await fetch('https://dog.ceo/api/breeds/image/random');
      const data = await response.json();

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('🐶 Woof!')
        .setImage(data.message);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Failed to fetch a dog.' });
    }
  },
};