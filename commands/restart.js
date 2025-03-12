const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restarts the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const adminsPath = path.join(__dirname, '..', 'data', 'admins.json');
            const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8')).admins;

            if (!admins.includes(interaction.user.id)) {
                return await interaction.reply({ 
                    content: '❌ You are not authorized to restart the bot!', 
                    ephemeral: true 
                });
            }

            await interaction.reply({ content: 'Restarting bot...', ephemeral: true });
            console.log(`Bot restart initiated by ${interaction.user.tag}`);
            
            setTimeout(() => {
                process.exit(1);
            }, 1000);

        } catch (error) {
            console.error('Restart error:', error);
            await interaction.reply({ 
                content: '❌ Error processing restart command', 
                ephemeral: true 
            });
        }
    }
};
