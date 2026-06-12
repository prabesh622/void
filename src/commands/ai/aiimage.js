const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aiimage')
    .setDescription('Generate an image with AI')
    .addStringOption(o => o.setName('prompt').setDescription('Describe the image you want').setRequired(true))
    .addStringOption(o => o.setName('style').setDescription('Image style').setRequired(false)
      .addChoices(
        { name: 'Anime', value: 'anime style' },
        { name: 'Realistic', value: 'photorealistic' },
        { name: 'Pixel Art', value: 'pixel art style' },
        { name: 'Oil Painting', value: 'oil painting style' },
        { name: '3D Render', value: '3D render' },
      )),

  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    const style = interaction.options.getString('style') || '';
    const fullPrompt = style ? `${prompt}, ${style}` : prompt;

    await interaction.deferReply();

    try {
      // Use free Pollinations.ai API
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&seed=${seed}&nologo=true`;

      // Verify the URL works
      const testRes = await fetch(imageUrl, { method: 'HEAD' });
      if (!testRes.ok) throw new Error('Image generation failed');

      const embed = new EmbedBuilder()
        .setColor(0x6c5ce7)
        .setTitle('🎨 AI Generated Image')
        .setDescription(`**Prompt:** ${prompt}${style ? `\n**Style:** ${style}` : ''}`)
        .setImage(imageUrl)
        .setFooter({ text: `Requested by ${interaction.user.tag} • Seed: ${seed}` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[AI] /aiimage error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription(`Failed to generate image. Please try again with a different prompt.`)] });
    }
  }
};
