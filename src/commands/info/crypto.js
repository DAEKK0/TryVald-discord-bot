const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crypto')
    .setDescription('Get cryptocurrency price.')
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('Coin ID (e.g., bitcoin, ethereum)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('currency')
        .setDescription('Currency (e.g., usd, eur)')
        .setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply();

    const coin = interaction.options.getString('coin').toLowerCase();
    const currency = interaction.options.getString('currency')?.toLowerCase() || 'usd';

    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=${currency}&include_24hr_change=true`);
      const data = await response.json();

      if (!data[coin]) {
        return interaction.editReply({ content: `❌ Coin **${coin}** not found.` });
      }

      const price = data[coin][currency];
      const change = data[coin][`${currency}_24h_change`]?.toFixed(2);

      const embed = new EmbedBuilder()
        .setColor(change >= 0 ? 'Green' : 'Red')
        .setTitle(`💰 ${coin.toUpperCase()}`)
        .addFields(
          { name: 'Price', value: `${price} ${currency.toUpperCase()}`, inline: true },
          { name: '24h Change', value: change ? `${change}%` : 'N/A', inline: true }
        )
        .setFooter({ text: 'Powered by CoinGecko' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ An error occurred.' });
    }
  },
};