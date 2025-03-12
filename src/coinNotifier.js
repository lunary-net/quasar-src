const { EmbedBuilder } = require('discord.js');

class CoinNotifier {
    static async notifyCoins(interaction, amount, reason) {
        const embed = new EmbedBuilder()
            .setTitle('💰 Coins Earned!')
            .setDescription(`You earned **${amount}** coins!\nReason: ${reason}`)
            .setColor(0xFFD700)
            .setFooter({ text: 'Keep using commands to earn more coins!' });
        
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}

module.exports = CoinNotifier;
