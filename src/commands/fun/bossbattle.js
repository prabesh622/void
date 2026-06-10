const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

// Boss templates with different difficulties
const BOSSES = {
  easy: [
    { name: 'Goblin King', emoji: '👺', hp: 200, attack: [8, 20], reward: [50, 100] },
    { name: 'Giant Spider', emoji: '🕷️', hp: 180, attack: [10, 18], reward: [40, 90] },
    { name: 'Skeleton Lord', emoji: '💀', hp: 220, attack: [7, 22], reward: [55, 110] },
    { name: 'Slime Queen', emoji: '🟢', hp: 160, attack: [5, 15], reward: [30, 80] },
    { name: 'Forest Wolf', emoji: '🐺', hp: 190, attack: [12, 22], reward: [45, 95] },
    { name: 'Bandit Chief', emoji: '🗡️', hp: 210, attack: [9, 21], reward: [50, 105] },
    { name: 'Cursed Rat', emoji: '🐀', hp: 150, attack: [6, 18], reward: [35, 75] },
    { name: 'Mushroom Fiend', emoji: '🍄', hp: 170, attack: [8, 16], reward: [40, 85] },
    { name: 'Ice Bat', emoji: '🦇', hp: 140, attack: [10, 24], reward: [45, 100] },
    { name: 'Possessed Armor', emoji: '🛡️', hp: 250, attack: [6, 14], reward: [55, 115] },
  ],
  medium: [
    { name: 'Dragon Whelp', emoji: '🐉', hp: 500, attack: [15, 40], reward: [120, 250] },
    { name: 'Dark Wizard', emoji: '🧙', hp: 450, attack: [20, 45], reward: [130, 270] },
    { name: 'Stone Golem', emoji: '🗿', hp: 600, attack: [12, 35], reward: [140, 280] },
    { name: 'Vampire Lord', emoji: '🧛', hp: 480, attack: [18, 42], reward: [125, 260] },
    { name: 'Frost Giant', emoji: '❄️', hp: 550, attack: [14, 38], reward: [135, 275] },
    { name: 'Shadow Assassin', emoji: '🥷', hp: 400, attack: [25, 55], reward: [150, 300] },
    { name: 'Sea Kraken', emoji: '🐙', hp: 520, attack: [16, 40], reward: [130, 265] },
    { name: 'Thunder Hawk', emoji: '🦅', hp: 420, attack: [22, 50], reward: [140, 285] },
    { name: 'Plague Doctor', emoji: '🎭', hp: 470, attack: [19, 44], reward: [135, 270] },
    { name: 'Iron Colossus', emoji: '⚙️', hp: 650, attack: [10, 30], reward: [145, 290] },
  ],
  hard: [
    { name: 'Ancient Dragon', emoji: '🐲', hp: 1200, attack: [30, 70], reward: [300, 600] },
    { name: 'Demon Lord', emoji: '👿', hp: 1500, attack: [35, 80], reward: [400, 800] },
    { name: 'Lich King', emoji: '☠️', hp: 1000, attack: [40, 90], reward: [350, 700] },
    { name: 'Hydra', emoji: '🐍', hp: 1300, attack: [28, 65], reward: [320, 650] },
    { name: 'Phoenix', emoji: '🔥', hp: 1100, attack: [35, 75], reward: [330, 680] },
    { name: 'Death Knight', emoji: '⚔️', hp: 1400, attack: [32, 72], reward: [380, 750] },
    { name: 'Storm Titan', emoji: '🌩️', hp: 1600, attack: [25, 60], reward: [400, 820] },
    { name: 'Blood Moon Witch', emoji: '🌙', hp: 1050, attack: [42, 95], reward: [360, 720] },
    { name: 'Crystal Guardian', emoji: '💎', hp: 1250, attack: [30, 68], reward: [340, 690] },
    { name: 'War Golem', emoji: '🤖', hp: 1800, attack: [20, 50], reward: [420, 850] },
  ],
  legendary: [
    { name: 'World Eater', emoji: '🌑', hp: 3000, attack: [50, 120], reward: [800, 1500] },
    { name: 'Void Titan', emoji: '🌌', hp: 2500, attack: [60, 140], reward: [900, 1800] },
    { name: 'Chaos God', emoji: '⚡', hp: 3500, attack: [45, 130], reward: [1000, 2000] },
    { name: 'Celestial Serpent', emoji: '🐉', hp: 2800, attack: [55, 135], reward: [850, 1700] },
    { name: 'Infernal Overlord', emoji: '🔥', hp: 3200, attack: [48, 125], reward: [950, 1900] },
    { name: 'Frost Empress', emoji: '👑', hp: 2600, attack: [58, 138], reward: [880, 1750] },
    { name: 'Shadow Colossus', emoji: '🌘', hp: 3800, attack: [40, 110], reward: [1050, 2100] },
    { name: 'Primordial Beast', emoji: '🦖', hp: 4000, attack: [42, 100], reward: [1100, 2200] },
  ],
  mythic: [
    { name: 'The Devourer of Stars', emoji: '💫', hp: 6000, attack: [70, 180], reward: [2000, 4000] },
    { name: 'Eternal Void', emoji: '🕳️', hp: 5000, attack: [80, 200], reward: [2500, 5000] },
    { name: 'God of Destruction', emoji: '☄️', hp: 7000, attack: [60, 170], reward: [3000, 6000] },
    { name: 'Time Weaver', emoji: '⏳', hp: 5500, attack: [75, 190], reward: [2200, 4500] },
    { name: 'Reality Bender', emoji: '🌀', hp: 6500, attack: [65, 175], reward: [2800, 5500] },
    { name: 'The Nameless One', emoji: '❓', hp: 8000, attack: [55, 160], reward: [3500, 7000] },
  ],
};

const ATTACK_NAMES = [
  'slashes', 'strikes', 'smashes', 'blasts', 'crushes',
  'slices', 'hacks', 'punches', 'zaps', 'slashes through',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bossbattle')
    .setDescription('Start a boss battle for the server!')
    .addStringOption(opt => opt.setName('difficulty').setDescription('Boss difficulty').setRequired(true)
      .addChoices(
        { name: 'Easy', value: 'easy' },
        { name: 'Medium', value: 'medium' },
        { name: 'Hard', value: 'hard' },
        { name: 'Legendary', value: 'legendary' },
        { name: '⭐⭐⭐⭐⭐ Mythic', value: 'mythic' },
      ))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the battle').addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async execute(interaction) {
    const difficulty = interaction.options.getString('difficulty');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Check for existing battle in this channel
    interaction.client.bossBattles = interaction.client.bossBattles || new Map();
    if (interaction.client.bossBattles.has(channel.id)) {
      return interaction.reply({ embeds: [{ color: 0xff4757, title: 'Battle In Progress', description: `There's already a boss battle in <#${channel.id}>! Finish that one first.` }], ephemeral: true });
    }

    // Pick a random boss from the difficulty tier
    const bossPool = BOSSES[difficulty];
    const boss = { ...bossPool[Math.floor(Math.random() * bossPool.length)] };
    boss.maxHp = boss.hp;
    boss.difficulty = difficulty;
    boss.attackers = new Map(); // userId -> { name, damage, hits }
    boss.channelId = channel.id;
    boss.guildId = interaction.guild.id;
    boss.startedBy = interaction.user.id;
    boss.startedAt = Date.now();

    // Difficulty color and label
    const diffColors = { easy: 0x00d26a, medium: 0xffa502, hard: 0xff4757, legendary: 0x9b59b6, mythic: 0xff0055 };
    const diffLabels = { easy: '⭐ Easy', medium: '⭐⭐ Medium', hard: '⭐⭐⭐ Hard', legendary: '⭐⭐⭐⭐ LEGENDARY', mythic: '⭐⭐⭐⭐⭐ MYTHIC' };

    // Build HP bar
    const hpBar = buildHpBar(boss.hp, boss.maxHp);

    const embed = new EmbedBuilder()
      .setColor(diffColors[difficulty])
      .setTitle(`${boss.emoji} ${boss.name} has appeared!`)
      .setDescription(`**Difficulty:** ${diffLabels[difficulty]}\n\n${hpBar}\n**HP:** ${boss.hp} / ${boss.maxHp}\n\n⚔️ Click **Attack** to deal damage!\n🛡️ Click **Defend** to reduce incoming damage!\n💥 Click **Power Strike** for 2x damage (30% hit chance)`)
      .setFooter({ text: `Started by ${interaction.user.tag} | ${interaction.guild.name}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`boss_attack_${channel.id}`).setLabel('Attack').setStyle(ButtonStyle.Danger).setEmoji('⚔️'),
      new ButtonBuilder().setCustomId(`boss_defend_${channel.id}`).setLabel('Defend').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
      new ButtonBuilder().setCustomId(`boss_power_${channel.id}`).setLabel('Power Strike').setStyle(ButtonStyle.Secondary).setEmoji('💥'),
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    boss.messageId = msg.id;

    interaction.client.bossBattles.set(channel.id, boss);

    if (channel.id !== interaction.channel.id) {
      interaction.reply({ embeds: [{ color: 0x00d26a, title: 'Boss Battle Started!', description: `A **${boss.name}** has appeared in <#${channel.id}>! Go fight!` }], ephemeral: true });
    } else {
      interaction.reply({ content: `⚔️ A **${boss.name}** has appeared! Fight it!`, ephemeral: true });
    }
  },
};

function buildHpBar(current, max) {
  const filled = Math.round((current / max) * 20);
  const empty = 20 - filled;
  const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
  return `\`[${bar}]\``;
}

// Exported for use in interactionCreate
module.exports.BOSSES = BOSSES;
module.exports.buildHpBar = buildHpBar;
module.exports.ATTACK_NAMES = ATTACK_NAMES;
