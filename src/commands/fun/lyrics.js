const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Search for song lyrics')
    .addStringOption(o => o.setName('song').setDescription('Song name or artist').setRequired(true)),

  async execute(interaction) {
    const song = interaction.options.getString('song');
    await interaction.deferReply();

    try {
      const res = await fetch(`https://api.lyrics.ovh/suggest/${encodeURIComponent(song)}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription(`No lyrics found for **${song}**. Try a different search.`)] });
      }

      const topSong = data.data[0];
      const title = topSong.title;
      const artist = topSong.artist?.name || 'Unknown Artist';
      const album = topSong.album?.title || 'Unknown Album';
      const image = topSong.album?.cover_big || topSong.artist?.picture_big || null;

      // Fetch full lyrics
      let lyrics = '';
      try {
        const lyricsRes = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        if (lyricsRes.ok) {
          const lyricsData = await lyricsRes.json();
          lyrics = lyricsData.lyrics?.slice(0, 3500) || 'Lyrics not available.';
        } else {
          lyrics = 'Could not fetch full lyrics. Try searching again.';
        }
      } catch {
        lyrics = 'Could not fetch full lyrics.';
      }

      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle(`🎵 ${title}`)
        .setDescription(lyrics)
        .addFields(
          { name: '🎤 Artist', value: artist, inline: true },
          { name: '💿 Album', value: album, inline: true },
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      if (image) embed.setThumbnail(image);

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Lyrics] Error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription(`Could not find lyrics for **${song}**. Try a different search.`)] });
    }
  }
};
