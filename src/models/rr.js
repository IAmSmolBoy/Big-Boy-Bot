const mongoose = require("mongoose")
const Schema = mongoose.Schema
const reqStr = {
    type: String,
    required: true
}

const ReactRoleSchema = new Schema({
    guild: reqStr,
    channel: reqStr,
    msgId: reqStr,
    roles: [{
        role: reqStr,
        emoji: reqStr
    }]

})

const ReactRole = mongoose.model("ReactRole", ReactRoleSchema)
module.exports = ReactRole