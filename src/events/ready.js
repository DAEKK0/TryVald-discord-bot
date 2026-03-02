const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady, // or 'ready' if you haven't updated to v14 naming
  once: true,
  execute(client) {
    const commandCount = client.commands.size;
    // Get all event names from the client's event names (excluding internal ones)
    const eventNames = client.eventNames();
    // Count only our own events (you can't easily separate, but this is a rough estimate)
    // Alternatively, you can count the number of files in the events folder.
    const fs = require('node:fs');
    const path = require('node:path');
    const eventsPath = path.join(__dirname, '../events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    const eventCount = eventFiles.length;

    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Loaded ${commandCount} commands and ${eventCount} event handlers.`);
  },
};