const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist-add')
    .setDescription('Add a user to the blacklist.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to blacklist.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for blacklisting.')
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

      // Get the user and reason
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      if (blacklist.some(entry => entry.userId === user.id)) {
        return interaction.reply({
          content: `${user.tag} is already blacklisted.`,
          ephemeral: true
        });
      }

      blacklist.push({ userId: user.id, reason, date: new Date().toISOString() });
      fs.writeFileSync(blacklistPath, JSON.stringify(blacklist, null, 2));

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('You Are Blacklisted')
        .setDescription(`You have been blacklisted for the following reason: ${reason}`)
        .setFooter({ text: 'Contact the admin if you believe this is a mistake.' });

      try {
        await user.send({ embeds: [embed] });
      } catch (err) {
        console.error(`Could not send DM to ${user.tag}:`, err);
      }

      await interaction.reply({
        content: `${user.tag} has been blacklisted for the reason: "${reason}".`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error blacklisting user:', error);
      await interaction.reply({
        content: 'There was an error adding the user to the blacklist. Please try again later.',
        ephemeral: true
      });
    }
  },
};
