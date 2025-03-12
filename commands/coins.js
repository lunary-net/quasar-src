const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const CoinNotifier = require('../src/coinNotifier');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coins')
        .setDescription('Manage user coins')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add coins to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add coins to')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of coins to add')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for adding coins')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({
                content: 'You need Administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'Admin command';

            const usersPath = path.join(__dirname, '../data/users.json');
            let users = {};
            
            try {
                const { checkBlacklist } = require('../src/handleBlacklist')
                const userId = interaction.user.id;
                 if (checkBlacklist(userId, interaction)) {
              // End the process if the user is blacklisted
             return; // Exit the function here
            }
                users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            } catch (error) {
                return interaction.editReply({
                    content: 'Error reading users database',
                    ephemeral: true
                });
            }

            if (!users[targetUser.id]) {
                return interaction.editReply({
                    content: 'That user has not linked their account yet.',
                    ephemeral: true
                });
            }

            users[targetUser.id].coins = (users[targetUser.id].coins || 0) + amount;
            fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

            // Notify the user about coins received
            await CoinNotifier.notifyCoins(targetUser, amount, reason);

            const embed = new EmbedBuilder()
                .setTitle('Coins Added')
                .setDescription(`Added ${amount} coins to ${targetUser.tag}`)
                .addFields(
                    { name: 'New Balance', value: `${users[targetUser.id].coins}`, inline: true },
                    { name: 'Reason', value: reason, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        }
    }
};
