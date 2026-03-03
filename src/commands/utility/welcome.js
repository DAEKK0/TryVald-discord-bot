const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

// Default embed template for welcome
const DEFAULT_WELCOME = {
  title: 'Welcome {user.name}!',
  description: 'Welcome to **{server}**, {user}! We now have {memberCount} members.',
  color: '#00FF00',
  image: null,
  footer: 'Enjoy your stay!'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome messages.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // Subcommand: channel
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set the channel for welcome messages.')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('The text channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    // Subcommand: enable
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable welcome messages.'))
    // Subcommand: disable
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable welcome messages.'))
    // Subcommand: test
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Send a test welcome message.'))
    // Subcommand: title
    .addSubcommand(sub =>
      sub.setName('title')
        .setDescription('Set the embed title.')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Title (placeholders: {user}, {user.name}, {server}, {memberCount})')
            .setRequired(true)))
    // Subcommand: description
    .addSubcommand(sub =>
      sub.setName('description')
        .setDescription('Set the embed description.')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Description text')
            .setRequired(true)))
    // Subcommand: color
    .addSubcommand(sub =>
      sub.setName('color')
        .setDescription('Set the embed color (hex).')
        .addStringOption(opt =>
          opt.setName('hex')
            .setDescription('Color in #RRGGBB format')
            .setRequired(true)))
    // Subcommand: image
    .addSubcommand(sub =>
      sub.setName('image')
        .setDescription('Set an image URL for the embed.')
        .addStringOption(opt =>
          opt.setName('url')
            .setDescription('Direct image link')
            .setRequired(true)))
    // Subcommand: footer
    .addSubcommand(sub =>
      sub.setName('footer')
        .setDescription('Set the embed footer.')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Footer text')
            .setRequired(true)))
    // Subcommand: reset
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset embed to default template.')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    let config = guildConfig.get(guildId) || {};
    if (!config.welcome) config.welcome = { enabled: false, channelId: null, embed: { ...DEFAULT_WELCOME } };

    // Helper to save welcome config
    const save = () => guildConfig.set(guildId, 'welcome', config.welcome);

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      config.welcome.channelId = channel.id;
      save();
      await interaction.reply({ content: `✅ Welcome channel set to ${channel}.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'enable') {
      if (!config.welcome.channelId) {
        return interaction.reply({ content: '❌ Please set a channel first using `/welcome channel`.', flags: MessageFlags.Ephemeral });
      }
      config.welcome.enabled = true;
      save();
      await interaction.reply({ content: '✅ Welcome messages enabled.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'disable') {
      config.welcome.enabled = false;
      save();
      await interaction.reply({ content: '✅ Welcome messages disabled.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'test') {
      if (!config.welcome.channelId) {
        return interaction.reply({ content: '❌ No channel configured. Use `/welcome channel` first.', flags: MessageFlags.Ephemeral });
      }
      const channel = interaction.guild.channels.cache.get(config.welcome.channelId);
      if (!channel) {
        return interaction.reply({ content: '❌ Configured channel no longer exists.', flags: MessageFlags.Ephemeral });
      }
      // Generate test embed using the command user
      const testEmbed = generateEmbed(config.welcome.embed, interaction.user, interaction.guild, interaction.guild.memberCount);
      await channel.send({ embeds: [testEmbed] });
      await interaction.reply({ content: `✅ Test message sent to ${channel}.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'title') {
      config.welcome.embed.title = interaction.options.getString('text');
      save();
      await interaction.reply({ content: '✅ Title updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'description') {
      config.welcome.embed.description = interaction.options.getString('text');
      save();
      await interaction.reply({ content: '✅ Description updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'color') {
      const hex = interaction.options.getString('hex');
      if (!/^#[0-9A-F]{6}$/i.test(hex)) {
        return interaction.reply({ content: '❌ Invalid hex color. Use #RRGGBB format (e.g., #FF0000).', flags: MessageFlags.Ephemeral });
      }
      config.welcome.embed.color = hex;
      save();
      await interaction.reply({ content: '✅ Color updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'image') {
      const url = interaction.options.getString('url');
      // Simple validation – could be improved
      config.welcome.embed.image = url;
      save();
      await interaction.reply({ content: '✅ Image URL updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'footer') {
      config.welcome.embed.footer = interaction.options.getString('text');
      save();
      await interaction.reply({ content: '✅ Footer updated.', flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'reset') {
      config.welcome.embed = { ...DEFAULT_WELCOME };
      save();
      await interaction.reply({ content: '✅ Embed reset to default.', flags: MessageFlags.Ephemeral });
    }
  },
};

// Helper to generate an embed with placeholders replaced
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
    .setColor(embedData.color || '#00FF00')
    .setTimestamp();

  if (embedData.footer) embed.setFooter({ text: replace(embedData.footer) });
  if (embedData.image) embed.setImage(embedData.image);

  return embed;
}