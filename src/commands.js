const Task = require("./models/task"), compHours = require("./models/compHours"), rr = require("./models/rr"), Reminder = require("./models/reminder")
const { MessageEmbed, MessageCollector } = require('discord.js');
var prefix = "."

function clear(msg, args, format) {
    if (args.length != 1 || isNaN(args[0])) return msg.channel.send("Invalid arguments. Format: " + format)
    else if (args === "all") while (true) msg.channel.bulkDelete(99).catch(err => msg.channel.send("That's as much as I cna delete, good luck with the rest"))
    // else if (!msg.member.permissions.has('ADMINISTRATOR')) return msg.channel.send("Too bad. U need admin to delete :(")
    else {
        const catchFunc = (err) => msg.channel.send("Oh god, what is happ_ **explosion**\nU cannot delete messages that are more than 14 days old.", err),
        msgIterations =  Math.floor(parseInt(args[0]) / 100)
        for (i = 0; i < msgIterations; i++) msg.channel.bulkDelete(99).catch(catchFunc)
        msg.channel.bulkDelete((parseInt(args[0]) + 1) % 100 + msgIterations).catch(catchFunc)
    }
}

async function addDeadline(msg, args, format) {
    var date, time, role, today = new Date(), channel = msg.mentions.channels.first() || msg.channel, guild = msg.guild.id
    channel = channel.id
    const twoDigits = (str) => `${str}`.length === 1 ? "0" + `${str}` : `${str}`

    if (args.length > 0 && args.length < 5) {
        var timeIdx = 0
        if (args[0].split("/").length === 1 && args[0].split(":").length === 3) {
                date = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map(twoDigits)
        }
        else if (args[0].split("/").length === 3  && args[1].split(":").length === 3) {
                date = args[0].split("/").reverse().map(twoDigits)
                timeIdx++
        }
        time = args[timeIdx].split(":").map(twoDigits)
        for (const arg in args) {
            if (args[arg].includes("@")) {
                role = args[arg]
                break
            }
        }
    }
    const taskInfo = [ date, time, channel ]
    if (taskInfo.includes(undefined) || taskInfo.includes(null)) return msg.channel.send("Invalid arguments. Format: " + format)
    const formatted = `${date.join("-")}T${time.join(":")}`

    msg.channel.send("Send the reminder timings. Format: <number> <units> Example: 1 day, 2 day, 5 hour (Units: month, week, day, or hour)")
    const modCollector = new MessageCollector(msg.channel), modTypes = [ "month", "week", "day", "hour", "months", "weeks", "days", "hours" ]

    modCollector.on("collect", async (msgCollected) => {
        if (msgCollected.author.id === msg.author.id) {
            const mods = msgCollected.content.split(",").map(mod => mod.split(" ").filter((e) => e !== ""))
            // console.log(mods)

            if (!mods.every((e) => {
                for (const type of modTypes) switch(e.length) {
                    case 1:
                        if (e[0].includes(type) && !isNaN(e[0].slice(0, e[0].length - type.length))) return true
                        break
                    case 2:
                        if (!isNaN(e[0]) && e.includes(type)) return true
                        break
                }
                return false
            })) return msg.channel.send("Wrong format. Try again. Format: <number> <units> Example: 1 day, 2 day, 5 hour (Units: month, week, day, or hour)")
            else {
                const modsFormatted = mods.map(e => {
                    for (const type of modTypes) {
                        switch(e.length) {
                            case 1:
                                const modVal = parseInt(e[0].slice(0, e[0].length - type.length))
                                if (e[0].includes(type)) return type[type.length - 1] === "s" ? [ modVal, type.slice(0, type.length - 1) ] : [ modVal, type ]
                                break
                            case 2:
                                if (e[1][e[1].length - 1] === "s") return [ parseInt(e[0]), e[1].slice(0, e[1].length - 1) ]
                                break
                        }
                    }
                    return [ parseInt(e[0]), e[1] ]
                })
                modCollector.stop()
                msg.channel.send("Please send the reminder you would like to schedule")
                const msgCollector = new MessageCollector(msg.channel)
                msgCollector.on("collect", async (msgCollected) => {
                    if (msgCollected.author.id === msg.author.id) {
                        modsFormatted.forEach(async (e, i) => {
                            var dateTime = new Date(formatted), msgContent,  today = new Date()
                            today.setHours(today.getHours() + 8)
                            const mod = e[1], modVal = e[0]
                            switch (mod) {
                                case "month":
                                    dateTime.setMonth(dateTime.getMonth() - modVal)
                                    break;
                                case "week":
                                    dateTime.setDate(dateTime.getDate() - modVal * 7)
                                    break;
                                case "day":
                                    dateTime.setDate(dateTime.getDate() - modVal)
                                    break;
                                case "hour":
                                    dateTime.setHours(dateTime.getHours() - modVal)
                                    break;
                            }
                            if (modVal !== 0) msgContent = `${modVal} more ${mod}(s) to ${msgCollected.content} at ${args[0]} ${args[1]}. Good Luck!`
                            else msgContent = msgCollected.content
                            if (today <= dateTime && today.getTime() <= dateTime.getTime()) {
                                const task = new Task({ dateTime, msgContent, role, channel, guild })
                                await task.save()
                                msg.channel.send(`You will be reminded of ${msgCollected.content} at ${dateTime.toLocaleString()}. Good Luck!`)
                            }
                            else msg.channel.send(`${dateTime.toLocaleString()} has already passed`)
                        })
                        msgCollector.stop()
                    }
                })
            }
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
    if (!msg.reference) return msg.channel.send("You need to reply to a message generated from .rrmsg")
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

async function resetComp (msg, args, format) {
    await compHours.deleteMany({})
    return msg.channel.send("Competition reset")
}

async function reminder(msg, args, format) {
    var today = new Date()
    today.setHours(today.getHours() + 8)
    // console.log(today.toLocaleTimeString(), today.getDay())
    const days = [
        [ "sun", "sunday" ],
        [ "mon", "monday" ],
        [ "tue", "tuesday" ],
        [ "wed", "wednesday" ],
        [ "thu", "thurs", "thursday" ],
        [ "fri", "friday" ],
        [ "sat", "saturday" ]
    ]
    var day = today.getDay(), time, role, channel = msg.mentions.channels.first() || msg.channel
    const guild = msg.guild.id
    channel = channel.id
    args.forEach(
        arg => {
            var [ dayCollected, timeCollected, roleCollected ] = Array(3).fill(false)
            days.forEach(
                (dayVal, i) => {
                    if (!dayCollected && 
                        isNaN(arg) && 
                        dayVal.includes(arg.toLowerCase())
                    ) {
                        day = i
                        dayCollected = true
                    }
                }
            )
            if (!timeCollected && 
                arg.split(":").length === 3 && 
                arg.split(":").every(
                    timeVal => timeVal.length > 0 && !isNaN(timeVal) && parseInt(timeVal) < 60
                )
            ) {
                time = arg.split(":").map(
                    timeVal => parseInt(timeVal)
                )
                timeCollected = true
            }
            if (!roleCollected && 
                (arg.startsWith("<@") && 
                arg.endsWith(">")) ||
                arg.startsWith("@")
            ) {
                role = arg
                roleCollected = true
            }
        }
    )
    // console.log(day, time, role)
    if (!((day || day === "0") && time)) return msg.channel.send(`Invalid arguments. Format: ${format}`)
    const collector = new MessageCollector(msg.channel)
    msg.channel.send("Please send your desired reminder message.")
    collector.on("collect",
        async msgCollected => {
            if (msgCollected.author.id === msg.author.id) {
                const remind = new Reminder({ day, time, activity: msgCollected.content, role, channel, guild,  })
                await remind.save()
                msg.channel.send("Reminder saved")
                collector.stop()
            }
        }
    )
    // const remind = new Reminder({ day, time, role })
}

function helpMenu(msg, commandDict, pageNo = 1) {
    var helpMenu = []
    if (isNaN(pageNo)) {
        if (!(pageNo in commandDict)) return msg.channel.send("Command not found")
        else {
            return msg.channel.send(`${pageNo[0].toUpperCase() + pageNo.slice(1) + ":"}
        \tDescription: ${commandDict[pageNo].description}
        \tFormat: ${commandDict[pageNo].format}`)
        }
    }
    if (pageNo !== 1) pageNo = parseInt(pageNo)
    Object.entries(commandDict).forEach(([key, value], i) => {
        if (i >= 6 * (pageNo - 1) && i < 6 * pageNo) {
            helpMenu.push(key[0].toUpperCase() + key.slice(1) + ":")
            helpMenu.push(`\tDescription: ${value["description"]}`)
            helpMenu.push(`\tFormat: ${value["format"]}\n`)
        }
    });
    var helpText = helpMenu.join("\n")
    if (pageNo * 6 < Object.keys(commandDict).length) helpText += `\nUse ${prefix}help ${pageNo + 1} for the next page`
    return msg.channel.send(`**Command Guide Page ${pageNo}**\n` + helpText)
}

// function clearRR(msg, args, format) {

// }

module.exports = {
    clear, addDeadline, addHours, viewHours, deleteHours, viewLeaderboard,
    addRRMsg, addRoles, resetComp, reminder, helpMenu, 
    // clearRR
}