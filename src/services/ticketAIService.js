/**
 * Ticket AI Triage Service
 * Automatically qualifies tickets created by ANY ticket bot.
 * Asks questions via AI, evaluates responses, and reports qualification status.
 * Uses Google Gemini for AI evaluation.
 */
const { EmbedBuilder } = require('discord.js');
const aiService = require('./aiService');
const GuildSettings = require('../schemas/GuildSettings');

/** Active triage sessions: channelId -> { userId, guildId, step, answers, questions, startTime } */
const activeSessions = new Map();

/** Channels that already completed triage (to avoid re-triggering) */
const completedTriages = new Set();

/** Default qualification questions (used if server has no custom ones) */
const DEFAULT_QUESTIONS = [
  'What issue or problem are you experiencing? Please describe it in detail.',
  'What have you already tried to resolve this issue?',
  'How urgent is this issue for you? (Low / Medium / High / Critical) and why?',
];

function init() {
  console.log('[TicketAI] Ticket AI triage service ready (using Gemini)');
}

/**
 * Check if a channel name matches the server's ticket patterns
 */
function isTicketChannel(channelName, patterns = ['ticket-']) {
  const lower = channelName.toLowerCase();
  return patterns.some(p => lower.startsWith(p.toLowerCase()) || lower.includes(p.toLowerCase()));
}

/**
 * Start a new triage session for a ticket channel
 */
async function startTriage(channel, guildId, userId) {
  if (activeSessions.has(channel.id)) return;
  if (completedTriages.has(channel.id)) return;

  const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
  if (!settings?.ticketAI?.enabled) return;

  const questions = settings.ticketAI.questions?.length ? settings.ticketAI.questions : DEFAULT_QUESTIONS;

  activeSessions.set(channel.id, {
    userId,
    guildId,
    step: 0,
    answers: [],
    questions,
    startTime: Date.now(),
    qualified: null,
  });

  // Send first question
  const introEmbed = new EmbedBuilder()
    .setColor(0x6c5ce7)
    .setTitle('🤖 AI Ticket Triage')
    .setDescription(
      `Hello <@${userId}>! I'll be helping qualify your ticket today.\n\n` +
      `I'll ask you **${questions.length} question(s)** to better understand your issue.\n` +
      `Please answer each question as thoroughly as possible.\n\n` +
      `**Question 1/${questions.length}:**\n${questions[0]}`
    )
    .setFooter({ text: 'Answer by typing in this channel' })
    .setTimestamp();

  await channel.send({ embeds: [introEmbed] }).catch(() => {});
}

/**
 * Process a user message inside a triage session
 * Returns true if the message was consumed by triage (so other handlers should skip)
 */
async function processMessage(message) {
  const session = activeSessions.get(message.channel.id);
  if (!session) return false;
  if (message.author.id !== session.userId) return false;
  if (message.author.bot) return false;

  const { questions, step, answers } = session;

  // Store the answer
  answers.push({ question: questions[step], answer: message.content });
  session.step = step + 1;

  // If more questions remain, ask the next one
  if (session.step < questions.length) {
    const nextQ = questions[session.step];
    const embed = new EmbedBuilder()
      .setColor(0x6c5ce7)
      .setTitle('🤖 AI Ticket Triage')
      .setDescription(
        `✅ Answer recorded!\n\n` +
        `**Question ${session.step + 1}/${questions.length}:**\n${nextQ}`
      )
      .setFooter({ text: `${questions.length - session.step - 1} question(s) remaining` })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] }).catch(() => {});
    return true;
  }

  // All questions answered — run AI evaluation
  try { await message.channel.sendTyping(); } catch {}

  const evaluation = await evaluateTicket(session);

  // Build result embed
  const isQualified = evaluation.qualified;
  const score = evaluation.score;

  const color = isQualified ? 0x00d26a : 0xff4757;
  const status = isQualified ? '✅ QUALIFIED' : '❌ NOT QUALIFIED';

  const qaSummary = answers.map((a, i) =>
    `**Q${i + 1}:** ${a.question}\n**A:** ${a.answer.slice(0, 200)}`
  ).join('\n\n');

  const resultEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🤖 AI Triage Complete')
    .setDescription(
      `**Status:** ${status}\n` +
      `**Score:** ${score}/100\n` +
      `**Reason:** ${evaluation.reason}\n\n` +
      `---\n**Summary of Answers:**\n${qaSummary.slice(0, 2000)}`
    )
    .setFooter({ text: `Triage completed in ${Math.floor((Date.now() - session.startTime) / 1000)}s` })
    .setTimestamp();

  await message.channel.send({ embeds: [resultEmbed] }).catch(() => {});

  // Notify staff if configured
  await notifyStaff(message, session, evaluation).catch(() => {});

  // Clean up session
  activeSessions.delete(message.channel.id);
  completedTriages.add(message.channel.id);
  return true;
}

/**
 * Evaluate the ticket using Gemini AI
 */
async function evaluateTicket(session) {
  const qaText = session.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');

  const systemPrompt = `You are a ticket qualification AI for a Discord server. Your job is to evaluate whether a support ticket is legitimate and qualifies for staff attention.

Evaluate based on:
1. Is the issue clearly described?
2. Does it seem like a genuine support request (not spam/trolling)?
3. Has the user provided enough detail for staff to help?
4. Is it something that actually requires staff intervention?

Respond in this EXACT JSON format (no markdown, no code block):
{"qualified": true/false, "score": 0-100, "reason": "brief explanation"}`;

  try {
    const reply = await aiService.getGeminiResponse(
      `Evaluate this support ticket:\n\n${qaText}`,
      systemPrompt
    );

    if (!reply) return fallbackEvaluation(session);

    // Parse JSON from response
    const cleaned = reply.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackEvaluation(session);

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      qualified: parsed.qualified === true,
      score: Math.min(100, Math.max(0, parsed.score || 50)),
      reason: parsed.reason || 'Evaluation complete.',
    };
  } catch (err) {
    console.error('[TicketAI] AI evaluation error:', err.message);
    return fallbackEvaluation(session);
  }
}

/**
 * Fallback evaluation when AI is unavailable — uses simple heuristics
 */
function fallbackEvaluation(session) {
  let score = 0;
  const reasons = [];

  for (const a of session.answers) {
    const len = a.answer.length;
    if (len >= 20) { score += 25; reasons.push('Detailed answer'); }
    else if (len >= 5) { score += 10; }
    else { reasons.push('Very short answer'); }

    if (/^(.)\1+$/.test(a.answer.trim())) { score -= 20; reasons.push('Repeated characters'); }
    if (/^(idk|no|yes|nah|maybe|sure)$/i.test(a.answer.trim())) { score += 5; }
  }

  score = Math.min(100, Math.max(0, score));
  const qualified = score >= 40;

  return {
    qualified,
    score,
    reason: qualified
      ? `Ticket appears legitimate (score: ${score}).`
      : `Ticket may not qualify (score: ${score}). Answers were too brief or unclear.`,
  };
}

/**
 * Send triage result to staff log channel
 */
async function notifyStaff(message, session, evaluation) {
  const settings = await GuildSettings.findOne({ guildId: session.guildId }).catch(() => null);
  if (!settings?.ticketAI) return;

  const logChannelId = settings.ticketAI.logChannelId;
  if (!logChannelId) return;

  const logChannel = message.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const isQualified = evaluation.qualified;
  const color = isQualified ? 0x00d26a : 0xff4757;
  const status = isQualified ? '✅ Qualified' : '❌ Not Qualified';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🤖 Triage Result')
    .addFields(
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'User', value: `<@${session.userId}>`, inline: true },
      { name: 'Status', value: status, inline: true },
      { name: 'Score', value: `${evaluation.score}/100`, inline: true },
      { name: 'Reason', value: evaluation.reason, inline: false },
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => {});

  if (!isQualified && settings.ticketAI.staffRoleId) {
    await logChannel.send({ content: `<@&${settings.ticketAI.staffRoleId}> Ticket needs review.` }).catch(() => {});
  }
}

function isTriaging(channelId) {
  return activeSessions.has(channelId);
}

function cancelSession(channelId) {
  activeSessions.delete(channelId);
  completedTriages.add(channelId);
}

module.exports = {
  init,
  startTriage,
  processMessage,
  isTicketChannel,
  isTriaging,
  cancelSession,
  activeSessions,
  completedTriages,
};
