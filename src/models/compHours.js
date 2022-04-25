const mongoose = require("mongoose")
const Schema = mongoose.Schema
const reqNum = {
    type: Number,
    required: true
}
const reqStr = {
    type: String,
    required: true
}

const hoursSchema = new Schema({
    user: reqStr,
    username: reqStr,
    hours: reqNum,
    last: [ reqNum ],
})

const Hours = mongoose.model("hours", hoursSchema)
module.exports = Hours