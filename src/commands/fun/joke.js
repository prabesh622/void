const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const jokes = [
  'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
  'Why was the JavaScript developer sad? Because he didn\'t Node how to Express himself. 😢',
  'What\'s a programmer\'s favorite hangout place? Foo Bar! 🍺',
  'Why do Java developers wear glasses? Because they can\'t C#! 👓',
  'What do you call a fake noodle? An impasta! 🍝',
  'Why don\'t scientists trust atoms? Because they make up everything! ⚛️',
  'I told my computer I needed a break, and now it won\'t stop sending me KitKat ads. 🍫',
  'Why did the developer go broke? Because he used up all his cache! 💸',
  'There are only 10 types of people in the world: those who understand binary, and those who don\'t.',
  'A SQL query walks into a bar, walks up to two tables and asks... "Can I join you?" 🍻',
  'Why did the chicken cross the road? To get to the other side! 🐔',
  'What do you call a bear with no teeth? A gummy bear! 🐻',
  'Why don\'t eggs tell jokes? They\'d crack each other up! 🥚',
  'What did the ocean say to the beach? Nothing, it just waved. 🌊',
  'Why did the scarecrow win an award? He was outstanding in his field! 🌾',
  'I\'m reading a book about anti-gravity. It\'s impossible to put down! 📖',
  'What do you call a dog that does magic tricks? A Labracadabrador! 🐕',
  'Why couldn\'t the bicycle stand up by itself? It was two tired! 🚲',
  'What did one wall say to the other wall? I\'ll meet you at the corner! 🧱',
  'How does a penguin build its house? Igloos it together! 🐧',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke'),

  async execute(interaction) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];

    const embed = new EmbedBuilder()
      .setColor(0xfdcb6e)
      .setTitle('😂 Joke')
      .setDescription(joke)
      .setFooter({ text: `Requested by ${interaction.user.tag}` });

    interaction.reply({ embeds: [embed] });
  }
};
