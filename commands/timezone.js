import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserTimezone, setUserTimezone, getAllTimezones } from '../utils/timezone.js';

export const data = new SlashCommandBuilder()
  .setName('timezone')
  .setDescription('Manage your timezone preference')
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Set your timezone')
      .addStringOption(option =>
        option
          .setName('timezone')
          .setDescription('Your timezone (e.g., EST, PST, UTC, Europe/London, Asia/Tokyo)')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('get')
      .setDescription('Get your current timezone')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List available timezones')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'set') {
    const timezone = interaction.options.getString('timezone').toUpperCase();
    
    // Validate timezone
    const validTimezones = getAllTimezones();
    if (!validTimezones.includes(timezone)) {
      return interaction.reply({
        content: `❌ Invalid timezone: \`${timezone}\`\nUse \`/timezone list\` to see available timezones.`,
        ephemeral: true,
      });
    }

    setUserTimezone(interaction.user.id, timezone);
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('✅ Timezone Updated')
      .setDescription(`Your timezone is now set to: \`${timezone}\``)
      .setFooter({ text: `User ID: ${interaction.user.id}` });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'get') {
    const timezone = getUserTimezone(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Your Timezone')
      .setDescription(`Your current timezone: \`${timezone}\`\nSet a different timezone with \`/timezone set\``)
      .setFooter({ text: `User ID: ${interaction.user.id}` });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === 'list') {
    const validTimezones = getAllTimezones();
    const chunk = 50;
    const pages = [];
    
    for (let i = 0; i < validTimezones.length; i += chunk) {
      const timezones = validTimezones.slice(i, i + chunk).join(', ');
      pages.push(timezones);
    }

    const embeds = pages.map((page, index) => 
      new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Available Timezones')
        .setDescription(`\`\`\`${page}\`\`\``)
        .setFooter({ text: `Page ${index + 1} of ${pages.length}` })
    );

    return interaction.reply({ embeds, ephemeral: true });
  }
}
