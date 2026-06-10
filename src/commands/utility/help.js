const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('Void Bot - Help')
      .setDescription('Here are all the available commands:')
      .addFields(
        { name: '🛡️ Moderation', value: '`/ban` `/kick` `/mute` `/unmute` `/warn` `/purge` `/automod` `/giverole` `/removerole`', inline: false },
        { name: '🔧 Utility', value: '`/ping` `/serverinfo` `/userinfo` `/avatar` `/poll` `/remind` `/say` `/suggest` `/suggestconfig` `/afk` `/welcome` `/help`', inline: false },
        { name: '📈 Leveling', value: '`/rank` `/leaderboard` `/levelrewards`', inline: false },
        { name: '🎫 Tickets', value: '`/ticket setup` `/ticket close` `/ticket delete` `/ticket reopen` `/ticket transcript` `/ticket stats`', inline: false },
        { name: '🎉 Giveaways', value: '`/giveaway start` `/giveaway end` `/giveaway reroll` `/giveaway list`', inline: false },
        { name: '💰 Economy', value: '`/balance` `/daily` `/work` `/pay` `/deposit` `/withdraw` `/richest`', inline: false },
        { name: '🎮 Fun', value: '`/8ball` `/meme` `/joke` `/coinflip` `/dice` `/rps`', inline: false },
        { name: '🤖 AI Chat', value: '`/ai setup` `/ai enable` `/ai disable` `/aichannel add` `/aichannel remove` `/personality`', inline: false },
        { name: '📋 Logs', value: '`/logs setup` `/logs enable` `/logs disable` `/logs status`', inline: false },
        { name: '🔒 Security', value: '`/security antiraid` `/security antinuke` `/security status`', inline: false },
        { name: '🎭 Reaction Roles', value: '`/rr create` `/rr delete` `/rr list`', inline: false },
        { name: '✅ Verification', value: '`/verify setup` `/verify enable` `/verify disable`', inline: false },
        { name: '⚙️ Custom Commands', value: '`/customcmd add` `/customcmd remove` `/customcmd list`', inline: false },
      )
      .setFooter({ text: 'Void Bot | All-in-one Discord Bot' })
      .setTimestamp();

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
