const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const FACTS = [
  "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.",
  "Octopuses have three hearts and blue blood.",
  "A group of flamingos is called a 'flamboyance'.",
  "Bananas are berries, but strawberries are not.",
  "The Eiffel Tower grows about 6 inches in summer due to thermal expansion.",
  "There are more stars in the universe than grains of sand on all Earth's beaches.",
  "A bolt of lightning is five times hotter than the surface of the sun.",
  "Cows have best friends and get stressed when separated from them.",
  "The human nose can detect over 1 trillion different scents.",
  "Sea otters hold hands while sleeping to keep from drifting apart.",
  "Venus rotates slower than it orbits the Sun, so a day on Venus is longer than its year.",
  "The world's largest desert is Antarctica (it's a cold desert).",
  "Sharks existed before trees. Sharks have been around for 400+ million years.",
  "A cloud can weigh more than a million pounds.",
  "Sloths can hold their breath longer than dolphins can — up to 40 minutes.",
  "There are more possible iterations of a game of chess than there are atoms in the observable universe.",
  "Wombat poop is cube-shaped.",
  "The inventor of the Pringles can is buried in one.",
  "Astronauts grow up to 2 inches taller in space.",
  "The unicorn is the national animal of Scotland.",
  "It rains diamonds on Saturn and Jupiter.",
  "A day on Mercury lasts 1,408 Earth hours.",
  "The shortest commercial flight in the world is 57 seconds in Scotland.",
  "Humans share 60% of their DNA with bananas.",
  "The heart of a shrimp is located in its head.",
  "Dolphins have names for each other using unique whistles.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The inventor of the lightbulb, Thomas Edison, was afraid of the dark.",
  "There are more trees on Earth than stars in the Milky Way.",
  "Penguins propose to their mates with a pebble.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Get a random fun fact')
    .addStringOption(o => o.setName('category').setDescription('Fact category').setRequired(false)
      .addChoices({ name: 'Science', value: 'science' }, { name: 'Animals', value: 'animals' }, { name: 'Space', value: 'space' }, { name: 'Random', value: 'random' })),

  async execute(interaction) {
    const fact = FACTS[Math.floor(Math.random() * FACTS.length)];

    const colors = [0x6c5ce7, 0x00d26a, 0xffa502, 0x3b82f6, 0xff6b81, 0x9b59b6];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🧠 Random Fact')
      .setDescription(fact)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
