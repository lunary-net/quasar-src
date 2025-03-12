const fs = require('fs');
const path = require('path');
const CoinNotifier = require('./coinNotifier');

class CommandRewards {
    static async handleCommandReward(interaction) {
        const usersPath = path.join(__dirname, '../users.json');
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        const user = users[interaction.user.id];

        if (!user) return;

        const coins = 5; // Base coins for using any command
        user.coins += coins;
        
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
        await CoinNotifier.notifyCoins(interaction, coins, 'Command Usage');
    }
}

module.exports = CommandRewards;
