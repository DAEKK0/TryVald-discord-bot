const { Events, EmbedBuilder } = require('discord.js');
const guildConfig = require('../utils/guildConfig');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const guild = member.guild;
    const config = guildConfig.get(guild.id);

    // ─────────────────────────────────────────────────────────────
    // 1. AUTO‑ROLE (for both members and bots, if configured)
    // ─────────────────────────────────────────────────────────────
    if (config?.autoRole) {
      const isBot = member.user.bot;
      let roleIds = [];

      if (isBot && config.autoRole.botRole) {
        roleIds = [config.autoRole.botRole];
      } else if (!isBot && config.autoRole.memberRoles?.length) {
        roleIds = config.autoRole.memberRoles;
      }

      if (roleIds.length > 0) {
        const rolesToAdd = [];
        for (const roleId of roleIds) {
          const role = guild.roles.cache.get(roleId);
          if (!role) {
            console.error(`[AutoRole] Role ${roleId} not found in guild ${guild.id}`);
            continue;
          }
          // Check hierarchy: bot's highest role must be above the target role
          if (guild.members.me.roles.highest.comparePositionTo(role) <= 0) {
            console.error(`[AutoRole] Cannot assign role ${role.name} (higher than or equal to bot's highest role)`);
            continue;
          }
          if (member.roles.cache.has(roleId)) continue; // already has it
          rolesToAdd.push(role);
        }

        if (rolesToAdd.length > 0) {
          try {
            await member.roles.add(rolesToAdd, 'Auto‑role on join');
          } catch (error) {
            console.error(`[AutoRole] Failed to assign roles to ${member.user.tag}:`, error);
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. WELCOME MESSAGE (only for members, ignore bots)
    // ─────────────────────────────────────────────────────────────
    if (member.user.bot) return; // bots don't trigger welcome messages

    if (!config?.welcome?.enabled) return;
    if (!config.welcome.channelId) return;

    const channel = guild.channels.cache.get(config.welcome.channelId);
    if (!channel) return;

    // Count members excluding bots
    const memberCount = guild.members.cache.filter(m => !m.user.bot).size;

    const embed = generateEmbed(config.welcome.embed, member.user, guild, memberCount);

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send welcome message:', error);
    }
  },
};

// Helper function to generate welcome embed with placeholders
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