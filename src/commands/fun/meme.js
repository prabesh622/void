const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit'),

  async execute(interaction) {
    const subreddits = ['memes', 'dankmemes', 'funny', 'me_irl', 'wholesomememes'];
    const sub = subreddits[Math.floor(Math.random() * subreddits.length)];

    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/random/.json`);
      const data = await res.json();
      const post = Array.isArray(data) ? data[0]?.data?.children[0]?.data : data?.data?.children[0]?.data;

      if (!post || post.over_18) {
        return interaction.reply({ content: 'Couldn\'t fetch a meme. Try again!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(post.title)
        .setImage(post.url)
        .setFooter({ text: `r/${sub} • 👍 ${post.ups || 0}` })
        .setURL(`https://reddit.com${post.permalink}`)
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch {
      interaction.reply({ content: 'Failed to fetch a meme. Try again later!', ephemeral: true });
    }
  }
};
