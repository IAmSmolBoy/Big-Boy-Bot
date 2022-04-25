require("./init_mongodb")
require("dotenv").config()

const { Client, Intents } = require("discord.js"), Task = require("./models/task"), rr = require("./models/rr")
const client = new Client({ intents: [Intents.FLAGS.GUILD_MEMBERS, "GUILDS", "GUILD_BANS", "GUILD_EMOJIS_AND_STICKERS", "GUILD_INTEGRATIONS", 
"GUILD_WEBHOOKS", "GUILD_INVITES", "GUILD_VOICE_STATES", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_MESSAGE_TYPING", 
"DIRECT_MESSAGES", "DIRECT_MESSAGE_REACTIONS", "DIRECT_MESSAGE_TYPING", "GUILD_SCHEDULED_EVENTS"], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
const commands = require("./commands")
var prefix = "."
const commandDict = {
    clear: {
        commandFunc: commands.clear, 
        description: "Deletes specified number of messages", 
        format: "$clear <number of messages to delete>"
    },
    addtask: {
        commandFunc: commands.addDeadline,
        description: "Adds a deadline on a specific date and time. The bot will remind you 5 days before, 1 day before and an hour before",
        format: "$addtask <optional: DD/MM/YYYY> <hh:mm:ss> <@role> <optional: #channel>"
    },
    comp: {
        commandFunc: commands.addHours,
        description: "Adds hours to database for studying competition",
        format: "$comp <hours>"
    },
    hrs: {
        commandFunc: commands.viewHours,
        description: "Views the number of hours you have accumulated",
        format: "$hrs"
    },
    delprev: {
        commandFunc: commands.deleteHours,
        description: "Deletes the last input of hours",
        format: "$delprev"
    },
    rrmsg: {
        commandFunc: commands.addRRMsg,
        description: "Adds a reaction role message",
        format: "$rrmsg <optional: channel>"
    },
    rr: {
        commandFunc: commands.addRoles,
        description: "Adds a reaction role to the message",
        format: "$rr <emoji> <role>"
    },
    vl: {
        commandFunc: commands.viewLeaderboard,
        description: "View studying competition leaderboard",
        format: "$vl"
    },
    help: {
        description: "Helps with the bot's commands",
        format: "$help <optional: command name or page no.>"
    }
}

client.on("ready", async () => {
    console.log(`I'm inferior bot. ${client.user.username}`)
    setInterval(async () => {
        const tasks = await Task.find()
        tasks.forEach(async (e) => {
            const SmolBoyServ = await client.guilds.fetch(e.guild)
            const taskChannel = await SmolBoyServ.channels.fetch(e.channel), todayDate = new Date()
            todayDate.setHours(todayDate.getHours() + 8)
            if (todayDate >= e.dateTime && todayDate.getTime() >= e.dateTime.getTime()) {
                taskChannel.send(`${e.role}, ${e.msgContent}`)
                await Task.deleteOne(e)
            }
        })
    }, 10000);
})

client.on("messageReactionAdd", async (reaction, user) => {
    const rrMsgs = await rr.find()
    for (const rrMsg of rrMsgs) {
        const { guild, msgId, roles } = rrMsg
        if (msgId === reaction.message.id && !user.bot) {
            const guildObj = await client.guilds.fetch(guild)
            const userObj = await guildObj.members.fetch(user.id)
            for (const role of roles) if (reaction._emoji.name === role.emoji) userObj.roles.add(role.role)
        }
    }
})

client.on("messageReactionRemove", async (reaction, user) => {
    const rrMsgs = await rr.find()
    for (const rrMsg of rrMsgs) {
        const { guild, msgId, roles } = rrMsg
        if (msgId === reaction.message.id && !user.bot) {
            const guildObj = await client.guilds.fetch(guild)
            const userObj = await guildObj.members.fetch(user.id)
            for (const role of roles) if (reaction._emoji.name === role.emoji) userObj.roles.remove(role.role)
        }
    }
})

client.on("messageCreate", (msg) => {
    if (!msg.author.bot && msg.content.startsWith(prefix)) {
        const [cmd, ...args] = msg.content.toLowerCase()
            .substring(prefix.length)
            .split(/\s+/)
        if (cmd === "help") {
            switch (args.length) {
                case 0:
                    commands.helpMenu(msg, commandDict)
                    break;
                case 1:
                    commands.helpMenu(msg, commandDict, args[0])
                    break;
                default:
                    return msg.channel.send("Invalid arguments. Format: " + commandDict.help.format)
            }
        }
        else if (cmd in commandDict) commandDict[cmd].commandFunc(msg, args, commandDict[cmd].format)
    }
})

client.login(process.env.discordBotToken)
