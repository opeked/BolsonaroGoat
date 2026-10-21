const { Client, GatewayIntentBits, Collection, Partials, ActivityType, MessageFlags } = require('discord.js');
const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
const config = require('./config/config');
const v2 = require('./utils/v2');
const fs = require('fs');
const path = require('path');

// ==================== CLIENT ====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

client.commands = new Collection();
client.config = config;

// ==================== DISTUBE (MÚSICA 24/7) ====================
client.distube = new DisTube(client, {
  leaveOnEmpty: false,
  leaveOnFinish: false,
  leaveOnStop: false,
  emptyCooldown: 0,
  emitNewSongOnly: true,
  nsfw: true,
  plugins: [new YouTubePlugin()],
});

// ==================== CARREGAR HANDLERS ====================
const handlersPath = path.join(__dirname, 'handlers');
const handlerFiles = fs.readdirSync(handlersPath).filter((file) => file.endsWith('.js'));

for (const file of handlerFiles) {
  require(path.join(handlersPath, file))(client);
}

// ==================== EVENTOS DISTUBE (Components V2) ====================
client.distube
  .on('playSong', (queue, song) => {
    const card = v2.container(config.colors.music)
      .addSectionComponents(
        new v2.SectionBuilder()
          .addTextDisplayComponents(
            v2.text('# 🎵 Tocando agora'),
            v2.text(
              `**[${song.name}](${song.url})**\n` +
              `⏱ ${song.formattedDuration} · 👤 ${song.user}\n` +
              `📢 ${queue.voiceChannel}`
            )
          )
          .setThumbnailAccessory(
            new v2.ThumbnailBuilder()
              .setURL(song.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png')
              .setDescription(song.name)
          )
      )
      .addSeparatorComponents(v2.separator())
      .addTextDisplayComponents(v2.text('-# Bolsonaro Goat • Música 24/7'));

    queue.textChannel
      ?.send({ components: [card], flags: MessageFlags.IsComponentsV2 })
      .catch(() => {});
  })
  .on('addSong', (queue, song) => {
    const card = v2.container(config.colors.music).addTextDisplayComponents(
      v2.text(
        `✅ **[${song.name}](${song.url})** adicionada à fila\n` +
        `⏱ ${song.formattedDuration} · Pedido por ${song.user}`
      )
    );
    queue.textChannel
      ?.send({ components: [card], flags: MessageFlags.IsComponentsV2 })
      .catch(() => {});
  })
  .on('addList', (queue, playlist) => {
    const card = v2.container(config.colors.music).addTextDisplayComponents(
      v2.text(`✅ Playlist **${playlist.name}** adicionada (${playlist.songs.length} músicas)`)
    );
    queue.textChannel
      ?.send({ components: [card], flags: MessageFlags.IsComponentsV2 })
      .catch(() => {});
  })
  .on('error', (error, queue) => {
    console.error('[DisTube Error]', error);
    const channel = queue?.textChannel;
    if (channel) {
      const card = v2.error(`Erro: \`${(error.message || String(error)).slice(0, 100)}\``);
      channel.send({ components: [card], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
  })
  .on('finish', (queue) => {
    const card = v2.container(config.colors.music).addTextDisplayComponents(
      v2.text('📭 Fila terminou. Continuo na call esperando novas músicas.')
    );
    queue.textChannel
      ?.send({ components: [card], flags: MessageFlags.IsComponentsV2 })
      .catch(() => {});
  })
  .on('disconnect', (queue) => {
    const card = v2.warning('🔌 Desconectado do canal de voz.');
    queue.textChannel
      ?.send({ components: [card], flags: MessageFlags.IsComponentsV2 })
      .catch(() => {});
  })
  .on('empty', (queue) => {
    const card = v2.warning('🔇 Canal vazio, mas continuo aqui (modo 24/7).');
    queue.textChannel
      ?.send({ components: [card], flags: MessageFlags.IsComponentsV2 })
      .catch(() => {});
  });

// ==================== READY ====================
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} online!`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  console.log(`🔧 Components V2 ativo`);
  client.user.setActivity('Bolsonaro Goat | /help', { type: ActivityType.Listening });
});

// ==================== LOGIN ====================
client.login(config.token).catch((err) => {
  console.error('❌ Falha ao logar. Verifique o DISCORD_TOKEN no .env');
  console.error(err);
  process.exit(1);
});

module.exports = client;
