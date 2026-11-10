
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");

const express = require("express");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const app = express();
app.get("/", (req, res) => {
  res.send("DENDÊ BOT | PROJETO CPX ONLINE");
});

app.listen(process.env.PORT || 3000, "0.0.0.0");

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
    "📍・localizações"
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
    "📋・controle-membros"
  ],
  "🛡️ ADMINISTRAÇÃO": [
    "🤖・comandos-bot",
    "📁・logs-gerais",
    "📈・logs-cargos",
    "⚠️・advertências"
  ]
};

const cargos = [
  "👑 Dono",
  "🔥 Líder",
  "💎 Sub-Líder",
  "🛡️ Gerente",
  "📋 Recrutador",
  "🌿 Membro",
  "🟢 Recruta"
];

client.once("ready", async () => {
  console.log(`Bot conectado: ${client.user.tag}`);

  const comando = new SlashCommandBuilder()
    .setName("instalardende")
    .setDescription("Instala a estrutura do Dendê")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    );

  await client.application.commands.set([
    comando.toJSON()
  ]);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "instalardende") return;

  if (!interaction.memberPermissions.has(
    PermissionFlagsBits.ManageGuild
  )) {
    return interaction.reply({
      content: "Você não tem permissão.",
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = interaction.guild;

    for (const nome of cargos) {
      if (!guild.roles.cache.some(r => r.name === nome)) {
        await guild.roles.create({
          name: nome,
          reason: "Instalação DENDÊ BOT"
        });
      }
    }

    for (const [nome, canais] of Object.entries(categorias)) {
      let categoria = guild.channels.cache.find(
        c => c.name === nome &&
        c.type === ChannelType.GuildCategory
      );

      if (!categoria) {
        categoria = await guild.channels.create({
          name: nome,
          type: ChannelType.GuildCategory
        });
      }

      for (const canal of canais) {
        const existe = guild.channels.cache.some(
          c => c.name === canal &&
          c.parentId === categoria.id
        );

        if (!existe) {
          await guild.channels.create({
            name: canal,
            type: ChannelType.GuildText,
            parent: categoria.id
          });
        }
      }
    }

    await interaction.editReply(
      "✅ Estrutura inicial do DENDÊ instalada com sucesso!"
    );
  } catch (erro) {
    console.error(erro);
    await interaction.editReply(
      "❌ Erro na instalação. Verifique as permissões do bot."
    );
  }
});

if (!process.env.DISCORD_TOKEN) {
  throw new Error("Configure DISCORD_TOKEN no Render.");
}

client.login(process.env.DISCORD_TOKEN);
