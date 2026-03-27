const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

// parse duration strings
function parseDuration(durationStr) {
  const regex = /^(\d+)([smhd])$/;
  const match = durationStr.match(regex);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * multipliers[unit];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock or unlock a channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Lock a channel.')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('The channel to lock (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('duration')
            .setDescription('How long to lock (e.g., 10m, 2h, 1d)')
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('reason')
            .setDescription('Reason for locking')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Unlock a channel.')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('The channel to unlock (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false))
        .addStringOption(opt =>
          opt.setName('reason')
            .setDescription('Reason for unlocking')
            .setRequired(false))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = interaction.guild.id;

    // Channel managing bot permission check
    if (!targetChannel.manageable) {
      return interaction.reply({ content: '❌ I do not have permission to manage that channel.', flags: MessageFlags.Ephemeral });
    }

    // Load current config
    const config = guildConfig.get(guildId) || {};
    if (!config.lockedChannels) config.lockedChannels = {};

    if (sub === 'enable') {
      // Check if already locked
      if (config.lockedChannels[targetChannel.id]) {
        return interaction.reply({ content: '❌ This channel is already locked.', flags: MessageFlags.Ephemeral });
      }

      // Parse duration
      const durationStr = interaction.options.getString('duration');
      let lockedUntil = null;
      let durationMs = null;
      if (durationStr) {
        durationMs = parseDuration(durationStr);
        if (!durationMs) {
          return interaction.reply({ content: '❌ Invalid duration format. Use e.g., `10m`, `2h`, `1d`.', flags: MessageFlags.Ephemeral });
        }
        lockedUntil = Date.now() + durationMs;
      }

      // Apply lock: deny Send Messages for @everyone
      await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });

      // Save lock info
      const lockInfo = {
        lockedBy: interaction.user.id,
        lockedAt: Date.now(),
        reason,
        lockedUntil: lockedUntil ? lockedUntil : null,
      };
      config.lockedChannels[targetChannel.id] = lockInfo;
      guildConfig.set(guildId, 'lockedChannels', config.lockedChannels);

      // Auto-unlock schedule if duration set
      if (lockedUntil) {
        scheduleUnlock(interaction.client, guildId, targetChannel.id, lockedUntil);
      }

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🔒 Channel Locked')
        .setDescription(`**${targetChannel}** has been locked.`)
        .addFields(
          { name: 'Reason', value: reason, inline: false },
          { name: 'Locked by', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

      if (lockedUntil) {
        embed.addFields(
          { name: 'Duration', value: durationStr, inline: true },
          { name: 'Unlocks at', value: `<t:${Math.floor(lockedUntil / 1000)}:F>`, inline: true }
        );
      } else {
        embed.addFields({ name: 'Unlocks', value: 'Manually', inline: true });
      }

      await interaction.reply({ embeds: [embed] });
    }

    else if (sub === 'disable') {
      // Check if locked
      if (!config.lockedChannels[targetChannel.id]) {
        return interaction.reply({ content: '❌ This channel is not locked.', flags: MessageFlags.Ephemeral });
      }

      // Remove the permission overwrite for @everyone (SendMessages)
      await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      }, { reason: `Unlocked by ${interaction.user.tag}: ${reason}` });

      // Delete lock info
      delete config.lockedChannels[targetChannel.id];
      guildConfig.set(guildId, 'lockedChannels', config.lockedChannels);

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('🔓 Channel Unlocked')
        .setDescription(`**${targetChannel}** has been unlocked.`)
        .addFields(
          { name: 'Reason', value: reason, inline: false },
          { name: 'Unlocked by', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};

// Helper function to schedule unlock
function scheduleUnlock(client, guildId, channelId, unlockTime) {
  const now = Date.now();
  const delay = unlockTime - now;
  if (delay <= 0) {
    // Already passed, unlock immediately
    unlockChannel(client, guildId, channelId, 'Auto‑unlock (duration expired)');
    return;
  }

  setTimeout(async () => {
    await unlockChannel(client, guildId, channelId, 'Auto‑unlock (duration expired)');
  }, delay);
}

async function unlockChannel(client, guildId, channelId, reason) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return;
    const channel = await guild.channels.fetch(channelId);
    if (!channel) return;

    // Remove the @everyone SendMessages overwrite
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: null
    }, { reason });

    // Remove from config
    const config = guildConfig.get(guildId) || {};
    if (config.lockedChannels && config.lockedChannels[channelId]) {
      delete config.lockedChannels[channelId];
      guildConfig.set(guildId, 'lockedChannels', config.lockedChannels);
    }

    // Optionally send a message in the channel announcing unlock
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🔓 Channel Unlocked')
      .setDescription(`This channel has been automatically unlocked.`)
      .setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    console.error(`Failed to auto‑unlock channel ${channelId}:`, error);
  }
}