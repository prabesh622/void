const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ROASTS = [
  "You're the human equivalent of a participation trophy.",
  "I'd explain it to you, but I left my crayons at home.",
  "You bring everyone so much joy... when you leave the room.",
  "You're like a cloud. Everything brightens up when you disappear.",
  "Your secrets are always safe with me. I never even listen when you tell them.",
  "I'd agree with you, but then we'd both be wrong.",
  "You have something on your face... oh wait, that's just your face.",
  "You're proof that even evolution can go in reverse.",
  "If you were any more inbred, you'd be a sandwich.",
  "Your brain is like the Bermuda Triangle — information goes in and is never found again.",
  "You're like a software update. Every time I see you, I think 'Do I really need this?'",
  "I'd roast you, but my mom told me not to burn trash.",
  "You're not stupid; you just have bad luck thinking.",
  "Light travels faster than sound, which is why you seemed bright until you spoke.",
  "You're the reason shampoo has instructions.",
  "If laughter is the best medicine, your face must be curing the world.",
  "You're like a pencil with no lead — pointless.",
  "I'm not saying you're boring, but your imaginary friend fell asleep.",
  "You're the human version of a period at the end of a sentence — completely unnecessary.",
  "If I wanted to hear from someone like you, I'd flush the toilet.",
  "You're like a WiFi signal — weak and only useful when no one else is around.",
  "I'd call you a tool, but that implies you're actually useful.",
  "You're the type of person who searches for 'how to search on Google'.",
  "Your face could make onions cry.",
  "You bring everyone together... to talk about how annoying you are.",
  "Even your shadow left you.",
  "You're like a broken pencil — pointless.",
  "I'm jealous of everyone that hasn't met you.",
  "You're the reason God created the middle finger.",
  "Your birth certificate is an apology letter from the hospital.",
];

const OWNER_ID = '1101811921340080148';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast someone with a savage comeback')
    .addUserOption(o => o.setName('user').setDescription('User to roast').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: "You can't roast yourself! 😂", ephemeral: true });
    }

    if (target.id === OWNER_ID) {
      return interaction.reply({ content: "You can't roast the owner! 👑 They're untouchable!", ephemeral: true });
    }

    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];

    const embed = new EmbedBuilder()
      .setColor(0xff4757)
      .setTitle('🔥 ROASTED!')
      .setDescription(`<@${target.id}>, ${roast}`)
      .setFooter({ text: `Roasted by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
