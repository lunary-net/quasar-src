const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axl = require("app-xbox-live");
const { Authflow, Titles } = require('prismarine-auth');

const algorithm = 'aes-256-cbc';
const secretKey = 'YYujWJY7xXXHpOqJut2m5CPyeBTdkYSp';

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("xsearch")
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .setDescription("Find and display Xbox user information.")
        .addStringOption(option =>
            option.setName("gamertag")
                .setDescription("Enter the gamertag to search for")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('Quasar is Loading')
                .setDescription(`Checking data, this may take a second depending on how much is been handled.`)
        ] 
        });
        try {
            const { checkBlacklist } = require('../src/handleBlacklist')
            const userId = interaction.user.id;
             if (checkBlacklist(userId, interaction)) {
          // End the process if the user is blacklisted
         return; // Exit the function here
        }
                              const userDir = path.join(
                                __dirname,
                                "../",
                                "players",
                                `${interaction.user.id}`
                              );
                              const authflow = new Authflow(
                                interaction.user.id,
                                userDir,
                                {
                                  flow: "live",
                                  deviceType: "Nintendo",
                                  authTitle: Titles.MinecraftNintendoSwitch,
                                  doSisuAuth: true,
                                },
                                async (code) => {
                                  const embed = new EmbedBuilder()
                                    .setTitle("Please link your account")
                                    .setDescription(
                                      `Go to this URL and log in with your Account: ${code.verification_uri}?otc=${code.user_code}. Or use this Code: ${code.user_code}.`
                                    )
                                    .setFooter({ text: "Sign in with your Alternative account" })
                                    .setColor(0xffff00);
                        
                                  await interaction.editReply({ embeds: [embed], ephemeral: true });
                                }
                              );
            const info = await authflow.getXboxToken(); 
            const xl = new axl.Account(`XBL3.0 x=${info.userHash};${info.XSTSToken}`);

            
            const gamertag = interaction.options.getString("gamertag");
            const amount = 50;

            const searchResults = await xl.people.find(gamertag, amount);

            if (!searchResults || !searchResults.people || searchResults.people.length === 0) {
                await interaction.editReply({ content: `No users found matching the gamertag "${gamertag}".`, ephemeral: true });
                return;
            }

            const pageSize = 3; 
            let currentPage = 0; 
            const totalPages = Math.ceil(searchResults.people.length / pageSize);

            const createEmbedsForPage = (page) => {
                const start = page * pageSize;
                const end = Math.min(start + pageSize, searchResults.people.length);
                const embeds = [];

                for (let i = start; i < end; i++) {
                    const user = searchResults.people[i];
                    const userEmbed = new EmbedBuilder()
                        .setColor('#70629E')
                        .setTitle(`${user.gamertag}`)
                        .setDescription(`Display Name: ${user.displayName || 'N/A'}\nGamerscore: ${user.gamerScore || 'N/A'}\nPresence: ${user.presenceState === 'Online' ? `Online - ${user.presenceText}` : 'Offline'}`)
                        .setThumbnail(user.displayPicRaw)
                        embeds.push(userEmbed);
                }

                return embeds;
            };

            const updateButtons = (locked = false) => {
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('back')
                            .setLabel('Back')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(locked || currentPage === 0)
                            .setEmoji('◀️'),
                        new ButtonBuilder()
                            .setCustomId('stop')
                            .setLabel('Stop')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🛑'),
                        new ButtonBuilder()
                            .setCustomId('forward')
                            .setLabel('Forward')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(locked || currentPage === totalPages - 1)
                            .setEmoji('▶️')
                    );
                return buttons;
            };

            const embeds = createEmbedsForPage(currentPage);
            const buttons = updateButtons();

            await interaction.editReply({ embeds, components: [buttons], ephemeral: false });

            interaction.client.on('interactionCreate', async (buttonInteraction) => {
                if (!buttonInteraction.isButton()) return;
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return await buttonInteraction.reply({ content: "You cannot use this button.", ephemeral: true });
                }

                if (buttonInteraction.customId === 'back') {
                    if (currentPage > 0) currentPage--;
                } else if (buttonInteraction.customId === 'forward') {
                    if (currentPage < totalPages - 1) currentPage++;
                } else if (buttonInteraction.customId === 'stop') {
                    const finalEmbeds = createEmbedsForPage(currentPage);
                    await buttonInteraction.update({ embeds: finalEmbeds, components: [] });
                    return;
                }

                const newEmbeds = createEmbedsForPage(currentPage);
                const newButtons = updateButtons();
                await buttonInteraction.update({ embeds: newEmbeds, components: [newButtons] });
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "There was an error while executing this command!", ephemeral: true });
        }
    }
};
