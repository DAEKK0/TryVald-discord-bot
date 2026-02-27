const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play Tic‑Tac‑Toe with another user.')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('The user to play against')
        .setRequired(true)),
  async execute(interaction) {
    const opponent = interaction.options.getUser('opponent');
    if (opponent.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot play against yourself.', ephemeral: true });
    }
    if (opponent.bot) {
      return interaction.reply({ content: '❌ You cannot play against a bot.', ephemeral: true });
    }

    const board = ['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'];
    let currentPlayer = interaction.user;
    let gameActive = true;

    const createButtons = () => {
      const rows = [];
      for (let i = 0; i < 9; i += 3) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
          const index = i + j;
          const emoji = board[index] === '⬜' ? '⬛' : (board[index] === '❌' ? '❌' : '⭕');
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`ttt_${index}`)
              .setEmoji(emoji)
              .setStyle(board[index] === '⬜' ? ButtonStyle.Secondary : (board[index] === '❌' ? ButtonStyle.Danger : ButtonStyle.Success))
              .setDisabled(board[index] !== '⬜' || !gameActive)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const checkWinner = () => {
      const winPatterns = [
        [0,1,2], [3,4,5], [6,7,8], // rows
        [0,3,6], [1,4,7], [2,5,8], // columns
        [0,4,8], [2,4,6]           // diagonals
      ];
      for (const pattern of winPatterns) {
        const [a,b,c] = pattern;
        if (board[a] !== '⬜' && board[a] === board[b] && board[a] === board[c]) {
          return board[a]; // '❌' or '⭕'
        }
      }
      if (!board.includes('⬜')) return 'tie';
      return null;
    };

    const embed = new EmbedBuilder()
      .setColor('Random')
      .setTitle('Tic‑Tac‑Toe')
      .setDescription(`**${interaction.user.username}** (❌) vs **${opponent.username}** (⭕)\n\nIt's **${currentPlayer.username}'s** turn.`);

    const reply = await interaction.reply({ embeds: [embed], components: createButtons(), fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== currentPlayer.id) {
        return buttonInteraction.reply({ content: '❌ It\'s not your turn!', ephemeral: true });
      }

      const index = parseInt(buttonInteraction.customId.split('_')[1], 10);
      if (board[index] !== '⬜') return;

      board[index] = currentPlayer === interaction.user ? '❌' : '⭕';

      const winner = checkWinner();
      if (winner) {
        gameActive = false;
        let resultText;
        if (winner === 'tie') {
          resultText = "It's a tie!";
        } else {
          const winnerUser = winner === '❌' ? interaction.user : opponent;
          resultText = `**${winnerUser.username}** wins!`;
        }
        embed.setDescription(resultText);
        await buttonInteraction.update({ embeds: [embed], components: createButtons() });
        collector.stop();
        return;
      }

      // Switch player
      currentPlayer = currentPlayer === interaction.user ? opponent : interaction.user;
      embed.setDescription(`**${interaction.user.username}** (❌) vs **${opponent.username}** (⭕)\n\nIt's **${currentPlayer.username}'s** turn.`);
      await buttonInteraction.update({ embeds: [embed], components: createButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        embed.setDescription('⏰ Game expired.');
        interaction.editReply({ embeds: [embed], components: [] });
      }
    });
  },
};