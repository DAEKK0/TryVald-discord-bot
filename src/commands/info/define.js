const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('define')
    .setDescription('Get definition of a word.')
    .addStringOption(option =>
      option.setName('word')
        .setDescription('Word to define')
        .setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();

    const word = interaction.options.getString('word');
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (response.status === 404) {
        return interaction.editReply({ content: `❌ No definition found for **${word}**.` });
      }
      const data = await response.json();

      const first = data[0];
      const meanings = first.meanings.slice(0, 3); // 3 meanings limit

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle(`📖 ${first.word}`)
        .setURL(`https://www.dictionary.com/browse/${encodeURIComponent(word)}`)
        .setDescription(first.phonetic || 'No pronunciation');

      for (const meaning of meanings) {
        const definition = meaning.definitions[0];
        embed.addFields({
          name: `**${meaning.partOfSpeech}**`,
          value: definition.definition.slice(0, 1024) + (definition.example ? `\n*Example: ${definition.example}*` : '')
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ An error occurred.' });
    }
  },
};