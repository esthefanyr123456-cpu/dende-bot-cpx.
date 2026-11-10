
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits: P,
  MessageFlags,
  SlashCommandBuilder,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

app.get("/", (req, res) => {
  res.json({
    projeto: "DENDÊ | PROJETO CPX",
    discord: client.isReady() ? "online" : "offline"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("HTTP funcionando na porta", PORT);
});

const cargos = [
  ["👑 Dono", 0xffd700],
  ["🔥 Líder", 0xff3333],
  ["💎 Sub-Líder", 0xaa55ff],
  ["🛡️ Gerente", 0x3399ff],
  ["📋 Recrutador", 0x00aaaa],
  ["💎 Elite Dendê", 0x00cc66],
  ["🌿 Membro", 0x33aa33],
  ["🟢 Recruta", 0xaaaaaa]
];

const lideranca = [
  "👑 Dono",
  "🔥 Líder",
  "💎 Sub-Líder",
  "🛡️ Gerente",
  "📋 Recrutador"
];

const administracao = lideranca.slice(0, 4);

const estrutura = [
  {
    nome: "📢 INFORMAÇÕES",
    canais: [
      "📜・regras",
      "📢・avisos",
      "👋・boas-vindas",
      "📋・hierarquia",
      "📅・reuniões"
    ]
  },
  {
    nome: "🌿 ÁREA DA FACÇÃO",
    canais: [
      "💬・chat-geral",
      "📸・prints",
      "🎮・clipes",
      "📍・localizações",
      "🔊・resenha",
      "🎙️・rádio-01",
      "🎙️・rádio-02"
    ]
  },
  {
    nome: "👥 RECRUTAMENTO",
    canais: [
      "📝・recrutamento",
      "🎫・abrir-ticket",
      "✅・aprovados",
      "❌・reprovados"
    ]
  },
  {
    nome: "👑 LIDERANÇA",
    privado: lideranca,
    canais: [
      "👑・chat-liderança",
      "📊・relatórios",
      "📋・controle-membros",
      "🔊・reunião-liderança"
    ]
  },
  {
    nome: "🛡️ ADMINISTRAÇÃO",
    privado: administracao,
    canais: [
      "🤖・comandos-bot",
      "📁・logs-gerais",
      "📈・logs-cargos",
      "🚪・entradas-saídas",
      "⚠️・advertências"
    ]
  },
  {
    nome: "📦 CONTROLE DE BAÚ",
    privado: lideranca,
    canais: [
      "📦・controle-bau",
      "📥・depositos-bau",
      "📤・retiradas-bau",
      "📊・estoque-bau"
    ]
  },
  {
    nome: "💎 ELITE DENDÊ",
    privado: [...lideranca, "💎 Elite Dendê"],
    canais: [
      "💎・chat-elite",
      "📢・avisos-elite",
      "🔊・call-elite"
    ]
  }
];

const canaisVoz = new Set([
  "🔊・resenha",
  "🎙️・rádio-01",
  "🎙️・rádio-02",
  "🔊・reunião-liderança",
  "🔊・call-elite"
]);

function erroLog(etapa, erro, avisos) {
  const texto = `${etapa}: ${erro.message}`;
  console.error("[DENDÊ ERRO]", texto);
  avisos.push(texto);
}

function regrasPrivadas(guild, nomes, botId) {
  const regras = [
    {
      id: guild.roles.everyone.id,
      deny: [P.ViewChannel]
    },
    {
      id: botId,
      allow: [
        P.ViewChannel,
        P.ManageChannels,
        P.SendMessages,
        P.ReadMessageHistory
      ]
    }
  ];

  for (const nome of nomes) {
    const cargo = guild.roles.cache.find(
      r => r.name === nome
    );

    if (cargo) {
      regras.push({
        id: cargo.id,
        allow: [P.ViewChannel]
      });
    }
  }

  return regras;
}

function canalSeguro(canal, guild, nomes) {
  const todos = canal.permissionOverwrites.cache.get(
    guild.roles.everyone.id
  );

  if (!todos || !todos.deny.has(P.ViewChannel)) {
    return false;
  }

  for (const nome of nomes) {
    const cargo = guild.roles.cache.find(
      r => r.name === nome
    );

    if (!cargo) return false;

    const regra = canal.permissionOverwrites.cache.get(
      cargo.id
    );

    if (!regra || !regra.allow.has(P.ViewChannel)) {
      return false;
    }
  }

  return true;
}

async function instalar(guild) {
  const avisos = [];
  let criados = 0;

  await guild.roles.fetch();
  await guild.channels.fetch();

  const bot = await guild.members.fetchMe();

  if (!bot.permissions.has(P.ManageRoles)) {
    throw new Error("Falta Gerenciar Cargos");
  }

  if (!bot.permissions.has(P.ManageChannels)) {
    throw new Error("Falta Gerenciar Canais");
  }

  console.log(
    "[DENDÊ] Cargo do bot:",
    bot.roles.highest.name
  );

  for (const [nome, cor] of cargos) {
    try {
      const existente = guild.roles.cache.find(
        r => r.name === nome
      );

      if (!existente) {
        await guild.roles.create({
          name: nome,
          color: cor,
          reason: "Instalação DENDÊ"
        });

        criados++;
      }
    } catch (erro) {
      erroLog("Criar cargo " + nome, erro, avisos);
    }
  }

  await guild.roles.fetch();

  for (const grupo of estrutura) {
    let categoria = guild.channels.cache.find(
      c => c.name === grupo.nome &&
      c.type === ChannelType.GuildCategory
    );

    const regras = grupo.privado
      ? regrasPrivadas(guild, grupo.privado, bot.id)
      : null;

    let segura = !grupo.privado;

    try {
      if (!categoria) {
        categoria = await guild.channels.create({
          name: grupo.nome,
          type: ChannelType.GuildCategory,
          ...(regras
            ? { permissionOverwrites: regras }
            : {})
        });

        criados++;
      } else if (regras) {
        await categoria.permissionOverwrites.set(
          regras,
          "Proteção de categoria DENDÊ"
        );
      }

      if (regras) {
        await categoria.fetch();

        segura = canalSeguro(
          categoria,
          guild,
          grupo.privado
        );
      }
    } catch (erro) {
      erroLog(
        "Categoria " + grupo.nome,
        erro,
        avisos
      );
    }

    if (!categoria) continue;

    if (grupo.privado && !segura) {
      avisos.push(
        "Categoria privada não confirmada: " +
        grupo.nome
      );

      console.warn(
        "[DENDÊ] Pulando canais privados:",
        grupo.nome
      );

      continue;
    }

    for (const nome of grupo.canais) {
      try {
        let canal = guild.channels.cache.find(
          c => c.name === nome &&
          c.parentId === categoria.id
        );

        if (!canal) {
          canal = await guild.channels.create({
            name: nome,
            type: canaisVoz.has(nome)
              ? ChannelType.GuildVoice
              : ChannelType.GuildText,
            parent: categoria.id,
            ...(regras
              ? { permissionOverwrites: regras }
              : {})
          });

          criados++;
        } else if (regras) {
          try {
            await canal.lockPermissions();
          } catch (erro) {
            erroLog(
              "Sincronizar " + nome,
              erro,
              avisos
            );
          }
        }

        if (regras) {
          await canal.fetch();

          if (!canalSeguro(
            canal,
            guild,
            grupo.privado
          )) {
            avisos.push(
              "Revisar privacidade: " + nome
            );
          }
        }
      } catch (erro) {
        erroLog(
          "Canal " + nome,
          erro,
          avisos
        );
      }
    }
  }

  return { criados, avisos };
}

const comandos = [
  new SlashCommandBuilder()
    .setName("instalardende")
    .setDescription("Instala o servidor Dendê")
    .setDefaultMemberPermissions(P.ManageGuild),

  new SlashCommandBuilder()
    .setName("statusdende")
    .setDescription("Verifica o DENDÊ BOT"),

  new SlashCommandBuilder()
    .setName("registrarsaida")
    .setDescription("Registra saída de integrante")
    .setDefaultMemberPermissions(P.ManageRoles)
    .addUserOption(o =>
      o.setName("membro")
        .setDescription("Integrante")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("motivo")
        .setDescription("Motivo")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("registrarretirada")
    .setDescription("Registra retirada do baú")
    .setDefaultMemberPermissions(P.ManageRoles)
    .addStringOption(o =>
      o.setName("item")
        .setDescription("Item")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("quantidade")
        .setDescription("Quantidade")
        .setMinValue(1)
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("membro")
        .setDescription("Quem retirou")
        .setRequired(true)
    )
];

client.once("clientReady", async () => {
  console.log(
    "DENDÊ BOT ONLINE:",
    client.user.tag
  );

  try {
    await client.application.commands.set(
      comandos.map(c => c.toJSON())
    );

    console.log("Comandos registrados.");
  } catch (erro) {
    console.error("Erro nos comandos:", erro);
  }
});

client.on("guildMemberAdd", async member => {
  try {
    const canal = member.guild.channels.cache.find(
      c => c.name === "👋・boas-vindas"
    );

    if (!canal || !canal.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x00cc66)
      .setTitle("🌿 BEM-VINDO AO DENDÊ!")
      .setDescription(
        `${member}, bem-vindo ao ` +
        "**DENDÊ | PROJETO CPX**!"
      )
      .setTimestamp();

    await canal.send({ embeds: [embed] });
  } catch (erro) {
    console.error("Erro boas-vindas:", erro);
  }
});

client.on("guildMemberRemove", async member => {
  try {
    const canal = member.guild.channels.cache.find(
      c => c.name === "🚪・entradas-saídas"
    );

    if (!canal || !canal.isTextBased()) return;

    await canal.send(
      `🚪 **SAÍDA DO SERVIDOR**\n` +
      `Membro: ${member.user.tag}\n` +
      `ID: ${member.id}`
    );
  } catch (erro) {
    console.error("Erro saída:", erro);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.inGuild()) return;

  try {
    if (interaction.commandName === "statusdende") {
      return interaction.reply({
        content: "🌿 DENDÊ BOT ONLINE!",
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.commandName === "instalardende") {
      if (!interaction.memberPermissions.has(
        P.ManageGuild
      )) {
        return interaction.reply({
          content: "❌ Sem permissão.",
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      const resultado = await instalar(
        interaction.guild
      );

      const resumo =
        `🌿 **DENDÊ | PROJETO CPX**\n` +
        `✅ Criados: ${resultado.criados}\n` +
        `⚠️ Avisos: ${resultado.avisos.length}\n\n` +
        (resultado.avisos.length
          ? resultado.avisos.slice(0, 6)
              .map(a => `• ${a}`).join("\n")
          : "Instalação sem erros detectados.");

      return interaction.editReply(
        resumo.slice(0, 1900)
      );
    }

    if (interaction.commandName === "registrarsaida") {
      if (!interaction.memberPermissions.has(
        P.ManageRoles
      )) {
        return interaction.reply({
          content: "❌ Sem permissão.",
          flags: MessageFlags.Ephemeral
        });
      }

      const membro = interaction.options.getUser(
        "membro"
      );

      const motivo = interaction.options.getString(
        "motivo"
      );

      const canal = interaction.guild.channels.cache.find(
        c => c.name === "🚪・entradas-saídas"
      );

      if (!canal || !canal.isTextBased()) {
        throw new Error(
          "Canal de saídas não encontrado"
        );
      }

      await canal.send({
        content:
          `🚪 **SAÍDA REGISTRADA**\n` +
          `Membro: ${membro}\n` +
          `Motivo: ${motivo}\n` +
          `Responsável: ${interaction.user}`,
        allowedMentions: { parse: [] }
      });

      return interaction.reply({
        content: "✅ Saída registrada.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      interaction.commandName === "registrarretirada"
    ) {
      if (!interaction.memberPermissions.has(
        P.ManageRoles
      )) {
        return interaction.reply({
          content: "❌ Sem permissão.",
          flags: MessageFlags.Ephemeral
        });
      }

      const item = interaction.options.getString(
        "item"
      );

      const quantidade =
        interaction.options.getInteger("quantidade");

      const membro = interaction.options.getUser(
        "membro"
      );

      const canal = interaction.guild.channels.cache.find(
        c => c.name === "📤・retiradas-bau"
      );

      if (!canal || !canal.isTextBased()) {
        throw new Error(
          "Canal de retiradas não encontrado"
        );
      }

      await canal.send({
        content:
          `📤 **RETIRADA DO BAÚ**\n` +
          `Item: ${item}\n` +
          `Quantidade: ${quantidade}\n` +
          `Membro: ${membro}\n` +
          `Registrado por: ${interaction.user}`,
        allowedMentions: { parse: [] }
      });

      return interaction.reply({
        content: "✅ Retirada registrada.",
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (erro) {
    console.error(
      "[DENDÊ] Erro no comando:",
      erro
    );

    const mensagem =
      "❌ Erro. Confira os logs do Render.";

    if (interaction.deferred || interaction.replied) {
      await interactin.editReply(mensagem)
        .catch(console.error);
    } else {
      await interaction.reply({
        content: mensagem,
        flags: MessageFlags.Ephemeral
      }).catch(console.error);
    }
  }
});

client.on("error", erro => {
  console.error("Erro Discord:", erro);
});

client.on("shardDisconnect", () => {
  console.log("Discord desconectado");
});

client.on("shardResume", () => {
  console.log("Discord reconectado");
});

process.on("unhandledRejection", erro => {
  console.error("Erro não tratado:", erro);
});

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN não configurado!");
  process.exit(1);
}

console.log("Conectando ao Discord...");

client.login(process.env.DISCORD_TOKEN)
  .catch(erro => {
    console.error("Falha no login:", erro);
    process.exit(1);
  });
      
