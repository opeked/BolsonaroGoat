const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const categories = fs.readdirSync(commandsPath);

for (const category of categories) {
  const categoryPath = path.join(commandsPath, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(categoryPath, file));
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`Registrando: /${command.data.name}`);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\n🚀 Registrando ${commands.length} slash commands...`);

    if (process.env.GUILD_ID) {
      // Deploy rápido no servidor de teste
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Comandos registrados no servidor ${process.env.GUILD_ID}`);
    } else {
      // Deploy global (pode demorar até 1h)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Comandos registrados globalmente');
    }
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
})();
