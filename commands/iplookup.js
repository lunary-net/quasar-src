const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios'); // For making HTTP requests
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('iplookup')
    .setDescription('Look up information about an IP address.')
    .addStringOption(option =>
      option.setName('ip')
        .setDescription('The IP address to look up.')
        .setRequired(true)),

  async execute(interaction) {
    try {

      // Get the IP address from the interaction
      const ip = interaction.options.getString('ip');

      // Fetch data from the IP lookup API
      const response = await axios.get(`http://ip-api.com/json/${ip}`);

      // Check for a valid response
      if (response.data.status !== 'success') {
        return interaction.reply({
          content: `Could not retrieve information for IP: ${ip}`,
          ephemeral: true
        });
      }

      const { country, regionName, city, isp, query } = response.data;

      // Create an embed with the information
      const embed = new EmbedBuilder()
        .setColor('#0078D7')
        .setTitle('IP Lookup Results')
        .addFields(
          { name: 'IP Address', value: query, inline: true },
          { name: 'Country', value: country, inline: true },
          { name: 'Region', value: regionName, inline: true },
          { name: 'City', value: city, inline: true },
          { name: 'ISP', value: isp, inline: true }
        )
        .setFooter({ text: 'Data provided by ip-api.com' });

      // Send the results to the admin
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error fetching IP information:', error);
      await interaction.reply({
        content: 'There was an error retrieving information. Please try again later.',
        ephemeral: true
      });
    }
  },
};
