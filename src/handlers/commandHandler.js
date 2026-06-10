const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

function loadCommands(client) {
  client.commands = new Collection();
  client.commandArray = [];

  const commandsPath = path.join(__dirname, '..', 'commands');
  if (!fs.existsSync(commandsPath)) return;

  const categories = fs.readdirSync(commandsPath).filter(f => fs.statSync(path.join(commandsPath, f)).isDirectory());
  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(categoryPath, file));
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
          client.commandArray.push(command.data.toJSON());
          console.log(`  [CMD] ${command.data.name} (${category})`);
        }
      } catch (err) {
        console.error(`  [CMD ERR] Failed to load ${file}:`, err.message);
      }
    }
  }
}

module.exports = { loadCommands };
