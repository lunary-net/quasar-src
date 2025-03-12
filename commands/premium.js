const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Premium management commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)  // Set permissions at top level
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add premium to a user')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('User to add premium to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('days')
                        .setDescription('Number of days to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove premium from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove premium from')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check premium status')),

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
                return await interaction.editReply("Database not found!");
            }

            const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

            switch (subcommand) {
                case 'add': {
                    const targetUser = interaction.options.getUser('user');
                    const days = interaction.options.getInteger('days');
                    
                    if (!users[targetUser.id]) {
                        return await interaction.editReply("This user is not linked!");
                    }

                    const expirationDate = users[targetUser.id].premium?.expiresAt || Date.now();
                    users[targetUser.id].premium = {
                        enabled: true,
                        expiresAt: new Date(expirationDate).getTime() + (days * 24 * 60 * 60 * 1000),
                        addedBy: interaction.user.id,
                        addedAt: Date.now()
                    };

                    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

                    const embed = new EmbedBuilder()
                        .setTitle("Premium Added")
                        .setDescription(`Added ${days} days of premium to ${targetUser.tag}`)
                        .setColor(0x00ff00)
                        .setFooter({ text: `Expires: ${new Date(users[targetUser.id].premium.expiresAt).toLocaleString()}` });

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'remove': {
                    const targetUser = interaction.options.getUser('user');
                    
                    if (!users[targetUser.id]) {
                        return await interaction.editReply("This user is not linked!");
                    }

                    if (!users[targetUser.id].premium?.enabled) {
                        return await interaction.editReply("This user doesn't have premium!");
                    }

                    users[targetUser.id].premium.enabled = false;
                    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

                    const embed = new EmbedBuilder()
                        .setTitle("Premium Removed")
                        .setDescription(`Removed premium from ${targetUser.tag}`)
                        .setColor(0xff0000);

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }

                case 'check': {
                    const userId = interaction.user.id;
                    if (!users[userId]) {
                        return await interaction.editReply("Your account is not linked!");
                    }

                    const premium = users[userId].premium;
                    const embed = new EmbedBuilder()
                        .setTitle("Premium Status")
                        .setColor(premium?.enabled ? 0x00ff00 : 0xff0000);

                    if (premium?.enabled) {
                        const timeLeft = Math.max(0, premium.expiresAt - Date.now());
                        const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
                        embed.setDescription(`You have premium!\nDays remaining: ${daysLeft}`)
                            .setFooter({ text: `Expires: ${new Date(premium.expiresAt).toLocaleString()}` });
                    } else {
                        embed.setDescription("You don't have premium!");
                    }

                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply("An error occurred while processing your request.");
        }
    },
};
