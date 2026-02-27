const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play rock‑paper‑scissors with the bot.'),
  async execute(interaction) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('paper').setLabel('📄 Paper').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Primary)
      );

    const embed = new EmbedBuilder()
      .setColor('Random')
      .setTitle('Rock‑Paper‑Scissors')
      .setDescription('Choose your move!');

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({ content: '❌ This game is not for you.', ephemeral: true });
      }

      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * 3)];
      const userChoice = buttonInteraction.customId;

      let result;
      if (userChoice === botChoice) {
        result = 'It\'s a tie!';
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = 'You win!';
      } else {
        result = 'I win!';
      }

      const emojiMap = { rock: '🪨', paper: '📄', scissors: '✂️' };
      const resultEmbed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('Rock‑Paper‑Scissors')
        .addFields(
          { name: 'You', value: `${emojiMap[userChoice]} ${userChoice}`, inline: true },
          { name: 'Me', value: `${emojiMap[botChoice]} ${botChoice}`, inline: true },
          { name: 'Result', value: result }
        );

      await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
      collector.stop();
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: '⏰ Time expired.', components: [] });
      }
    });
  },
};