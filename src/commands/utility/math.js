const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('math')
    .setDescription('Calculate a math expression')
    .addStringOption(o => o.setName('expression').setDescription('Math expression (e.g. 2+2, sqrt(16), sin(45))').setRequired(true)),

  async execute(interaction) {
    const expr = interaction.options.getString('expression');

    // Security: only allow safe math characters
    const safe = /^[\d\s+\-*/().,%^sincotaqrtlogpbelPIEe!]+$/i;
    if (!safe.test(expr)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Invalid expression. Only numbers, operators, and math functions are allowed.')], ephemeral: true });
    }

    try {
      let result = '';

      // Replace common math functions
      let safeExpr = expr
        .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
        .replace(/sin\(([^)]+)\)/gi, 'Math.sin($1)')
        .replace(/cos\(([^)]+)\)/gi, 'Math.cos($1)')
        .replace(/tan\(([^)]+)\)/gi, 'Math.tan($1)')
        .replace(/log\(([^)]+)\)/gi, 'Math.log10($1)')
        .replace(/ln\(([^)]+)\)/gi, 'Math.log($1)')
        .replace(/abs\(([^)]+)\)/gi, 'Math.abs($1)')
        .replace(/ceil\(([^)]+)\)/gi, 'Math.ceil($1)')
        .replace(/floor\(([^)]+)\)/gi, 'Math.floor($1)')
        .replace(/round\(([^)]+)\)/gi, 'Math.round($1)')
        .replace(/pow\(([^,]+),([^)]+)\)/gi, 'Math.pow($1,$2)')
        .replace(/\bpi\b/gi, 'Math.PI')
        .replace(/\be\b/gi, 'Math.E')
        .replace(/\^/g, '**');

      // Evaluate safely
      result = Function('"use strict"; return (' + safeExpr + ')')();

      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Invalid result');
      }

      if (!isFinite(result)) {
        throw new Error('Result is infinite');
      }

      // Format nicely
      const formatted = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(10)).toString();

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('🧮 Calculator')
        .setDescription(`**Expression:** \`${expr}\`\n\n**Result:** \`${formatted}\``)
        .setFooter({ text: `Calculated for ${interaction.user.tag}` })
        .setTimestamp();

      // Add extra info for special values
      const extras = [];
      if (result === Math.PI) extras.push('This equals π!');
      if (result === Math.E) extras.push('This equals e!');
      if (Number.isInteger(Math.sqrt(result)) && result > 0) extras.push(`√${result} = ${Math.sqrt(result)}`);
      if (extras.length > 0) embed.addFields({ name: '💡 Fun Fact', value: extras.join('\n') });

      interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Math] Error:', err.message);
      interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription(`Could not calculate \`${expr}\`. Check your expression and try again.\n\n**Supported:** +, -, *, /, ^, %, sqrt, sin, cos, tan, log, ln, abs, ceil, floor, round, pi, e`)], ephemeral: true });
    }
  }
};
