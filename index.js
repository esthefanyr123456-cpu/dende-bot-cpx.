
'use strict';

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits: P,
  MessageFlags,
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

const express = require('express');
const app = express();
const PORT = Number(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

app.get('/', (_req, res) => res.json({
  projeto: 'DENDÊ | PROJETO CPX',
  discord: client.isReady() ? 'online' : 'offline',
  bot: client.user?.tag || null
}));

app.get('/health', (_req, res) =>
  res.status(client.isReady() ? 200 : 503).json({
    discord: client.isReady() ? 'online' : 'offline'
  })
);

app.listen(PORT, '0.0.0.0', () => {
  console.log('[HTTP] Porta', PORT);
});

const roles = [
  ['👑 Dono', 0xffd700],
  ['🔥 Líder', 0xff3333],
  ['💎 Sub-Líder', 0xaa55ff],
  ['🛡️ Gerente', 0x3399ff],
  ['📋 Recrutador', 0x00aaaa],
  ['💎 Elite Dendê', 0x00cc66],
  ['🌿 Membro', 0x33aa33],
  ['🟢 Recruta', 0xaaaaaa]
];

const leadership = [
  '👑 Dono',
  '🔥 Líder',
  '💎 Sub-Líder',
  '🛡️ Gerente',
  '📋 Recrutador'
];

const adminRoles = leadership.slice(0, 4);

const sections = [
  {
    name: '📢 INFORMAÇÕES',
    channels: [
      '📜・regras',
      '📢・avisos',
      '👋・boas-vindas',
      '📋・hierarquia',
      '📅・reuniões'
    ]
  },
  {
    name: '🌿 ÁREA DA FACÇÃO',
    channels: [
      '💬・chat-geral',
      '📸・prints',
      '🎮・clipes',
      '📍・localizações',
      '🔊・resenha',
      '🎙️・rádio-01',
      '🎙️・rádio-02'
    ]
  },
  {
    name: '👥 RECRUTAMENTO',
    channels: [
      '📝・recrutamento',
      '🎫・abrir-ticket',
      '✅・aprovados',
      '❌・reprovados'
    ]
  },
  {
    name: '👑 LIDERANÇA',
    private: leadership,
    channels: [
      '👑・chat-liderança',
      '📊・relatórios',
      '📋・controle-membros',
      '🔊・reunião-liderança'
    ]
  },
  {
    name: '🛡️ ADMINISTRAÇÃO',
    private: adminRoles,
    channels: [
      '🤖・comandos-bot',
      '📁・logs-gerais',
      '📈・logs-cargos',
      '🚪・entradas-saídas',
      '⚠️・advertências'
    ]
  },
  {
    name: '📦 CONTROLE DE BAÚ',
    private: leadership,
    channels: [
      '📦・controle-bau',
      '📥・depositos-bau',
      '📤・retiradas-bau',
      '📊・estoque-bau'
    ]
  },
  {
    name: '💎 ELITE DENDÊ',
    private: [...leadership, '💎 Elite Dendê'],
    channels: [
      '💎・chat-elite',
      '📢・avisos-elite',
      '🔊・call-elite'
    ]
  }
];

const voiceNames = new Set([
  '🔊・resenha',
  '🎙️・rádio-01',
  '🎙️・rádio-02',
  '🔊・reunião-liderança',
  '🔊・call-elite'
]);

function overwrites(guild, allowed, botId) {
  const entries = [
    {
      id: guild.id,
      deny: [P.ViewChannel]
    },
    {
      id: botId,
      allow: [
        P.ViewChannel,
        P.SendMessages,
        P.ReadMessageHistory,
        P.ManageChannels
      ]
    }
  ];

  for (const name of allowed) {
    const role = guild.roles.cache.find(
      r => r.name === name
    );

    if (!role) {
      throw new Error(
        `Cargo obrigatório ausente: ${name}`
      );
    }

    entries.push({
      id: role.id,
      allow: [P.ViewChannel]
    });
  }

  return entries;
}

function hasPrivacy(channel, guild, allowed) {
  const everyone =
    channel.permissionOverwrites.cache.get(guild.id);

  if (!everyone?.deny.has(P.ViewChannel)) {
    return false;
  }

  return allowed.every(name => {
    const role = guild.roles.cache.find(
      r => r.name === name
    );

    return role &&
      channel.permissionOverwrites.cache
        .get(role.id)?.allow.has(P.ViewChannel);
  });
}

async function install(guild) {
  const warnings = [];
  let created = 0;

  await guild.roles.fetch();
  await guild.channels.fetch();

  const me = await guild.members.fetchMe();

  if (!me.permissions.has(P.ManageRoles)) {
    throw new Error(
      'Bot sem permissão Gerenciar Cargos'
    );
  }

  if (!me.permissions.has(P.ManageChannels)) {
    throw new Error(
      'Bot sem permissão Gerenciar Canais'
    );
  }

  for (const [name, color] of roles) {
    if (guild.roles.cache.some(r => r.name === name)) {
      continue;
    }

    try {
      await guild.roles.create({
        name,
        color,
        reason: 'Instalação DENDÊ CPX'
      });
      created++;
    } catch (err) {
      warnings.push(
        `Cargo ${name}: ${err.message}`
      );
    }
  }

  await guild.roles.fetch();

  for (const section of sections) {
    let category = guild.channels.cache.find(
      c => c.name === section.name &&
        c.type === ChannelType.GuildCategory
    );

    let perms;

    try {
      if (section.private) {
        perms = overwrites(
          guild,
          section.private,
          me.id
        );
      }
    } catch (err) {
      warnings.push(
        `${section.name}: ${err.message}`
      );
      continue;
    }

    try {
      if (!category) {
        category = await guild.channels.create({
          name: section.name,
          type: ChannelType.GuildCategory,
          ...(perms
            ? { permissionOverwrites: perms }
            : {})
        });

        created++;
      } else if (perms) {
        await category.permissionOverwrites.set(
          perms,
          'Privacidade DENDÊ'
        );
      }

      if (perms) {
        await category.fetch();

        if (!hasPrivacy(
          category,
          guild,
          section.private
        )) {
          warnings.push(
            `Privacidade não confirmada em ${section.name}`
          );
          continue;
        }
      }
    } catch (err) {
      warnings.push(
        `Categoria ${section.name}: ${err.message}`
      );
      continue;
    }

    for (const name of section.channels) {
      try {
        let channel = guild.channels.cache.find(
          c => c.name === name &&
            c.parentId === category.id
        );

        if (!channel) {
          channel = await guild.channels.create({
            name,
            type: voiceNames.has(name)
              ? ChannelType.GuildVoice
              : ChannelType.GuildText,
            parent: category.id,
            ...(perms
              ? { permissionOverwrites: perms }
              : {})
          });

          created++;
        } else if (perms) {
          await channel.permissionOverwrites.set(
            perms,
            'Privacidade DENDÊ'
          );
        }

        if (perms) {
          await channel.fetch();

          if (!hasPrivacy(
            channel,
            guild,
            section.private
          )) {
            warnings.push(
              `Revisar privacidade: ${name}`
            );
          }
        }
      } catch (err) {
        warnings.push(
          `Canal ${name}: ${err.message}`
        );
      }
    }
  }

  return { created, warnings };
}

const commands = [
  new SlashCommandBuilder()
    .setName('instalardende')
    .setDescription('Instala cargos e canais DENDÊ')
    .setDefaultMemberPermissions(P.ManageGuild),

  new SlashCommandBuilder()
    .setName('statusdende')
    .setDescription('Confere se o bot está online'),

  new SlashCommandBuilder()
    .setName('registrarsaida')
    .setDescription('Registra saída de membro')
    .setDefaultMemberPermissions(P.ManageRoles)
    .addUserOption(o =>
      o.setName('membro')
        .setDescription('Integrante')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('motivo')
        .setDescription('Motivo')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('registrarretirada')
    .setDescription('Registra retirada manual do baú')
    .setDefaultMemberPermissions(P.ManageRoles)
    .addStringOption(o =>
      o.setName('item')
        .setDescription('Item')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('quantidade')
        .setDescription('Quantidade')
        .setMinValue(1)
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName('membro')
        .setDescription('Quem retirou')
        .setRequired(true)
    )
];

client.once('clientReady', async () => {
  console.log('[DISCORD ONLINE]', client.user.tag);

  try {
    await client.application.commands.set(
      commands.map(c => c.toJSON())
    );

    console.log('[COMANDOS] Registrados');
  } catch (err) {
    console.error(
      '[ERRO COMANDOS]',
      err.message
    );
  }
});

client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.find(
    c => c.name === '👋・boas-vindas' &&
      c.isTextBased()
  );

  if (!channel) return;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00cc66)
        .setTitle('🌿 BEM-VINDO AO DENDÊ!')
        .setDescription(
          `${member}, bem-vindo ao **DENDÊ | PROJETO CPX**!`
        )
        .setTimestamp()
    ]
  }).catch(err => {
    console.error(
      '[BOAS-VINDAS]',
      err.message
    );
  });
});

client.on('guildMemberRemove', async member => {
  const channel = member.guild.channels.cache.find(
    c => c.name === '🚪・entradas-saídas' &&
      c.isTextBased()
  );

  if (channel) {
    await channel.send(
      `🚪 **SAÍDA**\n` +
      `Membro: ${member.user.tag}\n` +
      `ID: ${member.id}`
    ).catch(err => {
      console.error(
        '[SAÍDA]',
        err.message
      );
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.inGuild()) return;

  try {
    if (interaction.commandName === 'statusdende') {
      return interaction.reply({
        content: '🌿 DENDÊ BOT ONLINE!',
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.commandName === 'instalardende') {
      if (!interaction.memberPermissions?.has(
        P.ManageGuild
      )) {
        throw new Error(
          'Você precisa da permissão Gerenciar Servidor'
        );
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      const result = await install(
        interaction.guild
      );

      const output =
        `🌿 **Instalação DENDÊ**\n` +
        `Criados: ${result.created}\n` +
        `Avisos: ${result.warnings.length}\n` +
        (result.warnings.slice(0, 12)
          .map(w => `• ${w}`)
          .join('\n') || 'Sem avisos.');

      return interaction.editReply(
        output.slice(0, 1900)
      );
    }

    if (!interaction.memberPermissions?.has(
      P.ManageRoles
    )) {
      throw new Error(
        'Você precisa da permissão Gerenciar Cargos'
      );
    }

    if (interaction.commandName === 'registrarsaida') {
      const user = interaction.options.getUser(
        'membro',
        true
      );

      const reason = interaction.options.getString(
        'motivo',
        true
      );

      const channel =
        interaction.guild.channels.cache.find(
          c => c.name === '🚪・entradas-saídas' &&
            c.isTextBased()
        );

      if (!channel) {
        throw new Error(
          'Canal de saídas não encontrado'
        );
      }

      await channel.send({
        content:
          `🚪 **SAÍDA REGISTRADA**\n` +
          `Membro: ${user.username} (${user.id})\n` +
          `Motivo: ${reason}\n` +
          `Responsável: ${interaction.user.username}`,
        allowedMentions: { parse: [] }
      });

      return interaction.reply({
        content: '✅ Saída registrada.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.commandName === 'registrarretirada') {
      const item = interaction.options.getString(
        'item',
        true
      );

      const qty = interaction.options.getInteger(
        'quantidade',
        true
      );

      const user = interaction.options.getUser(
        'membro',
        true
      );

      const channel =
        interaction.guild.channels.cache.find(
          c => c.name === '📤・retiradas-bau' &&
            c.isTextBased()
        );

      if (!channel) {
        throw new Error(
          'Canal de retiradas não encontrado'
        );
      }

      await channel.send({
        content:
          `📤 **RETIRADA DO BAÚ**\n` +
          `Item: ${item}\n` +
          `Quantidade: ${qty}\n` +
          `Membro: ${user.username} (${user.id})\n` +
          `Responsável: ${interaction.user.username}`,
        allowedMentions: { parse: [] }
      });

      return interaction.reply({
        content: '✅ Retirada registrada.',
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (err) {
    console.error('[ERRO COMANDO]', err);

    const msg = `❌ ${err.message}`.slice(0, 1900);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg)
        .catch(() => {});
    } else {
      await interaction.reply({
        content: msg,
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
});

client.on('error', err => {
  console.error('[CLIENT ERROR]', err.message);
});

client.on('shardError', err => {
  console.error('[SHARD ERROR]', err.message);
});

client.on('shardDisconnect', event => {
  console.error(
    '[SHARD DISCONNECT]',
    event.code,
    event.reason
  );
});

client.on('shardResume', id => {
  console.log('[SHARD RESUME]', id);
});

client.on('debug', msg => {
  if (/token|authorization|authenticat|session|identify|heartbeat.*payload/i.test(msg)) {
    return;
  }

  console.log(
    '[GATEWAY DEBUG]',
    msg.slice(0, 400)
  );
});

process.on('unhandledRejection', err => {
  console.error(
    '[UNHANDLED]',
    err?.message || String(err)
  );
});

async function testGateway() {
  try {
    const response = await fetch(
      'https://discord.com/api/v10/gateway',
      {
        signal: AbortSignal.timeout(10000)
      }
    );

    console.log(
      '[DISCORD HTTP TEST]',
      response.status
    );

    if (response.ok) {
      const data = await response.json();

      console.log(
        '[DISCORD GATEWAY URL]',
        new URL(data.url).hostname
      );
    }
  } catch (err) {
    console.error(
      '[DISCORD NETWORK ERROR]',
      err.message,
      err.cause?.code || ''
    );
  }
}

async function start() {
  if (!process.env.DISCORD_TOKEN?.trim()) {
    console.error(
      '[CONFIG] DISCORD_TOKEN ausente'
    );
    return;
  }

  console.log(
    '[START] Testando API e conectando ao Discord...'
  );

  void testGateway();

  const timeout = setTimeout(() => {
    if (!client.isReady()) {
      console.error(
        '[TIMEOUT] Discord não ficou online após 45 segundos.'
      );
    }
  }, 45000);

  timeout.unref();

  try {
    await client.login(
      process.env.DISCORD_TOKEN.trim()
    );

    console.log(
      '[LOGIN] Gateway autenticado'
    );
  } catch (err) {
    console.error(
      '[LOGIN ERROR]',
      err.message,
      err.code || ''
    );
  }
}

void start();
                       
