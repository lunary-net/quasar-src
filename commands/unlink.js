const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unlink")
    .setDescription("Unlink your account from the client"),

  async execute(interaction) {
    try {
      const { checkBlacklist } = require('../src/handleBlacklist')
      const userId = interaction.user.id;
       if (checkBlacklist(userId, interaction)) {
    // End the process if the user is blacklisted
   return; // Exit the function here
  }
      await interaction.deferReply({ ephemeral: true });

      const userDir = path.join(
        __dirname,
        "../",
        "players",
        `${interaction.user.id}`
      );

      const usersFilePath = path.join(__dirname, "../", "data", "users.json");

      // Check if the user's directory exists
      if (!fs.existsSync(userDir)) {
        const embed = new EmbedBuilder()
          .setTitle("Unlink Process")
          .setDescription("Your account is not linked to the client.")
          .setFooter({ text: "If you want to link, use /link." })
          .setColor(0xff0000);

        await interaction.editReply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Remove user's directory
      fs.rmdirSync(userDir, { recursive: true });

      // Check if users.json exists
      if (fs.existsSync(usersFilePath)) {
        const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));

        // Remove the user entry
        delete users[interaction.user.id];

        // Save the updated JSON
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), "utf-8");
      }

      const embed = new EmbedBuilder()
        .setTitle("Unlink Process")
        .setDescription("You have successfully unlinked your account from the client.")
        .setFooter({ text: "If you want to link again, use /link." })
        .setColor(0x00ff00);

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(error);

      const embed = new EmbedBuilder()
        .setTitle("Unlink Process")
        .setDescription("An error occurred while trying to unlink your account. Please try again.")
        .setFooter({ text: "Try again later or contact support." })
        .setColor(0xff0000);

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
  },
};
