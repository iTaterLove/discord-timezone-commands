import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { parseDateTime } from '../utils/dateParser.js';
import { getUserTimezone } from '../utils/timezone.js';
import { formatDiscordTimestamp } from '../utils/timestamp.js';

export const data = new SlashCommandBuilder()
  .setName('at')
  .setDescription('Generate a Discord timestamp for a specific time')
  .addStringOption(option =>
    option
      .setName('time')
      .setDescription('Time to convert (e.g., "2026-06-14 7:42 AM", "tomorrow at 3pm", "Friday 9:00 EST")')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('timezone')
      .setDescription('Optional timezone override (e.g., EST, PST, UTC)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const timeInput = interaction.options.getString('time');
  const tzOverride = interaction.options.getString('timezone');
  
  const userTimezone = tzOverride?.toUpperCase() || getUserTimezone(interaction.user.id);
  
  try {
    const result = parseDateTime(timeInput, userTimezone);
    
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
      .setDescription(`**Your Input:** \`${timeInput}\`\n**Timezone:** \`${userTimezone}\`\n\n**Discord Timestamp:**\n\`\`\`${discordTimestamp}\`\`\`\n\nClick the button below to copy, or manually copy from above.`)
      .addFields(
        { name: 'Preview', value: `This will display as: <t:${unixTime}:f>` },
        { name: 'Markdown', value: `Copy this into your message: \`<t:${unixTime}:f>\`` }
      )
      .setFooter({ text: 'Timezone: ' + userTimezone });
    
    return interaction.reply({ embeds: [embed], ephemeral: false });
  } catch (error) {
    console.error('Error parsing time:', error);
    return interaction.reply({
      content: `❌ Could not parse time. Please try a different format.\nExamples: "2026-06-14 7:42 AM", "tomorrow at 3pm", "Friday 9:00 EST"`,
      ephemeral: true,
    });
  }
}
