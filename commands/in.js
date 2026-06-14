import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { parseRelativeTime } from '../utils/dateParser.js';
import { getUserTimezone } from '../utils/timezone.js';
import { formatDiscordTimestamp } from '../utils/timestamp.js';

export const data = new SlashCommandBuilder()
  .setName('in')
  .setDescription('Generate a Discord timestamp for a time from now')
  .addStringOption(option =>
    option
      .setName('time')
      .setDescription('Time from now (e.g., "5 hours", "30 minutes", "2 days and 3 hours")')
      .setRequired(true)
  );

export async function execute(interaction) {
  const timeInput = interaction.options.getString('time');
  
  try {
    const result = parseRelativeTime(timeInput);
    
    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.error}`,
        ephemeral: true,
      });
    }

    const timestamp = result.timestamp;
    const unixTime = Math.floor(timestamp / 1000);
    
    const discordTimestamp = formatDiscordTimestamp(unixTime);
    
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Discord Timestamp Generated')
      .setDescription(`**Time from now:** \`${timeInput}\`\n\n**Discord Timestamp:**\n\`\`\`${discordTimestamp}\`\`\`\n\nClick the button below to copy, or manually copy from above.`)
      .addFields(
        { name: 'Preview', value: `This will display as: <t:${unixTime}:f>` },
        { name: 'Markdown', value: `Copy this into your message: \`<t:${unixTime}:f>\`` }
      )
      .setFooter({ text: 'Calculated from current time' });
    
    return interaction.reply({ embeds: [embed], ephemeral: false });
  } catch (error) {
    console.error('Error parsing relative time:', error);
    return interaction.reply({
      content: `❌ Could not parse time. Please use a format like: "5 hours", "30 minutes", "2 days", "1 week and 3 days"`,
      ephemeral: true,
    });
  }
}
