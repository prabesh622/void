const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get current weather for any city')
    .addStringOption(o => o.setName('city').setDescription('City name').setRequired(true))
    .addStringOption(o => o.setName('unit').setDescription('Temperature unit').setRequired(false)
      .addChoices({ name: 'Celsius', value: 'C' }, { name: 'Fahrenheit', value: 'F' })),

  async execute(interaction) {
    const city = interaction.options.getString('city');
    const unit = interaction.options.getString('unit') || 'C';

    await interaction.deferReply();

    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error('City not found');
      const data = await res.json();

      const current = data.current_condition?.[0];
      if (!current) throw new Error('No weather data');

      const temp = unit === 'F' ? `${current.temp_F}°F` : `${current.temp_C}°C`;
      const feelsLike = unit === 'F' ? `${current.FeelsLikeF}°F` : `${current.FeelsLikeC}°C`;
      const windSpeed = unit === 'F' ? `${current.windspeedMiles} mph` : `${current.windspeedKmph} km/h`;

      const weatherEmojis = {
        'Sunny': '☀️', 'Clear': '🌙', 'Partly cloudy': '⛅', 'Cloudy': '☁️',
        'Overcast': '🌥️', 'Mist': '🌫️', 'Fog': '🌫️',
        'Light rain': '🌦️', 'Moderate rain': '🌧️', 'Heavy rain': '🌧️',
        'Light snow': '🌨️', 'Moderate snow': '❄️', 'Heavy snow': '❄️',
        'Thunderstorm': '⛈️', 'Drizzle': '🌦️',
      };

      const desc = current.weatherDesc?.[0]?.value || 'Unknown';
      const emoji = weatherEmojis[desc] || '🌤️';

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`${emoji} Weather - ${city}`)
        .setDescription(`**${desc}**\n\n🌡️ **Temperature:** ${temp} (Feels like ${feelsLike})\n💧 **Humidity:** ${current.humidity}%\n💨 **Wind:** ${windSpeed}\n👁️ **Visibility:** ${current.visibility} km\n☁️ **Cloud Cover:** ${current.cloudcover}%\n🌧️ **Precipitation:** ${current.precipMM} mm`)
        .setFooter({ text: `Data from wttr.in • ${unit === 'C' ? 'Celsius' : 'Fahrenheit'}` })
        .setTimestamp();

      // Add forecast if available
      const forecast = data.weather;
      if (forecast && forecast.length > 0) {
        const forecastText = forecast.slice(0, 3).map(day => {
          const maxT = unit === 'F' ? `${day.maxtempF}°F` : `${day.maxtempC}°C`;
          const minT = unit === 'F' ? `${day.mintempF}°F` : `${day.mintempC}°C`;
          const dayDesc = day.hourly?.[4]?.weatherDesc?.[0]?.value || '';
          const dayEmoji = weatherEmojis[dayDesc] || '🌤️';
          return `${dayEmoji} **${day.date}:** ${minT} - ${maxT}`;
        }).join('\n');

        embed.addFields({ name: '📅 3-Day Forecast', value: forecastText });
      }

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Weather] Error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription(`Could not get weather for **${city}**. Please check the city name and try again.`)] });
    }
  }
};
