const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help on bot commands.')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('Specific command to get details for')
        .setRequired(false)),
  async execute(interaction) {
    const client = interaction.client;
    const commands = client.commands;
    const commandName = interaction.options.getString('command');

    // 🔍 If a specific command is requested
    if (commandName) {
      const command = commands.get(commandName);
      if (!command) {
        return interaction.reply({
          content: `❌ Command \`${commandName}\` not found.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Generate usage from options (or use custom usage if provided)
      let usage = `/${command.data.name}`;
      if (command.data.options && command.data.options.length > 0) {
        const opts = command.data.options.map(opt => {
          const wrap = opt.required ? '<>' : '[]';
          return `${wrap}${opt.name}${wrap}`;
        }).join(' ');
        usage += ` ${opts}`;
      }
      // Override with custom usage if defined
      if (command.usage) usage = command.usage;

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`📘 Command: /${command.data.name}`)
        .setDescription(command.data.description || 'No description')
        .addFields(
          { name: 'Category', value: command.category || 'Uncategorized', inline: true },
          { name: 'Usage', value: `\`\`\`${usage}\`\`\``, inline: false }
        );

      // Options details
      if (command.data.options && command.data.options.length > 0) {
        const optionsText = command.data.options.map(opt => {
          const required = opt.required ? '**Required**' : 'Optional';
          return `• \`${opt.name}\`: ${opt.description} (${required})`;
        }).join('\n');
        embed.addFields({ name: 'Options', value: optionsText, inline: false });
      }

      // Example (custom field)
      if (command.example) {
        embed.addFields({ name: 'Example', value: `\`${command.example}\``, inline: false });
      } else {
        embed.addFields({ name: 'Example', value: '*No example provided*', inline: false });
      }

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // 📋 Otherwise, list all commands by category
    const categories = {};
    for (const [name, cmd] of commands) {
      const cat = cmd.category || 'Uncategorized';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ name, description: cmd.data.description || 'No description' });
    }

    // Sort categories and commands alphabetically
    const sortedCategories = Object.keys(categories).sort();
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('📚 Bot Command List')
      .setDescription('Use `/help <command>` for detailed information about a specific command.');

    for (const cat of sortedCategories) {
      const cmdList = categories[cat]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(cmd => `**/${cmd.name}** — ${cmd.description}`)
        .join('\n');
      embed.addFields({ name: `__${cat.toUpperCase()}__`, value: cmdList, inline: false });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};