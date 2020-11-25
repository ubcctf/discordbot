- verifies that users have access to a `ubc.ca` email address
- Nodejs app, built with [discordjs](https://github.com/discordjs/discord.js).
- runs in docker
- see [build.sh](build.sh) and [run.sh](run.sh) for recommendations on building and running

### Configuration files
- in order to run the app, you need to pass in certain configuration options
- the discord bot needs the unique identifiers of certain objects in our discord server
- when testing the bot in another test server, a different set of UUIDs need to be provided.
- I haven't pushed these files yet, will do later


### Credentials
This bot requires two sets of credentials:

1. Gmail account used to send emails
2. Discord authentication

Filip is the only person with these credential files.
