const { Client, Collection, GatewayIntentBits, ActivityType, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./data/config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

// Function to recursively load commands from directories
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            try {
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Loaded command "${command.data.name}" from ${filePath}`);
                } else {
                    console.log(`❌ Command ${file} is missing required properties`);
                }
            } catch (error) {
                console.error(`❌ Error loading ${file}:`, error);
            }
        }
    }
}

// Ensure commands directory exists
if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
}

// Load all commands recursively
loadCommands(commandsPath);

client.once('ready', () => {
    console.log(`${client.user.tag} is ready!`);
    client.user.setActivity(config.status.message, { type: ActivityType[config.status.type] });
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'There was an error executing this command!',
                ephemeral: true,
            });
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'accept_tos') {
            const guild = interaction.guild;
            const member = interaction.member;

            try {
                const verifiedRole = guild.roles.cache.find((role) => role.name === 'Member'); // Replace with your role name
                if (!verifiedRole) {
                    return interaction.reply({
                        content: 'The verified role does not exist. Please contact an admin.',
                        ephemeral: true,
                    });
                }

                await member.roles.add(verifiedRole);
                await interaction.reply({
                    content: 'You have been verified and granted access to the server. Welcome!',
                    ephemeral: true,
                });
            } catch (error) {
                console.error('Error verifying the user:', error);
                await interaction.reply({
                    content: 'There was an error verifying you. Please try again later or contact an admin.',
                    ephemeral: true,
                });
            }
        } else if (interaction.customId === 'create_ticket') {
            const guild = interaction.guild;
            const member = interaction.member;

            try {
                const ticketChannel = await guild.channels.create({
                    name: `${member.user.username}`,
                    type: 0, // Text channel
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: member.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        },
                        {
                            id: '1348234749843472404', // Replace with staff role ID
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        },
                    ],
                });

                await ticketChannel.send(`Hello <@${member.id}>, a staff member will be with you shortly.`);
                await interaction.reply({
                    content: 'Your ticket has been created!',
                    ephemeral: true,
                });
            } catch (error) {
                console.error('Error creating ticket channel:', error);
                await interaction.reply({
                    content: 'There was an error creating your ticket. Please try again.',
                    ephemeral: true,
                });
            }
        }
    }
});

client.login(config.token);
