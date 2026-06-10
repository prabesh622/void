const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TEAM_COLORS = [0x3b82f6, 0xff4757, 0x00d26a, 0xffa502, 0x9b59b6, 0xe84393, 0x00cec9, 0xfdcb6e];
const TEAM_EMOJIS = ['🔵', '🔴', '🟢', '🟡', '🟣', '🩷', '🩵', '🟠'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamvote')
    .setDescription('Create a team vote where users pick a team')
    .addStringOption(opt => opt.setName('title').setDescription('Vote title/topic').setRequired(true))
    .addStringOption(opt => opt.setName('team1').setDescription('Team 1 name').setRequired(true))
    .addStringOption(opt => opt.setName('team2').setDescription('Team 2 name').setRequired(true))
    .addStringOption(opt => opt.setName('team3').setDescription('Team 3 name').setRequired(false))
    .addStringOption(opt => opt.setName('team4').setDescription('Team 4 name').setRequired(false))
    .addStringOption(opt => opt.setName('team5').setDescription('Team 5 name').setRequired(false))
    .addStringOption(opt => opt.setName('team6').setDescription('Team 6 name').setRequired(false)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const teams = [];
    for (let i = 1; i <= 6; i++) {
      const team = interaction.options.getString(`team${i}`);
      if (team) teams.push(team);
    }

    // Store team vote data
    interaction.client.teamVotes = interaction.client.teamVotes || new Map();
    const voteId = interaction.id;

    const voteData = {
      title,
      teams,
      votes: new Map(), // userId -> teamIndex
      results: new Array(teams.length).fill(0),
    };
    interaction.client.teamVotes.set(voteId, voteData);

    // Build embed
    const desc = teams.map((t, i) =>
      `${TEAM_EMOJIS[i]} **Team ${t}** — 0 vote(s)`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x6c5ce7)
      .setTitle(`🗳️ ${title}`)
      .setDescription(`${desc}\n\n*Click a button below to vote for your team!*`)
      .setFooter({ text: `Created by ${interaction.user.tag}` })
      .setTimestamp();

    // Build buttons
    const row = new ActionRowBuilder();
    for (let i = 0; i < teams.length; i++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`teamvote_${voteId}_${i}`)
          .setLabel(teams[i])
          .setStyle(ButtonStyle.Primary)
          .setEmoji(TEAM_EMOJIS[i])
      );
    }

    interaction.reply({ embeds: [embed], components: [row] });
  },
};

module.exports.TEAM_COLORS = TEAM_COLORS;
module.exports.TEAM_EMOJIS = TEAM_EMOJIS;
