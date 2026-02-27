const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice using notation like 2d6, 1d20+3')
    .addStringOption(option =>
      option.setName('dice')
        .setDescription('Dice notation (e.g., 2d6, 1d20+2)')
        .setRequired(true)),
  async execute(interaction) {
    const diceString = interaction.options.getString('dice').replace(/\s+/g, '');
    const match = diceString.match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/i);

    if (!match) {
      return interaction.reply({ content: '❌ Invalid dice notation. Use format like `2d6`, `1d20+3`, or `3d8-1`.', ephemeral: true });
    }

    const numDice = parseInt(match[1], 10);
    const diceSides = parseInt(match[2], 10);
    const modifierOp = match[3];
    const modifierVal = match[4] ? parseInt(match[4], 10) : 0;

    if (numDice > 100) {
      return interaction.reply({ content: '❌ Too many dice! Maximum is 100.', ephemeral: true });
    }
    if (diceSides > 1000) {
      return interaction.reply({ content: '❌ Dice sides too high! Maximum is 1000.', ephemeral: true });
    }

    let total = 0;
    const rolls = [];
    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * diceSides) + 1;
      rolls.push(roll);
      total += roll;
    }

    let resultString = `🎲 **Result:** ${rolls.join(' + ')} = **${total}**`;
    if (modifierOp) {
      const modTotal = modifierOp === '+' ? total + modifierVal : total - modifierVal;
      resultString += ` ${modifierOp} ${modifierVal} = **${modTotal}**`;
    }

    await interaction.reply({ content: resultString });
  },
};