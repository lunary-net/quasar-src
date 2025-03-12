const { SlashCommandBuilder } = require('discord.js');
const CoinNotifier = require('../src/coinNotifier');
const CommandRewards = require('../src/commandRewards');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Collect your daily coins!'),

    async execute(interaction) {
        await CommandRewards.handleCommandReward(interaction);
        
        const usersPath = path.join(__dirname, '../users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const user = users[interaction.user.id];

        if (!user) {
            return interaction.reply({ content: 'You need to link your account first!', ephemeral: true });
        }

        const { checkBlacklist } = require('../src/handleBlacklist')
        const userId = interaction.user.id;
         if (checkBlacklist(userId, interaction)) {
      // End the process if the user is blacklisted
     return; // Exit the function here
    }

        const now = Date.now();
        const lastDaily = user.lastDaily || 0;
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours

        if (now - lastDaily < cooldown) {
            const timeLeft = cooldown - (now - lastDaily);
            const hoursLeft = Math.floor(timeLeft / 3600000);
            const minutesLeft = Math.floor((timeLeft % 3600000) / 60000);
            
            return interaction.reply({
                content: `You can collect your daily coins in ${hoursLeft}h ${minutesLeft}m!`,
                ephemeral: true
            });
        }

        const coins = 100;
        user.coins += coins;
        user.lastDaily = now;
        
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    
    }
};
