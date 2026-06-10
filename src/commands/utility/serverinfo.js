const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about the server'),

  async execute(interaction) {
    const guild = interaction.guild;
    await guild.members.fetch();

    const owner = await guild.fetchOwner();
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;
    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(m => !m.user.bot).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const roles = guild.roles.cache.size;
    const emojis = guild.emojis.cache.size;
    const boostLevel = guild.premiumTier;
    const boosts = guild.premiumSubscriptionCount || 0;

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: 'Owner', value: `${owner.user.tag}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Server ID', value: guild.id, inline: true },
        { name: `Members (${totalMembers})`, value: `Humans: ${humans}\nBots: ${bots}\nOnline: ${online}`, inline: true },
        { name: `Channels (${textChannels + voiceChannels + categories})`, value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categories}`, inline: true },
        { name: `Other`, value: `Roles: ${roles}\nEmojis: ${emojis}\nBoosts: ${boosts} (Tier ${boostLevel})`, inline: true },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 512 }));

    interaction.reply({ embeds: [embed] });
  }
};
