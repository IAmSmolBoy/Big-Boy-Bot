const mongoose = require("mongoose")
const Schema = mongoose.Schema
const reqStr = {
    type: String,
    required: true
}
const reqNum = {
    type: Number,
    required: true
}

const reminderSchema = new Schema({
    day: reqNum,
    time: {
        type: [
            reqNum,
            reqNum,
            reqNum
        ]
    },
    activity: reqStr,
    role: {
        type: String,
    },
    channel: reqStr,
    guild: reqStr,
})
const Reminder = mongoose.model("reminders", reminderSchema)
module.exports = Reminder