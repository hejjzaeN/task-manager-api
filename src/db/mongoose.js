const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_CONNECT_URL, {
    useNewUrlParser: true
})