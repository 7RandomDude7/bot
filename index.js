import {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  Message,
} from "discord.js";

import keepAlive from "./server.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user?.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  checkMsg(message);
});

async function checkMsg(message) {
  const msgContent = message.content;
  const userName = message.author.username;
  const discordID = message.author.id;

  if (msgContent === "/mc") {
    console.log(`Cmd triggered by: ${userName} (${discordID})`);

    const result = await getOnlineUserInfo();
    console.log(result);

    if (result === -1) {
      await sendServerStatusEmbed(message, false);
    } else if (result && typeof result === "object" && "count" in result) {
      await sendServerStatusEmbed(message, true, result.count, result.names);
    } else {
      console.error("Could not get player count");
    }
  }
}

async function sendServerStatusEmbed(
  message,
  online,
  playerCount,
  playerNames,
) {
  const channel = message.channel;

  if (!channel.isTextBased()) {
    console.error("The channel is not a text channel.");
    return;
  }

  let embed;

  if (online) {
    embed = new EmbedBuilder()
      .setAuthor({ name: "SERVER INFORMATION" })
      .setTitle("CURRENT STATUS")
      .setDescription("ONLINE")
      .addFields({
        name: "PLAYER COUNT",
        value: playerCount ? `${playerCount}` : "0",
      });

    if (playerNames && playerNames.length > 0) {
      embed.addFields({
        name: "PLAYER NAMES",
        value: playerNames.join(", "),
      });
    }

    embed
      .setColor(0xaafc41)
      .setFooter({
        text: "HAVE A NICE DAY",
        iconURL: "https://slate.dan.onl/slate.png",
      })
      .setTimestamp(new Date());
  } else {
    embed = new EmbedBuilder()
      .setAuthor({ name: "SERVER INFORMATION" })
      .setTitle("CURRENT STATUS")
      .setDescription("OFFLINE")
      .setColor(0xee6055)
      .setFooter({
        text: "HAVE A NICE DAY",
        iconURL: "https://slate.dan.onl/slate.png",
      })
      .setTimestamp(new Date());
  }

  await message.channel.send({ embeds: [embed] });
}

async function getOnlineUserInfo() {
  const apiUrl = process.env.MINECRAFT_API;

  if (!apiUrl) {
    throw new Error("MINECRAFT_API environment variable is not defined.");
  }

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (
      typeof data === "object" &&
      data !== null &&
      "online" in data &&
      typeof data.online === "boolean"
    ) {
      if (data.online === false) {
        return -1;
      }

      if (
        "players" in data &&
        data.players &&
        typeof data.players === "object" &&
        "online" in data.players &&
        typeof data.players.online === "number"
      ) {
        const count = data.players.online;

        let names = [];
        if ("list" in data.players && Array.isArray(data.players.list)) {
          names = data.players.list.map((player) => player.name_clean);
        }

        return { count, names };
      }
    }

    throw new Error("Invalid API response structure.");
  } catch (error) {
    console.error("Error getting online user info:", error);
    return false;
  }
}

keepAlive();
await client.login(process.env.DISCORD_BOT_TOKEN);
