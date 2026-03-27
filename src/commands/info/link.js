const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Get the invite link to add this bot to another server.'),
  async execute(interaction) {
    const link = 'https://discord.com/oauth2/authorize?client_id=1476990664204882062&permissions=8&integration_type=0&scope=bot+applications.commands';

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('🔗 Invite Me!')
      .setDescription('Click the link below to add this bot to your own server:')
      .addFields({ name: 'Invite Link', value: link })
      .setFooter({ text: 'Requires Administrator permissions to function fully.' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }); 
  },
};