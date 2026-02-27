const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urban')
    .setDescription('Look up a word on Urban Dictionary.')
    .addStringOption(option =>
      option.setName('word')
        .setDescription('Word to search')
        .setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();

    const word = interaction.options.getString('word');
    try {
      const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
      const data = await response.json();

      if (data.list.length === 0) {
        return interaction.editReply({ content: `❌ No results for **${word}**.` });
      }

      const first = data.list[0];
      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle(`📘 ${first.word}`)
        .setURL(first.permalink)
        .setDescription(first.definition.slice(0, 4096))
        .addFields(
          { name: 'Example', value: first.example.slice(0, 1024) || 'No example' },
          { name: '👍', value: first.thumbs_up.toString(), inline: true },
          { name: '👎', value: first.thumbs_down.toString(), inline: true }
        )
        .setFooter({ text: `by ${first.author}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ An error occurred.' });
    }
  },
};