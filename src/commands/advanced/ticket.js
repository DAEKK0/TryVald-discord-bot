const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a support ticket.')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ticket')
        .setRequired(false)),
  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;
    const user = interaction.user;

    // Check if a ticket channel already exists for this user (optional)
    const existingChannel = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase()}`);
    if (existingChannel) {
      return interaction.reply({ content: `❌ You already have a ticket: ${existingChannel}`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: null, // optionally set a category ID
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: interaction.client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          // Add role for support staff (optional)
          // {
          //   id: 'support_role_id',
          //   allow: [PermissionFlagsBits.ViewChannel],
          // },
        ],
      });

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('🎫 Support Ticket')
        .setDescription(`Thank you for creating a ticket, ${user}. Support will be with you shortly.`)
        .addFields({ name: 'Reason', value: reason });

      const closeButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`close_ticket_${channel.id}`)
            .setLabel('🔒 Close Ticket')
            .setStyle(ButtonStyle.Danger)
        );

      await channel.send({ content: `${user}`, embeds: [embed], components: [closeButton] });

      await interaction.editReply({ content: `✅ Ticket created: ${channel}` });

      // Handle close button (we'll add a collector in the same file or via event)
      // For simplicity, you can create a button collector in the channel's first message,
      // or better, use an interactionCreate handler for customId starting with 'close_ticket_'.
      // We'll show a simple collector approach here.
      const message = await channel.messages.fetch({ limit: 1 }).then(m => m.first());
      const collector = message.createMessageComponentCollector({
        filter: i => i.customId.startsWith('close_ticket_') && (i.member.permissions.has(PermissionFlagsBits.Administrator) || i.user.id === user.id),
        time: 86400000 * 7, // 7 days
      });

      collector.on('collect', async (i) => {
        await i.deferUpdate();
        const channelId = i.customId.replace('close_ticket_', '');
        const ticketChannel = guild.channels.cache.get(channelId);
        if (ticketChannel) {
          await ticketChannel.delete();
        }
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '❌ Failed to create ticket.' });
    }
  },
};