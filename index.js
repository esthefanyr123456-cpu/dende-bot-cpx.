
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");

const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("DENDÊ BOT | PROJETO CPX ONLINE");
});

app.listen(process.env.PORT || 3000, "0.0.0.0");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const cargos = [
  { name: "👑 Dono", color: 0xffd700 },
  { name: "🔥 Líder", color: 0xff3333 },
  { name: "💎 Sub-Líder", color: 0xaa55ff },
  { name: "🛡️ Gerente", color: 0x3399ff },
  { name: "📋 Recrutador", color: 0x00aaaa },
  { name: "💎 Elite Dendê", color: 0x00cc66 },
  { name: "🌿 Membro", color: 0x33aa33 },
  { name: "🟢 Recruta", color: 0xaaaaaa }
];

const categorias = {
  "📢 INFORMAÇÕES": [
    "📜・regras",
    "📢・avisos",
    "👋・boas-vindas",
    "📋・hierarquia",
    "📅・reuniões"
  ],
  "🌿 ÁREA DA FACÇÃO": [
    "💬・chat-geral",
    "📸・prints",
    "🎮・clipes",
    "📍・localizações",
    "🔊・resenha",
    "🎙️・rádio-01",
    "🎙️・rádio-02"
  ],
  "👥 RECRUTAMENTO": [
    "📝・recrutamento",
    "🎫・abrir-ticket",
    "✅・aprovados",
    "❌・reprovados"
  ],
  "👑 LIDERANÇA": [
    "👑・chat-liderança",
    "📊・relatórios",
    "📋・controle-membros",
    "🔊・reunião-liderança"
  ],
  "🛡️ ADMINISTRAÇÃO": [
    "🤖・comandos-bot",
    "📁・logs-gerais",
    "📈・logs-cargos",
    "🚪・entradas-saídas",
    "⚠️・advertências"
  ],
  "📦 CONTROLE DE BAÚ": [
    "📦・controle-bau",
    "📥・depositos-bau",
    "📤・retiradas-bau",
    "📊・estoque-bau"
  ],
  "💎 ELITE DENDÊ": [
    "💎・chat-elite",
    "📢・avisos-elite",
    "🔊・call-elite"
  ]
};

const voz = new Set([
  "🔊・resenha",
  "🎙️・rádio-01",
  "🎙️・rádio-02",
  "🔊・reunião-liderança",
  "🔊・call-elite"
]);

const nomesLideranca = [
  "👑 Dono",
  "🔥 Líder",
  "💎 Sub-Líder",
  "🛡️ Gerente",
  "📋 Recrutador"
];

const nomesAdministracao = [
  "👑 Dono",
  "🔥 Líder",
  "💎 Sub-Líder",
  "🛡️ Gerente"
];

function permissoesPrivadas(guild, nomes) {
  const regras = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    }
  ];

  for (const nome of nomes) {
    const cargo = guild.roles.cache.find(
      r => r.name === nome
    );

    if (cargo) {
      regras.push({
        id: cargo.id,
        allow: [PermissionFlagsBits.ViewChannel]
      });
    }
  }

  return regras;
}

async function instalar(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  for (const dados of cargos) {
    let cargo = guild.roles.cache.find(
      r => r.name === dados.name
    );

    if (!cargo) {
      await guild.roles.create({
        name: dados.name,
        color: dados.color,
        reason: "Instalação DENDÊ BOT"
      });
    }
  }

  await guild.roles.fetch();

  for (const [nome, canais] of Object.entries(categorias)) {
    let categoria = guild.channels.cache.find(
      c =>
        c.name === nome &&
        c.type === ChannelType.GuildCategory
    );

    let nomesPermitidos = null;

    if (nome === "💎 ELITE DENDÊ") {
      nomesPermitidos = [
        ...nomesLideranca,
        "💎 Elite Dendê"
      ];
    }

    if (nome === "👑 LIDERANÇA") {
      nomesPermitidos = nomesLideranca;
    }

    if (nome === "🛡️ ADMINISTRAÇÃO") {
      nomesPermitidos = nomesAdministracao;
    }

    if (nome === "📦 CONTROLE DE BAÚ") {
      nomesPermitidos = nomesLideranca;
    }

    const regras = nomesPermitidos
      ? permissoesPrivadas(guild, nomesPermitidos)
      : null;

    if (!categoria) {
      categoria = await guild.channels.create({
        name: nome,
        type: ChannelType.GuildCategory,
        ...(regras
          ? { permissionOverwrites: regras }
          : {})
      });
    } else if (regras) {
      await categoria.permissionOverwrites.set(regras);
    }

    for (const nomeCanal of canais) {
      const tipo = voz.has(nomeCanal)
        ? ChannelType.GuildVoice
        : ChannelType.GuildText;

      let canal = guild.channels.cache.find(
        c =>
          c.name === nomeCanal &&
          c.parentId === categoria.id
      );

      if (!canal) {
        canal = await guild.channels.create({
          name: nomeCanal,
          type: tipo,
          parent: categoria.id
        });
      }

      if (regras) {
        await canal.lockPermissions();
      }
    }
  }
}

client.once("ready", async () => {
  console.log(`DENDÊ BOT ONLINE: ${client.user.tag}`);

  const comando = new SlashCommandBuilder()
    .setName("instalardende")
    .setDescription(
      "Instala ou atualiza a estrutura do Dendê"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    );

  try {
    await client.application.commands.set([
      comando.toJSON()
    ]);

    console.log("Comando registrado.");
  } catch (erro) {
    console.error("Erro ao registrar comando:", erro);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== "instalardende") {
    return;
  }

  if (!interaction.inGuild()) return;

  if (!interaction.memberPermissions.has(
    PermissionFlagsBits.ManageGuild
  )) {
    return interaction.reply({
      content: "Você não tem permissão.",
      ephemeral: true
    });
  }

  await interaction.deferReply({
    ephemeral: true
  });

  try {
    await instalar(interaction.guild);

    await interaction.editReply(
      "✅ DENDÊ | PROJETO CPX atualizado!\n" +
      "💎 Elite Dendê criada.\n" +
      "📦 Canais de baú adicionados.\n" +
      "👑 Áreas privadas configuradas."
    );
  } catch (erro) {
    console.error("Erro na instalação:", erro);

    await interaction.editReply(
      "❌ Erro ao instalar. Confira as permissões " +
      "e a posição do cargo do bot."
    );
  }
});

if (!process.env.DISCORD_TOKEN) {
  throw new Error(
    "Configure DISCORD_TOKEN no Render."
  );
}

client.login(process.env.DISCORD_TOKEN);
