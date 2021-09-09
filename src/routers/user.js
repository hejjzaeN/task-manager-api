const express = require('express')
const User = require('../models/user')
const router = new express.Router()
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')

router.post('/users', async (req, res) => {    
    try {
        const user = new User(req.body)
        const token = await user.generateAuthToken()
        await user.save()
        res.status(201).send({ user, token })
    } catch (err) {
        res.status(400).send(err)
    }
})

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (err) {
        res.status(400).send()
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter(token => token.token !== req.token)
        await req.user.save()
        res.send()
    } catch (err) {
        res.status(500).send()
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (err) {
        res.status(500).send()
    }
})

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})

router.patch('/users/me', auth, async (req, res) => {
    const update = Object.keys(req.body)
    const allowedFields = ['name', 'email', 'password', 'age']
    const isValid = update.every(item => allowedFields.includes(item))

    if (!isValid) res.status(400).send('Invalid parameters')
    try {
        update.forEach(update => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (err) {
        return res.status(500).send()
    }
})

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove()
        res.send(req.user)
    } catch (err) {
        res.status(500).send()
    }
})

const upload = multer({
    limits: {
        fileSize: 1_000_000
    },
    fileFilter (req, file, cb) {
        if (!file.originalname.match(/.*\.(gif|jpe?g|bmp|png)$/igm)) {
            return cb(new Error('Must be an image'))
        }
        cb(undefined, true)
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 100, height: 100 }).png().toBuffer()

    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

router.delete('/users/me/avatar', auth, async (req, res) => {
    try {
        req.user.avatar = undefined
        await req.user.save()
        res.send()
    } catch (err) {
        return res.status(500).send(`Error: ${err}`)
    }
})

router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user || !user.avatar) {
            throw new Error('')
        }
        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (err) {
        res.status(500).send(`Error: ${err}`)
    }
})

module.exports = router