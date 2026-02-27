const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text to another language.')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Text to translate')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('target')
        .setDescription('Target language code (e.g., es, fr, de)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('source')
        .setDescription('Source language code (auto-detect if omitted)')
        .setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply();

    const text = interaction.options.getString('text');
    const target = interaction.options.getString('target');
    const source = interaction.options.getString('source') || 'auto';

    // Using LibreTranslate public instance (rate‑limited). For production, host your own or use Google Translate API.
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: text,
          source: source,
          target: target,
          format: 'text',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('🌐 Translation')
        .addFields(
          { name: 'Original', value: text.slice(0, 1024) },
          { name: 'Translated', value: data.translatedText.slice(0, 1024) }
        )
        .setFooter({ text: `Detected source: ${data.detectedLanguage?.language || source}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Translation failed. Try again later.' });
    }
  },
};