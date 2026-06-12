const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function generatePalette(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return [
    `hsl(${h}, ${Math.min(s + 20, 100)}%, ${Math.max(l - 30, 5)}%)`,
    `hsl(${h}, ${Math.min(s + 10, 100)}%, ${Math.max(l - 15, 10)}%)`,
    hex,
    `hsl(${h}, ${Math.max(s - 10, 0)}%, ${Math.min(l + 15, 90)}%)`,
    `hsl(${h}, ${Math.max(s - 20, 0)}%, ${Math.min(l + 30, 95)}%)`,
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Get color info and palette')
    .addStringOption(o => o.setName('hex').setDescription('Hex color code (e.g. ff5733 or #ff5733)').setRequired(true)),

  async execute(interaction) {
    let hex = interaction.options.getString('hex').replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Invalid hex code. Use format: `ff5733` or `#ff5733`')], ephemeral: true });
    }

    hex = hex.toLowerCase();
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const palette = generatePalette(`#${hex}`);

    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    const brightnessLabel = brightness > 200 ? 'Very Light' : brightness > 150 ? 'Light' : brightness > 100 ? 'Medium' : brightness > 50 ? 'Dark' : 'Very Dark';

    const embed = new EmbedBuilder()
      .setColor(`#${hex}`)
      .setTitle(`🎨 Color: #${hex.toUpperCase()}`)
      .setDescription(`**HEX:** \`#${hex}\`\n**RGB:** \`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\`\n**HSL:** \`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)\`\n**Brightness:** ${brightnessLabel} (${Math.round(brightness)}/255)`)
      .addFields(
        { name: '🎨 Palette', value: palette.map((c, i) => `${['Darkest', 'Darker', 'Base', 'Lighter', 'Lightest'][i]}: \`${c}\``).join('\n') },
      )
      .setImage(`https://via.placeholder.com/400x100/${hex}/${brightness > 128 ? '000000' : 'ffffff'}.png?text=%23${hex.toUpperCase()}`)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
