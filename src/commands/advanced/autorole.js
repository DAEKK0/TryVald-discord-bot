const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Configure auto‑role for new members.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    // Subcommand: set (for member role) – replaces all member roles with a single one
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the main auto‑role for members (replaces existing).')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('The role to assign')
            .setRequired(true)))
    // Subcommand: add (add a role to the list)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a role to the auto‑role list for members.')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('The role to add')
            .setRequired(true)))
    // Subcommand: remove (remove a role from the list)
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from the auto‑role list.')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('The role to remove')
            .setRequired(true)))
    // Subcommand: list (show current member roles)
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all auto‑roles for members.'))
    // Subcommand: setbot (set a role for bots)
    .addSubcommand(sub =>
      sub.setName('setbot')
        .setDescription('Set a role for bots (optional).')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('The role to assign to bots')
            .setRequired(false)))
    // Subcommand: disable (remove all auto‑roles)
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable auto‑role (remove all configured roles).'))
    // Subcommand: test (simulate join for testing)
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Test auto‑role assignment on yourself.')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    let config = guildConfig.get(guildId) || {};
    if (!config.autoRole) config.autoRole = { memberRoles: [], botRole: null };

    const save = () => guildConfig.set(guildId, 'autoRole', config.autoRole);

    const canAssign = (role) => {
      const botMember = interaction.guild.members.me;
      return role.editable && botMember.roles.highest.comparePositionTo(role) > 0;
    };

    if (sub === 'set') {
      const role = interaction.options.getRole('role');
      if (!canAssign(role)) {
        return interaction.reply({ content: '❌ I cannot assign that role (it may be higher than my highest role).', flags: MessageFlags.Ephemeral });
      }
      config.autoRole.memberRoles = [role.id];
      save();
      await interaction.reply({ content: `✅ Auto‑role set to ${role}.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'add') {
      const role = interaction.options.getRole('role');
      if (!canAssign(role)) {
        return interaction.reply({ content: '❌ I cannot assign that role.', flags: MessageFlags.Ephemeral });
      }
      if (!config.autoRole.memberRoles.includes(role.id)) {
        config.autoRole.memberRoles.push(role.id);
        save();
        await interaction.reply({ content: `✅ Added ${role} to auto‑role list.`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: `❌ That role is already in the list.`, flags: MessageFlags.Ephemeral });
      }
    }
    else if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      const index = config.autoRole.memberRoles.indexOf(role.id);
      if (index !== -1) {
        config.autoRole.memberRoles.splice(index, 1);
        save();
        await interaction.reply({ content: `✅ Removed ${role} from auto‑role list.`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: `❌ That role is not in the list.`, flags: MessageFlags.Ephemeral });
      }
    }
    else if (sub === 'list') {
      const roles = config.autoRole.memberRoles.map(id => `<@&${id}>`).join(', ') || 'None';
      const botRole = config.autoRole.botRole ? `<@&${config.autoRole.botRole}>` : 'None';
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('📋 Auto‑Role Configuration')
        .addFields(
          { name: 'Member Roles', value: roles, inline: false },
          { name: 'Bot Role', value: botRole, inline: false }
        );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'setbot') {
      const role = interaction.options.getRole('role');
      if (role) {
        if (!canAssign(role)) {
          return interaction.reply({ content: '❌ I cannot assign that role.', flags: MessageFlags.Ephemeral });
        }
        config.autoRole.botRole = role.id;
        save();
        await interaction.reply({ content: `✅ Bot auto‑role set to ${role}.`, flags: MessageFlags.Ephemeral });
      } else {
        config.autoRole.botRole = null;
        save();
        await interaction.reply({ content: `✅ Bot auto‑role disabled.`, flags: MessageFlags.Ephemeral });
      }
    }
    else if (sub === 'disable') {
      config.autoRole = { memberRoles: [], botRole: null };
      save();
      await interaction.reply({ content: `✅ Auto‑role disabled.`, flags: MessageFlags.Ephemeral });
    }
    else if (sub === 'test') {
      if (config.autoRole.memberRoles.length === 0 && !config.autoRole.botRole) {
        return interaction.reply({ content: '❌ No auto‑roles configured.', flags: MessageFlags.Ephemeral });
      }
      const member = interaction.member;
      const rolesToAdd = [];
      if (member.user.bot && config.autoRole.botRole) {
        rolesToAdd.push(config.autoRole.botRole);
      } else if (!member.user.bot && config.autoRole.memberRoles.length) {
        rolesToAdd.push(...config.autoRole.memberRoles);
      }
      if (rolesToAdd.length === 0) {
        return interaction.reply({ content: '❌ No applicable auto‑role for you.', flags: MessageFlags.Ephemeral });
      }
      let success = [], failed = [];
      for (const roleId of rolesToAdd) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
          failed.push(roleId);
          continue;
        }
        if (!canAssign(role)) {
          failed.push(role.name);
          continue;
        }
        try {
          await member.roles.add(role, 'Auto‑role test');
          success.push(role.name);
        } catch (error) {
          failed.push(role.name);
        }
      }
      const embed = new EmbedBuilder()
        .setColor(success.length ? 'Green' : 'Red')
        .setTitle('🧪 Auto‑Role Test')
        .addFields(
          { name: '✅ Assigned', value: success.length ? success.join(', ') : 'None', inline: true },
          { name: '❌ Failed', value: failed.length ? failed.join(', ') : 'None', inline: true }
        );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};