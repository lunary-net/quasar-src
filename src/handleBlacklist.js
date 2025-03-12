const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Load blacklist from JSON
const blacklistPath = path.join(__dirname, '../data/blacklist.json');
let blacklist = [];

if (fs.existsSync(blacklistPath)) {
  blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
}

// Blacklist check function
function checkBlacklist(userId, interaction) {
  const blacklistedUser = blacklist.find(entry => entry.userId === userId);

  if (blacklistedUser) {
    // Create an embed message
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Access Denied')
      .setDescription(`You are blacklisted for the following reason: ${blacklistedUser.reason}`)
      .setFooter({ text: 'Contact the admin if you believe this is a mistake.' });

    // Send the embed message to the user
    interaction.reply({ embeds: [embed], ephemeral: true });
    return true; // User is blacklisted
  }

  return false; // User is not blacklisted
}

// Export the function
module.exports = { checkBlacklist };
