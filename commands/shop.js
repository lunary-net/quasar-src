const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const Steve = require('./skins/Steve.json');
const Jenny = require('./skins/Jenny.json');

// Add premium price check function
function getItemPrice(item, user) {
    if (user.premium?.enabled && item.category === "skins") {
        return 0; // Free for premium users
    }
    return item.price;
}

const shopItems = {
    skins: {
        "Steve": {
            name: "Minecraft Steve Skin",
            price: 1000,
            category: "skins",
            rarity: "common",
            description: "A common character skin (Free for Premium)",
            skinData: Steve.skinData
        },
        "Jenny": {
            name: "Minecraft Jenny Skin",
            price: 1500,
            category: "skins",
            rarity: "rare",
            description: "A rare slim character skin (Free for Premium)",
            skinData: Jenny
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("View and purchase items from the shop")
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View available items in the shop")
                .addStringOption(option =>
                    option
                        .setName("category")
                        .setDescription("Shop category to view")
                        .addChoices(
                            { name: "Skins", value: "skins" },
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("buy")
                .setDescription("Purchase an item from the shop")
                .addStringOption(option =>
                    option
                        .setName("item_id")
                        .setDescription("ID of the item to purchase")
                        .setRequired(true)
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
            const subcommand = interaction.options.getSubcommand();
            const usersPath = path.join(__dirname, "../data/users.json");
            
            if (!fs.existsSync(usersPath)) {
                return await interaction.editReply("You need to link your account first using /link");
            }

            const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            const user = users[interaction.user.id];

            if (!user) {
                return await interaction.editReply("You need to link your account first using /link");
            }

            if (subcommand === "view") {
                const category = interaction.options.getString("category");
                const items = shopItems[category];
                
                const embed = new EmbedBuilder()
                    .setTitle(`Shop - ${category.charAt(0).toUpperCase() + category.slice(1)}`)
                    .setDescription(user.premium?.enabled ? 
                        "🌟 **PREMIUM USER** - All skins are FREE!\n\nAvailable items:" :
                        "Available items for purchase:")
                    .setColor(user.premium?.enabled ? 0xffd700 : 0x0099ff);

                for (const [itemId, item] of Object.entries(items)) {
                    const price = getItemPrice(item, user);
                    const priceText = price === 0 ? "🌟 **FREE WITH PREMIUM**" : `${price} coins`;
                    embed.addFields({
                        name: `${item.name} (${priceText})`,
                        value: `ID: ${itemId}\n${item.description}\nRarity: ${item.rarity}`
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }

            else if (subcommand === "buy") {
                const itemId = interaction.options.getString("item_id");
                let item;

                // Find the item in shop categories
                for (const category of Object.values(shopItems)) {
                    if (itemId in category) {
                        item = category[itemId];
                        break;
                    }
                }

                if (!item) {
                    return await interaction.editReply("Invalid item ID!");
                }

                const price = getItemPrice(item, user);
                if (!user.coins || user.coins < price) {
                    return await interaction.editReply(`You don't have enough coins! You need ${price} coins.`);
                }

                // Initialize inventory if it doesn't exist
                if (!user.inventory) user.inventory = {};
                if (!user.inventory[item.category]) user.inventory[item.category] = [];

                // Add item to inventory and deduct coins (if not free)
                user.inventory[item.category].push(itemId);
                if (price > 0) {
                    user.coins -= price;
                }

                // If buying a skin, save the skin data to player's directory
                if (item.category === "skins") {
                    const playerDir = path.join(__dirname, "../players", interaction.user.id);
                    const skinFile = path.join(playerDir, "skin.json");
                    const skinData = {
                        currentSkin: itemId,
                        skinData: item.skinData,
                        lastUpdated: Date.now()
                    };
                    
                    // Ensure player directory exists
                    if (!fs.existsSync(playerDir)) {
                        fs.mkdirSync(playerDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(skinFile, JSON.stringify(skinData, null, 2));
                }

                // Save updated user data
                fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

                const embed = new EmbedBuilder()
                    .setTitle("Purchase Successful!")
                    .setDescription(`You bought ${item.name} for ${price === 0 ? "FREE (Premium)" : `${price} coins`}!`)
                    .setColor(0x00ff00)
                    .setFooter({ text: `Remaining coins: ${user.coins}` });

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply("An error occurred while processing your request.");
        }
    },
};
