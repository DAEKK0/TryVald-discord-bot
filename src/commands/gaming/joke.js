const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke.'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const response = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit');
      const data = await response.json();

      let jokeText;
      if (data.type === 'single') {
        jokeText = data.joke;
      } else {
        jokeText = `${data.setup}\n\n${data.delivery}`;
      }

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('😂 Random Joke')
        .setDescription(jokeText)
        .setFooter({ text: `Category: ${data.category}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Failed to fetch a joke.' });
    }
  },
};