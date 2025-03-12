const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Authflow, Titles } = require('prismarine-auth');
const axl = require('app-xbox-live');
const fs = require('fs');
const path = require('path');
const CoinNotifier = require('../src/coinNotifier');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your account to the bot'),

  async execute(interaction) {
    try {
      const usersPath = path.join(__dirname, '../data/users.json');
      let users = {};
      if (fs.existsSync(usersPath)) {
        users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      }

      const { checkBlacklist } = require('../src/handleBlacklist')
      const userId = interaction.user.id;
       if (checkBlacklist(userId, interaction)) {
    // End the process if the user is blacklisted
   return; // Exit the function here
  }

      // Check if the user has agreed to ToS
      if (!users[interaction.user.id]?.tosAgreed) {
        const tosEmbed = new EmbedBuilder()
          .setTitle('📜 Terms of Service Agreement Required')
          .setDescription(
            `Before using any command you're need to agree with our ToS\n\n**Terms of Service**:\n
            1. We collect XUID, Username, Gamerpic, Gamerscore, Userhash, Access Token, Discord ID, and XSTS Token.\n
            2. We are not responsible for any misuse, crashes, or realm incidents.\n
            3. You must not hold staff accountable for any damages or issues.\n\n
            Click **Agree** below to proceed.`
          )
          .setColor('Green')
          .setFooter({ text: 'Make sure to read the Terms of Service carefully before proceeding.' });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('accept_tos')
              .setLabel('Agree')
              .setStyle(ButtonStyle.Success)
          );

        await interaction.reply({ embeds: [tosEmbed], components: [row], ephemeral: true });

        // Wait for user interaction on the button
        const filter = (i) => i.user.id === interaction.user.id;
        try {
          const confirmation = await interaction.channel.awaitMessageComponent({
            filter,
            time: 60000, // 1 minute timeout
          });

          if (confirmation.customId === 'accept_tos') {
            users[interaction.user.id] = { ...users[interaction.user.id], tosAgreed: true };
            fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

            await confirmation.update({ content: 'You have agreed to the Terms of Service. You can now use the `/link` command.', components: [], ephemeral: true });
            return;
          }
        } catch (err) {
          await interaction.editReply({ content: 'You did not agree to the Terms of Service. Please try again.', components: [], ephemeral: true });
          return;
        }
      }

      // Proceed with linking if the user has already agreed to the ToS
      await interaction.deferReply({ ephemeral: true });
      const userDir = path.join(__dirname, '../', 'players', `${interaction.user.id}`);

      if (fs.existsSync(userDir)) {
        const embed = new EmbedBuilder()
          .setTitle('Authentication Process')
          .setDescription('Your account is already linked to the bot.')
          .setFooter({ text: 'If you want to unlink, use /unlink.' })
          .setColor(0xff0000);

        await interaction.editReply({ embeds: [embed], ephemeral: true });
        return;
      }

      fs.mkdirSync(userDir, { recursive: true });

      const client = new Authflow(
        interaction.user.id,
        userDir,
        {
          flow: 'live',
          deviceType: 'Nintendo',
          authTitle: Titles.MinecraftNintendoSwitch,
          doSisuAuth: true,
        },
        async (code) => {
          const embed = new EmbedBuilder()
            .setTitle('Please link your account')
            .setDescription(
              `Go to this URL and log in with your account: ${code.verification_uri}?otc=${code.user_code}. Or use this Code: ${code.user_code}.`
            )
            .setFooter({ text: 'Sign in with your alternative account' })
            .setColor(0xffff00);

          await interaction.editReply({ embeds: [embed], ephemeral: true });
        }
      );

      let expired = false;
      const info = await Promise.race([
        client.getXboxToken(),
        new Promise((resolve) =>
          setTimeout(() => {
            expired = true;
            resolve();
          }, 1000 * 60 * 5)
        ),
      ]);

      if (expired) {
        fs.rmdirSync(userDir, { recursive: true });
        const embed = new EmbedBuilder()
          .setTitle('Authentication Process')
          .setDescription('The authentication process has timed out. Please try again.')
          .setFooter({ text: 'Please try again.' })
          .setColor(0xff0000);

        await interaction.editReply({ embeds: [embed], ephemeral: true });
        return;
      }

      const xl = new axl.Account(`XBL3.0 x=${info.userHash};${info.XSTSToken}`);
      const owner = await xl.people.get(info.userXUID);
      const ownerInfo = owner.people[0] || {};

      const confirmEmbed = new EmbedBuilder()
        .setTitle('Account Confirmation')
        .setDescription(`Is this your Xbox account?\n**Gamertag:** ${ownerInfo.displayName}\n**Gamerscore:** ${ownerInfo.gamerScore}`)
        .setThumbnail(ownerInfo.displayPicRaw)
        .setColor(0xffff00);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_link')
            .setLabel('Yes, Link Account')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('cancel_link')
            .setLabel('No, Cancel')
            .setStyle(ButtonStyle.Danger)
        );

      const confirmMsg = await interaction.editReply({
        embeds: [confirmEmbed],
        components: [row],
        ephemeral: true,
      });

      try {
        const confirmation = await confirmMsg.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: 30000,
        });

        if (confirmation.customId === 'confirm_link') {
          users[interaction.user.id] = {
            discordId: interaction.user.id,
            xuid: info.userXUID,
            userHash: info.userHash,
            gamertag: ownerInfo.displayName,
            gamerScore: ownerInfo.gamerScore,
            linkedDate: new Date().toISOString(),
            displayPicRaw: ownerInfo.displayPicRaw,
            coins: 200,
            messageCount: 0,
            ownedSkins: [],
            premium: {
              enabled: false,
              expiresAt: null,
              addedBy: null,
              addedAt: null,
            },
            accessToken: info.XSTSToken,
          };

          fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
          await CoinNotifier.notifyCoins(interaction, 200, 'Account Linked Bonus');

          const successEmbed = new EmbedBuilder()
            .setTitle('Authentication Success')
            .setDescription(`Successfully linked your account:\n**Gamertag:** ${ownerInfo.displayName}\n`)
            .setThumbnail(ownerInfo.displayPicRaw)
            .setColor(0x00ff00);

          await confirmation.update({ embeds: [successEmbed], components: [] });
        } else {
          fs.rmdirSync(userDir, { recursive: true });
          const cancelEmbed = new EmbedBuilder()
            .setTitle('Link Cancelled')
            .setDescription('Account linking was cancelled.')
            .setColor(0xff0000);

          await confirmation.update({ embeds: [cancelEmbed], components: [] });
        }
      } catch (e) {
        fs.rmdirSync(userDir, { recursive: true });
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('Link Timeout')
          .setDescription('Account linking timed out. Please try again.')
          .setColor(0xff0000);

        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
      }
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('Authentication Process')
        .setDescription('The authentication process has failed. Please try again.')
        .setFooter({
          text: 'Please sign in to Minecraft with the Microsoft account you want to connect to the bot.',
        })
        .setColor(0xff0000);

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    }
  },
};
