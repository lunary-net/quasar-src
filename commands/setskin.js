const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Import all skin data
const Steve = require('./skins/Steve.json');
const Jenny = require('./skins/Jenny.json');

// Define available skins
const availableSkins = {
    "Steve": Steve,
    "Jenny": Jenny
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setskin")
        .setDescription("Select a skin from your inventory")
        .addStringOption(option =>
            option
                .setName("skin_id")
                .setDescription("The ID of the skin you want to use")
                .setRequired(true)
                .addChoices(
                    { name: 'Steve', value: 'Steve' },
                    { name: 'Jenny', value: 'Jenny' }
                )
        ),

    async execute(interaction) {
        try {

            const { checkBlacklist } = require('../src/handleBlacklist')
            const userId = interaction.user.id;
             if (checkBlacklist(userId, interaction)) {
          // End the process if the user is blacklisted
         return; // Exit the function here
        }

            await interaction.deferReply({ ephemeral: true });
            const skinId = interaction.options.getString("skin_id");
            
            const usersPath = path.join(__dirname, "../data/users.json");
            const playerDir = path.join(__dirname, "../players", interaction.user.id);
            const skinFile = path.join(playerDir, "skin.json");

            if (!fs.existsSync(usersPath) || !fs.existsSync(playerDir)) {
                return await interaction.editReply("You need to link your account first using /link");
            }

            const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            const user = users[interaction.user.id];

            if (!availableSkins[skinId]) {
                return await interaction.editReply("Invalid skin ID!");
            }

            if (!user?.inventory?.skins || !user.inventory.skins.includes(skinId)) {
                return await interaction.editReply("You don't own this skin! Use /shop view skins to see available skins.");
            }

            // Save the selected skin
            const skinData = {
                currentSkin: skinId,
                skinData: availableSkins[skinId],
                lastUpdated: Date.now()
            };

            fs.writeFileSync(skinFile, JSON.stringify(skinData, null, 2));

            const embed = new EmbedBuilder()
                .setTitle("Skin Changed!")
                .setDescription(`Successfully equipped the ${skinId} skin!`)
                .setColor(0x00ff00);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply("An error occurred while changing your skin.");
        }
    },
};
