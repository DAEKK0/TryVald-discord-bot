const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway.')
    .addStringOption(option =>
      option.setName('prize')
        .setDescription('The prize to win')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes (1‑1440)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440))
    .addIntegerOption(option =>
      option.setName('winners')
        .setDescription('Number of winners (1‑10)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const durationMinutes = interaction.options.getInteger('duration');
    const winnersCount = interaction.options.getInteger('winners');

    const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);

    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('🎉 Giveaway')
      .setDescription(`Prize: **${prize}**\nEnds: <t:${Math.floor(endTime / 1000)}:R>\nWinners: ${winnersCount}`)
      .setFooter({ text: 'Click the button to enter!' });

    const button = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('enter_giveaway')
          .setLabel('🎁 Enter')
          .setStyle(ButtonStyle.Success)
      );

    const giveawayMessage = await interaction.reply({ embeds: [embed], components: [button], fetchReply: true });

    const enteredUsers = new Set();

    const collector = giveawayMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: durationMinutes * 60 * 1000,
    });

    collector.on('collect', async (buttonInteraction) => {
      if (enteredUsers.has(buttonInteraction.user.id)) {
        return buttonInteraction.reply({ content: '❌ You have already entered!', ephemeral: true });
      }
      enteredUsers.add(buttonInteraction.user.id);
      await buttonInteraction.reply({ content: '✅ You entered the giveaway!', ephemeral: true });
    });

    collector.on('end', async () => {
      button.components[0].setDisabled(true);
      await giveawayMessage.edit({ components: [button] });

      const entries = Array.from(enteredUsers);
      if (entries.length === 0) {
        return giveawayMessage.channel.send('❌ No one entered the giveaway.');
      }

      const winners = [];
      for (let i = 0; i < Math.min(winnersCount, entries.length); i++) {
        const randomIndex = Math.floor(Math.random() * entries.length);
        winners.push(entries[randomIndex]);
        entries.splice(randomIndex, 1);
      }

      const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
      await giveawayMessage.channel.send(`🎉 Congratulations to ${winnerMentions} for winning **${prize}**!`);
    });

    await interaction.followUp({ content: `Giveaway started! Ends <t:${Math.floor(endTime / 1000)}:R>`, ephemeral: true });
  },
};