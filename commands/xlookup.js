const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axl = require("app-xbox-live");
const { Authflow: PrismarineAuth, Titles } = require('prismarine-auth');
const algorithm = 'aes-256-cbc';
const secretKey = 'YYujWJY7xXXHpOqJut2m5CPyeBTdkYSp';

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("xlookup")
        .setIntegrationTypes(0, 1)
        .setContexts(0, 1, 2)
        .setDescription("Display detailed Xbox user information based on gamertag.")
        .addStringOption(option =>
            option.setName("gamertag")
                .setDescription("Enter the gamertag to search for")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.reply({ embeds: [
            new EmbedBuilder()
                .setTitle('Quasar is Loading')
                .setDescription(`Checking data, this may take a second depending on how much is been handled.`)
        ] 
        })
        try {
          const { checkBlacklist } = require('../src/handleBlacklist')
          const userId = interaction.user.id;
           if (checkBlacklist(userId, interaction)) {
        // End the process if the user is blacklisted
       return; // Exit the function here
      }
                  const userDir = path.join(
                    __dirname,
                    "../",
                    "players",
                    `${interaction.user.id}`
                  );
                  const authflow = new PrismarineAuth(
                    interaction.user.id,
                    userDir,
                    {
                      flow: "live",
                      deviceType: "Nintendo",
                      authTitle: Titles.MinecraftNintendoSwitch,
                      doSisuAuth: true,
                    },
                    async (code) => {
                      const embed = new EmbedBuilder()
                        .setTitle("Please link your account")
                        .setDescription(
                          `Go to this URL and log in with your Account: ${code.verification_uri}?otc=${code.user_code}. Or use this Code: ${code.user_code}.`
                        )
                        .setFooter({ text: "Sign in with your Alternative account" })
                        .setColor(0xffff00);
            
                      await interaction.editReply({ embeds: [embed], ephemeral: true });
                    }
                  );
            const info = await authflow.getXboxToken(); 
            const xl = new axl.Account(`XBL3.0 x=${info.userHash};${info.XSTSToken}`);
            const gamertag = interaction.options.getString("gamertag");

            const searchResults = await xl.people.find(gamertag, 1);

            if (!searchResults || !searchResults.people || searchResults.people.length === 0) {
                await interaction.editReply({ content: `No users found matching the gamertag "${gamertag}".`, ephemeral: true });
                return;
            }

            const selectedUser = searchResults.people[0];
            const detail = selectedUser.detail;

            let description = `**Gamertag**: ${selectedUser.gamertag}\n`;
            if (selectedUser.xuid) description += `**Xuid**: ${selectedUser.xuid}\n`;
            if (detail.isVerified == true ?? false) description += `**Verifyied**: ${detail.isVerified}\n`;
            if (selectedUser.gamerScore) description += `**Gamerscore**: ${selectedUser.gamerScore}\n`;
            if (selectedUser.uniqueModernGamertag) description += `**Unique Gamertag**: ${selectedUser.uniqueModernGamertag}\n`;
            if (selectedUser.xboxOneRep) description += `**Reputation**: ${selectedUser.xboxOneRep}\n`;
            if (detail.accountTier) description += `**Account Tier**: ${detail.accountTier}\n`;
            if (detail.bio) description += `**Bio**: ${detail.bio}\n`;
            if (detail.location) description += `**Location**: ${detail.location}\n`;
            if (detail.tenure) description += `**Tenure**: ${detail.tenure}\n`;
            if (detail.followerCount) description += `**Followers**: ${detail.followerCount}\n`;
            if (detail.followingCount) description += `**Following**: ${detail.followingCount}\n`;
            description += `**Has Game Pass**: ${detail.hasGamePass ? 'Yes' : 'No'}\n`;
            description += `**Primary Color**: #${selectedUser.preferredColor.primaryColor}\n`;
            description += `**Secondary Color**: #${selectedUser.preferredColor.secondaryColor}\n`;

            const detailedEmbed = new EmbedBuilder()
                .setColor('#70629E')
                .setTitle(`${selectedUser.gamertag}'s Profile`)
                .setDescription(description)
                .setThumbnail(selectedUser.displayPicRaw)

            await interaction.editReply({ embeds: [detailedEmbed], ephemeral: false });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "There was an error while executing this command!", ephemeral: true });
        }
    }
};
