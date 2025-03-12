const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

// Load ban list from ../data/banlist.json
const banList = require('../data/banlist.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Automatically ban users based on the ban list'),

  async execute(interaction) {
    const { guild } = interaction;

    if (!guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }

    // Notify the operation has started
    await interaction.reply({ content: 'Ban operation started...', ephemeral: true });

    const bannedUsers = [];
    const failedUsers = [];

    for (const user of banList.users) {
      try {
        const { checkBlacklist } = require('../src/handleBlacklist')
        const userId = interaction.user.id;
         if (checkBlacklist(userId, interaction)) {
      // End the process if the user is blacklisted
     return; // Exit the function here
    }
        await guild.members.ban(user.id, { reason: user.reason });
        bannedUsers.push(`Banned ${user.id} for: ${user.reason}`);
      } catch (error) {
        console.error(`Failed to ban user ${user.id}:`, error);
        failedUsers.push(`Failed to ban ${user.id}`);
      }
    }

    // Save the results to a file
    const filePath = path.join(__dirname, 'ban_results.txt');
    const fileContent = [
      'Ban Results:',
      ...bannedUsers,
      '',
      'Failures:',
      ...failedUsers,
    ].join('\n');

    fs.writeFileSync(filePath, fileContent);

    // Notify the operation has completed
    return interaction.followUp({
      content: 'Ban operation completed. See the attached file for detailed results.',
      files: [filePath],
      ephemeral: true,
    });
  },
};
