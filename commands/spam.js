const bedrock = require('bedrock-protocol');
const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Authflow, Titles } = require('prismarine-auth');
const {v4} = require('uuid')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Spam realm chat with your custom message')
        .addStringOption(option =>
            option.setName('invite')
                .setDescription('Realm invite code')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message to spam')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('namespoof')
                .setDescription('Name to spoof on connect')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of spam')
                .setRequired(true)
                .addChoices(
                    { name: "/me (External)", value: "external_me" },
                    { name: "/me (Player)", value: "player_me" },
                    { name: "/tell @a (External)", value: "external_tell" },
                    { name: "/tell @a (Player)", value: "player_tell" },
                    { name: "/w @a (External)", value: "external_whisper" },
                    { name: "/w @a (Player)", value: "player_whisper" },
                    { name: "Chat", value: "chat" }
                )
        ),
    async execute(interaction) {
        // Retrieve options from the interaction
        const invite = interaction.options.getString('invite');
        const message = interaction.options.getString('message');
        const namespoof = interaction.options.getString('namespoof');
        const spamType = interaction.options.getString('type');

        const embed = new EmbedBuilder()
        .setTitle('Loading data')
        .setDescription('Loading data this may take a few seconds');
    interaction.reply({ embeds: [embed] });

        const userDir = path.join(__dirname, '../', 'players', `${interaction.user.id}`);

        // Initialize authentication flow
        const authflow = new Authflow(
            interaction.user.id,
            userDir,
            {
                flow: 'live',
                deviceType: 'Nintendo',
                authTitle: Titles.MinecraftNintendoSwitch,
                doSisuAuth: true,
            },
        );

        // Create bedrock client
        const client = bedrock.createClient({
            realms: {
                realmInvite: invite,
            },
            skinData: {
                ThirdPartyName: namespoof,
                ThirdPartyNameOnly: true,
            },
            username: interaction.user.id,
            profilesFolder: userDir,
            skipPing: true,
            conLog: console.log,
        });

        // Handle successful connection
        client.on('play_status', () => {
            const embed = new EmbedBuilder()
                .setTitle('Quasar is connected')
                .setDescription('The bot is successfully connected to the Realm!');
            interaction.reply({ embeds: [embed] });

            if (spamType === 'external_me') {
                client.queue("command_request", {
                    command: `/me ${message}`,
                    origin: {
                      type: 5,
                      uuid: v4(),
                      request_id: v4(),
                    },
                    interval: false,
                    version: 52,
                });
            }
            if (spamType === 'player_me') {
                client.queue("command_request", {
                    command: `/me ${message}`,
                    origin: {
                      type: 0,
                      uuid: v4(),
                      request_id: v4(),
                    },
                    interval: false,
                    version: 52,
                });
            }
            if (spamType === 'external_tell') {
                client.queue("command_request", {
                    command: `/tell @a ${message}`,
                    origin: {
                      type: 5,
                      uuid: v4(),
                      request_id: v4(),
                    },
                    interval: false,
                    version: 52,
                });
            }
            if (spamType === 'player_tell') {
                client.queue("command_request", {
                    command: `/tell @a ${message}`,
                    origin: {
                      type: 0,
                      uuid: v4(),
                      request_id: v4(),
                    },
                    interval: false,
                    version: 52,
                });
            }
            if (spamType === 'external_whisper') {
                client.queue("command_request", {
                    command: `/w @a ${message}`,
                    origin: {
                      type: 5,
                      uuid: v4(),
                      request_id: v4(),
                    },
                    interval: false,
                    version: 52,
                });
            }
            if (spamType === 'player_whisper') {
                client.queue("command_request", {
                    command: `/w @a ${message}`,
                    origin: {
                      type: 0,
                      uuid: v4(),
                      request_id: v4(),
                    },
                    interval: false,
                    version: 52,
                });
            }
            if (spamType === 'chat') {
                client.queue("command_request", {
                    command: `${message}`,
                    origin: {
                      type: 0,
                      uuid: v4(),
                      request_id: v4(),
                    },
                    interval: false,
                    version: 52,
                });
            }

            setInterval(spamType, 100)
        });

        // Handle connection errors
        client.on('error', (err) => {
            const embed = new EmbedBuilder()
                .setTitle('Connection Error')
                .setDescription(`Failed to connect to Realm: ${err.message}`);
            interaction.reply({ embeds: [embed] });
        });
    },
};
