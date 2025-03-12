const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Remove a user from the blacklist.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove from the blacklist.')
        .setRequired(true)),

  async execute(interaction) {
    try {
      // Load the admins list
      const adminsPath = path.join(__dirname, '../data/admins.json');
      let admins = [];
      if (fs.existsSync(adminsPath)) {
        admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
      }

      // Check if the user is an admin
      if (!admins.includes(interaction.user.id)) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
      }

      // Load the blacklist
      const blacklistPath = path.join(__dirname, '../data/blacklist.json');
      let blacklist = [];
      if (fs.existsSync(blacklistPath)) {
        blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
      }

      const user = interaction.options.getUser('user');
      const userIndex = blacklist.findIndex(entry => entry.userId === user.id);

      if (userIndex === -1) {
        return interaction.reply({
          content: `${user.tag} is not blacklisted.`,
          ephemeral: true
        });
      }

      blacklist.splice(userIndex, 1);
      fs.writeFileSync(blacklistPath, JSON.stringify(blacklist, null, 2));

      await interaction.reply({
        content: `${user.tag} has been removed from the blacklist.`,
        ephemeral: true
      });

      try {
        await user.send(`You have been removed from the blacklist.`);
      } catch (err) {
        console.error(`Could not send DM to ${user.tag}:`, err);
      }
    } catch (error) {
      console.error('Error unblacklisting user:', error);
      await interaction.reply({
        content: 'There was an error removing the user from the blacklist. Please try again later.',
        ephemeral: true
      });
    }
  },
};
