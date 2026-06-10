const { EmbedBuilder } = require('discord.js');

const COLORS = {
  success: 0x00d26a, error: 0xff4757, info: 0x3b82f6,
  warning: 0xffa502, default: 0x2f3136, premium: 0xffd700,
};

function successEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(title).setDescription(description).setTimestamp();
}
function errorEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(title).setDescription(description).setTimestamp();
}
function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(description).setTimestamp();
}
function warningEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.warning).setTitle(title).setDescription(description).setTimestamp();
}
function modEmbed(title, description, moderator) {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(title).setDescription(description)
    .addFields({ name: 'Moderator', value: moderator || 'Unknown', inline: true }).setTimestamp();
}

module.exports = { COLORS, successEmbed, errorEmbed, infoEmbed, warningEmbed, modEmbed };
