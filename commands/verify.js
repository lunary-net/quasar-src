const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your Minecraft account status'),

    async execute(interaction) {
        try {
            const { checkBlacklist } = require('../src/handleBlacklist')
            const userId = interaction.user.id;
             if (checkBlacklist(userId, interaction)) {
          // End the process if the user is blacklisted
         return; // Exit the function here
        }
            await interaction.deferReply({ ephemeral: true });
            
            const userDir = path.join(__dirname, "../players", interaction.user.id);
            const usersPath = path.join(__dirname, "../data/users.json");

            if (!fs.existsSync(userDir)) {
                return await interaction.editReply("You need to link your account first using /link");
            }

            const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            const user = users[interaction.user.id];

            if (!user) {
                return await interaction.editReply("Account not found in database!");
            }

            // Simple verification check
            const verificationStatus = {
                verified: true,
                timestamp: Date.now(),
                gamertag: user.gamertag,
                xuid: user.xuid
            };

            // Save verification status
            const verifyFile = path.join(userDir, "verify.json");
            fs.writeFileSync(verifyFile, JSON.stringify(verificationStatus, null, 2));

            // Update user data
            user.verified = true;
            user.lastVerified = Date.now();
            fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

            const embed = new EmbedBuilder()
                .setTitle("Verification Successful")
                .setDescription(`Account verified successfully!`)
                .addFields(
                    { name: "Gamertag", value: user.gamertag },
                    { name: "Verified At", value: new Date().toLocaleString() }
                )
                .setColor(0x00ff00)
                .setFooter({ text: "Your account is now verified" });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply("An error occurred during verification.");
        }
    },
};
