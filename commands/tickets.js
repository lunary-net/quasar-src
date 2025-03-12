const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Send a ticket creation embed'),

  async execute(interaction) {
    // Create the embed
    const embed = new EmbedBuilder()
      .setTitle('🎟️ Support Ticket')
      .setDescription('Click the button below to create a support ticket. A private channel will be created for you to communicate with the staff.')
      .setColor('Blue');

    // Create the button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Primary)
      );

    // Send the embed with the button
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
  },
};
