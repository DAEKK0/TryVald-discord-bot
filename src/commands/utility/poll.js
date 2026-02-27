const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option1')
        .setDescription('First option')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option2')
        .setDescription('Second option')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('option3')
        .setDescription('Third option (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('option4')
        .setDescription('Fourth option (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('option5')
        .setDescription('Fifth option (optional)')
        .setRequired(false)),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const options = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
      interaction.options.getString('option5'),
    ].filter(opt => opt !== null);

    if (options.length < 2) {
      return interaction.reply({ content: '❌ You must provide at least two options.', ephemeral: true });
    }

    // Emoji list for reactions (up to 5)
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const description = options.map((opt, index) => `${emojis[index]} ${opt}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 ' + question)
      .setDescription(description)
      .setColor('Random')
      .setFooter({ text: `Poll by ${interaction.user.tag}` })
      .setTimestamp();

    const pollMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      await pollMessage.react(emojis[i]);
    }
  },
};