const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const util = require('util');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Execute JavaScript code from a message (owner only).')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The ID of the message containing the code block')
        .setRequired(true)),
  async execute(interaction) {
    // Owner check
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({ content: '❌ Only the bot owner can use this command.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply(); // Allow time for execution

    const messageId = interaction.options.getString('message_id');
    let message;

    try {
      message = await interaction.channel.messages.fetch(messageId);
    } catch (error) {
      return interaction.editReply('❌ Could not fetch that message. Make sure the ID is correct and the message is in this channel.');
    }

    // Extract code from code block (```code``` or ```js code```)
    const content = message.content;
    const codeBlockRegex = /```(?:\w*)\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    let code = match ? match[1].trim() : content.trim();

    if (!code) {
      return interaction.editReply('❌ No code found in the message.');
    }

    // Capture console output
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args) => logs.push(args.map(arg => util.inspect(arg, { depth: 1 })).join(' '));
    console.error = (...args) => logs.push('❌ ' + args.map(arg => util.inspect(arg, { depth: 1 })).join(' '));
    console.warn = (...args) => logs.push('⚠️ ' + args.map(arg => util.inspect(arg, { depth: 1 })).join(' '));
    console.info = (...args) => logs.push('ℹ️ ' + args.map(arg => util.inspect(arg, { depth: 1 })).join(' '));

    let result;
    let error = null;

    try {
      // Wrap code in an async function to allow await
      const asyncWrapper = new Function('return (async () => { ' + code + ' })();');
      result = await asyncWrapper();
    } catch (e) {
      error = e;
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    }

    // Prepare output
    let output = '';
    if (logs.length > 0) {
      output += '**Console Output:**\n```\n' + logs.join('\n').slice(0, 1000) + '```\n';
    }
    if (error) {
      output += '**Error:**\n```\n' + error.toString().slice(0, 1000) + '```';
    } else if (result !== undefined) {
      output += '**Returned:**\n```js\n' + util.inspect(result, { depth: 1 }).slice(0, 1000) + '```';
    }

    if (!output) {
      output = '✅ Code executed successfully (no output).';
    }

    // Truncate if too long
    if (output.length > 1900) {
      output = output.slice(0, 1900) + '...\n*(Output truncated)*';
    }

    await interaction.editReply(output);
  },
};