const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('Shows your linked account information'),


        

    async execute(interaction) {
        try {
            const { checkBlacklist } = require('../src/handleBlacklist')
            const userId = interaction.user.id;
             if (checkBlacklist(userId, interaction)) {
          // End the process if the user is blacklisted
         return; // Exit the function here
        }
            const usersPath = path.join(__dirname, '../data/users.json');
            // Create users.json if it doesn't exist
            if (!fs.existsSync(usersPath)) {
                fs.writeFileSync(usersPath, JSON.stringify({}, null, 4));
            }

            const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            const userData = users[interaction.user.id];

            if (!userData) {
                const embed = new EmbedBuilder()
                    .setTitle('Account Information')
                    .setDescription('You have no linked account.')
                    .setColor(0xff0000);
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('Account Information')
                .setColor(0x00ff00)
                .setThumbnail(userData.displayPicRaw);

            // Only add fields if they have valid values
            const fields = [
                { name: 'Gamertag', value: userData.gamertag || 'Not available' },
                { name: 'Gamerscore', value: userData.gamerScore?.toString() || 'Not available' },
                { name: 'XUID', value: userData.xuid || 'Not available' },
                { name: 'Linked Date', value: userData.linkedDate || 'Not available' },
                { name: 'Coins', value: userData.coins?.toString() || '0' }
            ].filter(field => field.value !== 'Not available');

            if (fields.length > 0) {
                embed.addFields(fields);
            } else {
                embed.setDescription('No account information available');
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription('Failed to fetch account information')
                .setColor(0xff0000);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};