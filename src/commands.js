const Task = require("./models/task"), compHours = require("./models/compHours"), rr = require("./models/rr")
const { MessageEmbed, MessageCollector } = require('discord.js');
var prefix = "$"

function clear(msg, args, format) {
    if (args.length != 1 || isNaN(args[0])) return msg.channel.send("Invalid arguments. Format: " + format)
    else if (args >= 100) return msg.channel.send("The limit is 99")
    // else if (!msg.member.permissions.has('ADMINISTRATOR')) return msg.channel.send("Too bad. U need admin to delete :(")
    else {
        msg.channel
            .bulkDelete(parseInt(args[0]) + 1)
            .catch(err => {
                console.log(err)
                return msg.channel.send("Oh god, what is happ_ **explosion**\nU cannot delete messages that are more than 14 days old.")
            })
    }
}

async function addDeadline(msg, args, format) {
    var date, time, role, today = new Date(), channel = msg.mentions.channels.first() || msg.channel, guild = msg.guild.id
    channel = channel.id

    function twoDigits(str) {
        const converted = `${str}`
        if (converted.length === 1) return "0" + converted
        else return converted
    }

    if (args.length > 1 && args.length < 5) {
        var timeIdx = 0
        if (args[0].split("/").length === 1 && args[0].split(":").length === 3) {
                date = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map(twoDigits)
        }
        else if (args[0].split("/").length === 3  && args[1].split(":").length === 3) {
                date = args[0].split("/").reverse().map(twoDigits)
                timeIdx++
        }
        time = args[timeIdx].split(":").map(twoDigits)
        for (arg in args) {
            if (args[arg].includes("@")) {
                role = args[arg]
                break
            }
        }
    }
    const taskInfo = [date, time, role, channel]
    if (taskInfo.includes(undefined) || taskInfo.includes(null)) return msg.channel.send("Invalid arguments. Format: " + format)

    const formatted = `${date.join("-")}T${time.join(":")}`
    msg.channel.send("Please send the reminder you would like to schedule")
    const collector = new MessageCollector(msg.channel), reminderModifiers = [{day: 5}, {day: 1}, {hour: 5}, {hour: 0}]
    collector.on("collect", async (msgCollected) => {
        if (msgCollected.author.id === msg.author.id) {
            reminderModifiers.forEach(async (e, i) => {
                var dateTime = new Date(formatted), msgContent,  today = new Date()
                today.setHours(today.getHours() + 8)
                for (const [ mod, modVal ] of Object.entries(e)) {
                    switch (mod) {
                        case "day":
                            dateTime.setDate(dateTime.getDate() - modVal)
                            break;
                        case "hour":
                            dateTime.setHours(dateTime.getHours() - modVal)
                            break;
                    }
                    if (modVal !== 0) msgContent = `${modVal} more ${mod}(s) to ${msgCollected.content} at ${args[0]} ${args[1]}. Good Luck!`
                    else msgContent = msgCollected.content
                }
                if (today <= dateTime && today.getTime() <= dateTime.getTime()) {
                    const task = new Task({ dateTime, msgContent, role, channel, guild })
                    await task.save()
                    msg.channel.send(`You will be reminded of ${msgCollected.content} at ${dateTime.toLocaleString()}. Good Luck!`)
                }
            })
            collector.stop()
        }
    })
}

async function addHours(msg, args, format) {
    if (args.length !== 1 || isNaN(args[0])) return msg.channel.send("Invalid arguments. Format: " + format)
    var newUser;
    const mongoQuery = { user: msg.author.id }, options = { new: true }, user = await compHours.findOne({ user: msg.author.id })
    if (!user) {
        newUser = new compHours({ user: msg.author.id, username: msg.author.username, hours: parseFloat(args[0]), last: [ parseFloat(args[0]) ]})
        await newUser.save()
    }
    else {
        const addOrder = user.last
        addOrder.push(parseFloat(args[0]))
        newUser = await compHours.findOneAndUpdate(mongoQuery, { hours: user.hours + parseFloat(args[0]), last: addOrder}, options)
    }
    return msg.channel.send(`You now have ${newUser.hours.toFixed(2)} hour(s).`
    )
}

async function viewHours(msg, args, format) {
    if (args.length !== 0) return msg.channel.send("Invalid arguments. Format: " + format)
    const user = await compHours.findOne({ user: msg.author.id })
    if (!user) return msg.channel.send("0")
    return msg.channel.send(`You have ${user.hours} hours.`)
}

async function deleteHours(msg, args, format) {
    if (args.length !== 0) return msg.channel.send("Invalid arguments. Format: " + format)
    const user = await compHours.findOne({ user: msg.author.id })
    var hours = 0, deletedHour;
    if (user) {
        deletedHour = user.last[user.last.length - 1]
        if (user.last.length === 1) await compHours.deleteOne({ user: msg.author.id })
        else {
            hours = user.hours - deletedHour
            await compHours.findOneAndUpdate({ user: msg.author.id }, { hours: hours, last: user.last.slice(0, user.last.length - 1) })
        }
    }
    else return msg.channel.send("Nothing to delete")
    return msg.channel.send(`${deletedHour} hours have been removed. You now have ${hours} hour(s).`)
}

async function viewLeaderboard(msg, args, format) {
    const compPpl = await compHours.find()
    const compList = compPpl.map(ppl => ppl.hours), compHoursList = compPpl.map(ppl => ppl.hours), compNamesList = compPpl.slice()
    compList.sort((x, y) => x - y).reverse()
    const leaderboard = [1], leaderboardNames = []
    for (var i = 1; i < compList.length; i++) {
        if (compList[i] !== compList[i - 1]) rank = i + 1
        leaderboard.push(rank)
    }
    for (i in compPpl) {
        const personIndex = compHoursList.indexOf(compList[i])
        leaderboardNames.push(compNamesList[personIndex])
        compHoursList.splice(personIndex, 1)
        compNamesList.splice(personIndex, 1)
    }
    var leaderboardEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle("Leaderboard")
    for (i in compList) leaderboardEmbed.addField(`${leaderboard[i]}. ${leaderboardNames[i].username}`, `hrs: ${leaderboardNames[i].hours}`)
    return msg.channel.send({ embeds: [leaderboardEmbed] })
}

async function addRRMsg(msg, args, format) {
    if (!msg.member.permissions.has('ADMINISTRATOR')) return msg.channel.send("This command is only for admins.")
    var channel = msg.mentions.channels.first() || msg.channel, msgId;
    const guild = msg.guild.id
    msg.channel.send("Please send the message you would like to send")
    const collector = new MessageCollector(msg.channel)
    collector.on("collect", async (msgCollected) => {
        if (msgCollected.author.id === msg.author.id) {
            clear(msg, [2], "")
            const newMsg = await channel.send(msgCollected)
            msgId = newMsg.id
            channel = channel.id
            const rrMsg = new rr({ guild, channel, msgId, roles: [] })
            await rrMsg.save()
            collector.stop()
        }
    })
}

async function addRoles(msg, args, format) {
    if (!msg.member.permissions.has('ADMINISTRATOR')) return msg.channel.send("This command is only for admins.")
    if (args.length < 2 || args.length > 4 || msg.mentions.roles.size < 1) return msg.channel.send("Invalid arguments. Format: " + format)
    var channel = msg.mentions.channels.first() || msg.channel, msgId = msg.reference.messageId, emoji;
    if (msg.content.split(":").length === 3) emoji = msg.content.split(":")[1]
    else emoji =  args[0]
    if (!msg.reference) return msg.channel.send("You are required to reply to the message that you want to add the react role to")
    const role = msg.mentions.roles.first().id, { roles } = await rr.findOne({ msgId })
    for (e of roles) if (e.emoji === emoji) return msg.channel.send("The emoji is already in use")
    roles.push({ emoji, role })
    await rr.findOneAndUpdate({ msgId }, { roles })
    const reactMsg = await channel.messages.fetch(msgId)
    reactMsg.edit(reactMsg.content + `\n${args[0]} : ${args[1]}`)
    reactMsg.react(args[0])
    clear(msg, [0], "")
}

module.exports = {
    clear, addDeadline, addHours, viewHours, deleteHours, viewLeaderboard,
    addRRMsg, addRoles
    
}