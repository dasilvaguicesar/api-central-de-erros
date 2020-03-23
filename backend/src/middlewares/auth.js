const { User } = require('../models')
const { generateToken, decodeToken } = require('../services/auth')
const { compareHash } = require('../utils/hashing')
const { schemaValidationForAuthenticate } = require('../utils/validators')

module.exports = {

  authenticate: async (req, res) => {
    try {
      if (Object.keys(req.body).length > 2) {
        return res.status(406).json({ message: 'You are input wrong data then necessary' })
      }

      const { body: { email, password } } = req

      const isValid = (await schemaValidationForAuthenticate()).isValid({
        email,
        password
      })

      if (!isValid) {
        return res.status(406).json({ error: 'Data values are not valid' })
      }

      const user = await User.findOne({
        where: { email }
      })

      if (!user) {
        return res.status(400).json({ message: 'User not found' })
      }

      const isValidPassword = await compareHash(password, user.password)
      if (isValidPassword) {
        const token = generateToken({ id: user.id })
        return res.status(200).json({ token })
      } else {
        return res.status(401).json({ message: 'Incorrect password' })
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ error })
    }
  },

  authorize: async (req, res, next) => {
    try {
      const { authorization } = req.headers

      if (!authorization) {
        return res.status(401).json({ error: 'Token not provided' })
      }

      const isValidToken = await decodeToken(authorization)
      if (isValidToken) {
        next()
      }
    } catch (error) {
      res.status(500).json({ error })
    }
  }
}
