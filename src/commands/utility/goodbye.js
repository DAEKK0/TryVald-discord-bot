const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

const DEFAULT_GOODBYE = {
  title: 'Goodbye {user.name}!',
  description: '{user} has left **{server}**. We now have {memberCount} members.',
  color: '#FF0000',
  image: null,
  footer: 'We will miss you!'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Configure goodbye messages.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set the channel for goodbye messages.')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('The text channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable goodbye messages.'))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable goodbye messages.'))
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Send a test goodbye message.'))
    .addSubcommand(sub =>
      sub.setName('title')
        .setDescription('Set the embed title.')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Title (placeholders: {user}, {user.name}, {server}, {memberCount})')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('description')
        .setDescription('Set the embed description.')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Description text')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('color')
        .setDescription('Set the embed color (hex).')
        .addStringOption(opt =>
          opt.setName('hex')
            .setDescription('Color in #RRGGBB format')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('image')
        .setDescription('Set an image URL for the embed.')
        .addStringOption(opt =>
          opt.setName('url')
            .setDescription('Direct image link')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('footer')
        .setDescription('Set the embed footer.')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Footer text')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset embed to default template.')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    let config = guildConfig.get(guildId) || {};
    if (!config.goodbye) config.goodbye = { enabled: false, channelId: null, embed: { ...DEFAULT_GOODBYE } };

    const save = () => guildConfig.set(guildId, 'goodbye', config.goodbye);

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      config.goodbye.channelId = channel.id;
      save();
      await interaction.reply({ content: `✅ Goodbye channel set to ${channel}.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'enable') {
      if (!config.goodbye.channelId) {
        return interaction.reply({ content: '❌ Please set a channel first using `/goodbye channel`.', flags: MessageFlags.Ephemeral });
      }
      config.goodbye.enabled = true;
      save();
      await interaction.reply({ content: '✅ Goodbye messages enabled.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'disable') {
      config.goodbye.enabled = false;
      save();
      await interaction.reply({ content: '✅ Goodbye messages disabled.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'test') {
      if (!config.goodbye.channelId) {
        return interaction.reply({ content: '❌ No channel configured. Use `/goodbye channel` first.', flags: MessageFlags.Ephemeral });
      }
      const channel = interaction.guild.channels.cache.get(config.goodbye.channelId);
      if (!channel) {
        return interaction.reply({ content: '❌ Configured channel no longer exists.', flags: MessageFlags.Ephemeral });
      }
      const testEmbed = generateEmbed(config.goodbye.embed, interaction.user, interaction.guild, interaction.guild.memberCount);
      await channel.send({ embeds: [testEmbed] });
      await interaction.reply({ content: `✅ Test message sent to ${channel}.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'title') {
      config.goodbye.embed.title = interaction.options.getString('text');
      save();
      await interaction.reply({ content: '✅ Title updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'description') {
      config.goodbye.embed.description = interaction.options.getString('text');
      save();
      await interaction.reply({ content: '✅ Description updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'color') {
      const hex = interaction.options.getString('hex');
      if (!/^#[0-9A-F]{6}$/i.test(hex)) {
        return interaction.reply({ content: '❌ Invalid hex color. Use #RRGGBB format (e.g., #FF0000).', flags: MessageFlags.Ephemeral });
      }
      config.goodbye.embed.color = hex;
      save();
      await interaction.reply({ content: '✅ Color updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'image') {
      const url = interaction.options.getString('url');
      config.goodbye.embed.image = url;
      save();
      await interaction.reply({ content: '✅ Image URL updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'footer') {
      config.goodbye.embed.footer = interaction.options.getString('text');
      save();
      await interaction.reply({ content: '✅ Footer updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'reset') {
      config.goodbye.embed = { ...DEFAULT_GOODBYE };
      save();
      await interaction.reply({ content: '✅ Embed reset to default.', flags: MessageFlags.Ephemeral });
    }
  },
};

// Reuse same generateEmbed function (could be imported from a shared util)
function generateEmbed(embedData, user, guild, memberCount) {
  const replace = (text) => {
    if (!text) return text;
    return text
      .replace(/{user}/g, `<@${user.id}>`)
      .replace(/{user\.name}/g, user.displayName)
      .replace(/{server}/g, guild.name)
      .replace(/{memberCount}/g, memberCount);
  };

  const embed = new EmbedBuilder()
    .setTitle(replace(embedData.title))
    .setDescription(replace(embedData.description))
    .setColor(embedData.color || '#FF0000')
    .setTimestamp();

  if (embedData.footer) embed.setFooter({ text: replace(embedData.footer) });
  if (embedData.image) embed.setImage(embedData.image);

  return embed;
}