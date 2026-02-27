const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Randomly picks one of the given options')
    .addStringOption(option =>
      option.setName('options')
        .setDescription('Comma-separated list of options (e.g., "pizza, burger, salad")')
        .setRequired(true)),
  async execute(interaction) {
    const optionsString = interaction.options.getString('options');
    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
      return interaction.reply({ content: '❌ Please provide at least two options separated by commas.', ephemeral: true });
    }

    const chosen = options[Math.floor(Math.random() * options.length)];
    await interaction.reply(`🤔 I choose: **${chosen}**`);
  },
};