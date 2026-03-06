const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const guildConfig = require('./guildConfig');

// Store active jobs: Map<guildId, Map<jobId, cronJob>>
const activeJobs = new Map();

// Helper to build embed from stored data
function buildEmbed(embedData, messageText) {
  const embed = new EmbedBuilder()
    .setDescription(messageText)
    .setTimestamp();
  if (embedData?.title) embed.setTitle(embedData.title);
  if (embedData?.color) embed.setColor(embedData.color);
  if (embedData?.image) embed.setImage(embedData.image);
  if (embedData?.footer) embed.setFooter({ text: embedData.footer });
  return embed;
}

// Schedule a job (recurring or one‑time)
function scheduleJob(client, guildId, job) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(job.channelId);
  if (!channel) return;

  const task = async () => {
    if (!job.enabled) return;
    try {
      const embed = buildEmbed(job.embedData, job.messageText);
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`[Scheduler] Failed to send scheduled message in guild ${guildId}:`, error);
    }
  };

  let cronJob = null;
  let timeout = null;

  if (job.type === 'once') {
    const now = Date.now();
    const scheduledTime = new Date(job.scheduledTime).getTime();
    const delay = scheduledTime - now;
    if (delay > 0) {
      timeout = setTimeout(async () => {
        await task();
        // Remove from config after execution
        const config = guildConfig.get(guildId);
        if (config?.scheduledMessages) {
          config.scheduledMessages = config.scheduledMessages.filter(j => j.id !== job.id);
          guildConfig.set(guildId, 'scheduledMessages', config.scheduledMessages);
        }
        // Remove from active jobs
        const guildJobs = activeJobs.get(guildId);
        if (guildJobs) {
          guildJobs.delete(job.id);
          if (guildJobs.size === 0) activeJobs.delete(guildId);
        }
      }, delay);
    } else {
      // Already passed – skip
      return;
    }
  } else {
    // Recurring (daily/weekly) – use cron
    if (cron.validate(job.cron)) {
      cronJob = cron.schedule(job.cron, task, { timezone: 'UTC' });
    } else {
      console.error(`[Scheduler] Invalid cron for job ${job.id} in guild ${guildId}: ${job.cron}`);
      return;
    }
  }

  // Store the job reference
  if (!activeJobs.has(guildId)) activeJobs.set(guildId, new Map());
  activeJobs.get(guildId).set(job.id, { cronJob, timeout, type: job.type });
}

// Cancel a job
function cancelJob(guildId, jobId) {
  const guildJobs = activeJobs.get(guildId);
  if (!guildJobs) return false;
  const job = guildJobs.get(jobId);
  if (!job) return false;
  if (job.cronJob) job.cronJob.stop();
  if (job.timeout) clearTimeout(job.timeout);
  guildJobs.delete(jobId);
  if (guildJobs.size === 0) activeJobs.delete(guildId);
  return true;
}

// Load all schedules from all guilds on startup
function loadAllSchedules(client) {
  const allConfigs = guildConfig.getAll();
  let count = 0;
  for (const [guildId, config] of Object.entries(allConfigs)) {
    if (config.scheduledMessages && Array.isArray(config.scheduledMessages)) {
      for (const job of config.scheduledMessages) {
        if (job.enabled !== false) { // enabled by default
          scheduleJob(client, guildId, job);
          count++;
        }
      }
    }
  }
  console.log(`[Scheduler] Loaded ${count} scheduled messages.`);
}

// Add a new job (called from command)
function addJob(client, guildId, jobData) {
  const config = guildConfig.get(guildId) || {};
  if (!config.scheduledMessages) config.scheduledMessages = [];
  config.scheduledMessages.push(jobData);
  guildConfig.set(guildId, 'scheduledMessages', config.scheduledMessages);
  if (jobData.enabled !== false) {
    scheduleJob(client, guildId, jobData);
  }
}

// Remove a job
function removeJob(client, guildId, jobId) {
  cancelJob(guildId, jobId);
  const config = guildConfig.get(guildId);
  if (config?.scheduledMessages) {
    config.scheduledMessages = config.scheduledMessages.filter(j => j.id !== jobId);
    guildConfig.set(guildId, 'scheduledMessages', config.scheduledMessages);
  }
}

// Toggle enable/disable
function toggleJob(client, guildId, jobId, enabled) {
  cancelJob(guildId, jobId); // stop existing
  const config = guildConfig.get(guildId);
  if (config?.scheduledMessages) {
    const job = config.scheduledMessages.find(j => j.id === jobId);
    if (job) {
      job.enabled = enabled;
      guildConfig.set(guildId, 'scheduledMessages', config.scheduledMessages);
      if (enabled) {
        scheduleJob(client, guildId, job);
      }
    }
  }
}

module.exports = {
  loadAllSchedules,
  addJob,
  removeJob,
  toggleJob,
  cancelJob,
};