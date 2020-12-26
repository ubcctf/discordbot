This is the source code for the UBC CTF team's Discord bot.

It currently has 2 primary functions:

1. Verifies that users have ownership of a valid UBC email address
2. Collects the information provided by new users on how they heard about our club, in order to assist the club's management team with outreach planning

The bot runs on Nodejs and uses [discordjs](https://github.com/discordjs/discord.js) to interact with Discord's API.

### Contributing

The bot depends on a configuration file that's not in version control. This file contains credentials and server specific configurations. Likely you'll want to use your own set of configuration parameters, tailored to your dev setup. Get in touch with Filip so he can help you get up and running quickly.

See [build.sh](build.sh) and [run.sh](run.sh) for recommendations on building and running.
