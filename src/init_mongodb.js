const mongoose = require("mongoose")
require("dotenv").config()

mongoose.connect(process.env.MongoDB_URI)
.then(() => {
    console.log("mongodb connection successful")
})
.catch((err) => console.log(err))

mongoose.connection.on("error", (err) => {
    console.log(err)
})

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected")
})

process.on("SIGINT", async () => {
    await mongoose.connection.close()
    process.exit(0)
})