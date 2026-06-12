const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MEMES = [
  { title: "When the code works on first try", url: "https://i.imgflip.com/1bij.jpg", color: 0x00d26a },
  { title: "Me debugging at 3AM", url: "https://i.imgflip.com/1ur9b0.jpg", color: 0xff4757 },
  { title: "When the WiFi drops for 0.1 seconds", url: "https://i.imgflip.com/26am.jpg", color: 0xffa502 },
  { title: "Monday morning vibes", url: "https://i.imgflip.com/30b1gx.jpg", color: 0x747d8c },
  { title: "When someone says 'quick question'", url: "https://i.imgflip.com/1h7in3.jpg", color: 0x6c5ce7 },
  { title: "After eating one chip", url: "https://i.imgflip.com/1e7ql7.jpg", color: 0xff6b81 },
  { title: "Me pretending to work", url: "https://i.imgflip.com/21aq5f.jpg", color: 0x3b82f6 },
  { title: "When the teacher says 'group project'", url: "https://i.imgflip.com/2gn3h9.jpg", color: 0xff4757 },
];

const REDDIT_MEMES = [
  'https://www.reddit.com/r/memes/top/.json?limit=50&t=day',
  'https://www.reddit.com/r/dankmemes/top/.json?limit=50&t=day',
  'https://www.reddit.com/r/funny/top/.json?limit=50&t=day',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Try to fetch from Reddit
      const url = REDDIT_MEMES[Math.floor(Math.random() * REDDIT_MEMES.length)];
      const res = await fetch(url, { headers: { 'User-Agent': 'VoidBot/1.0' } });
      const json = await res.json();

      const posts = (json.data?.children || [])
        .filter(p => !p.data.is_video && !p.data.over_18 && (p.data.url.endsWith('.jpg') || p.data.url.endsWith('.png') || p.data.url.endsWith('.gif')))
        .map(p => p.data);

      if (posts.length > 0) {
        const post = posts[Math.floor(Math.random() * posts.length)];
        const embed = new EmbedBuilder()
          .setColor(0xff6b81)
          .setTitle(post.title)
          .setImage(post.url)
          .setFooter({ text: `👍 ${post.ups} • r/${post.subreddit} • Requested by ${interaction.user.tag}` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    } catch {
      // Fallback to built-in memes
    }

    // Fallback
    const meme = MEMES[Math.floor(Math.random() * MEMES.length)];
    const embed = new EmbedBuilder()
      .setColor(meme.color)
      .setTitle(meme.title)
      .setImage(meme.url)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  }
};
