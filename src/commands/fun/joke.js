const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const JOKES = [
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
  { setup: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field!" },
  { setup: "What do you call a fake noodle?", punchline: "An impasta!" },
  { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up!" },
  { setup: "What did the ocean say to the beach?", punchline: "Nothing, it just waved." },
  { setup: "Why did the bicycle fall over?", punchline: "Because it was two-tired!" },
  { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear!" },
  { setup: "Why can't you give Elsa a balloon?", punchline: "Because she will let it go!" },
  { setup: "What do you call a sleeping dinosaur?", punchline: "A dino-snore!" },
  { setup: "Why did the math book look so sad?", punchline: "Because it had too many problems." },
  { setup: "What do you call cheese that isn't yours?", punchline: "Nacho cheese!" },
  { setup: "Why did the golfer bring two pairs of pants?", punchline: "In case he got a hole in one!" },
  { setup: "What did the grape do when it got stepped on?", punchline: "Nothing, it just let out a little wine." },
  { setup: "How do you organize a space party?", punchline: "You planet!" },
  { setup: "What do you call a dog that does magic?", punchline: "A Labracadabrador!" },
  { setup: "Why don't skeletons fight each other?", punchline: "They don't have the guts!" },
  { setup: "What did one wall say to the other?", punchline: "I'll meet you at the corner!" },
  { setup: "Why did the coffee file a police report?", punchline: "It got mugged!" },
  { setup: "What do you call a lazy kangaroo?", punchline: "A pouch potato!" },
  { setup: "Why do cows have hooves instead of feet?", punchline: "Because they lactose!" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Tell a random joke'),

  async execute(interaction) {
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)];

    const embed = new EmbedBuilder()
      .setColor(0xffa502)
      .setTitle('😂 Joke Time!')
      .setDescription(`**${joke.setup}**\n\n||${joke.punchline}||`)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
