const { User } = require('../models')
const { Log } = require('../models')
const { generateHashedPassword, compareHash } = require('../utils/hashing')
const { schemaValidationForUsers, schemaValidationForUpdateUser, updateByItem } = require('../utils/validators')
const { decodeToken } = require('../utils/auth')

module.exports = {

  create: async (req, res) => {
    try {
      const { body: { name, email, password } } = req

      const validation = (await schemaValidationForUsers().isValid({
        name,
        email,
        password
      }))

      if (!validation) {
        return res.status(406).json({ message: 'Invalid data' })
      }

      const existsEmail = await User.findOne({
        where: { email },
        paranoid: false
      })

      if (existsEmail) {
        return res.status(409).json({ message: 'User email already exists' })
      }

      const hashedPassword = await generateHashedPassword(password)

      if (typeof hashedPassword === 'string') {
        await User.create({ name, email, password: hashedPassword })
        return res.status(201).json({ message: 'User created successfully' })
      } else {
        return res.status(406).json({ message: 'Invalid data' })
      }

    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' })
    }
  },

  restore: async (req, res) => {
    try {
      const { locals: { token } } = req
      const { userId: { id } } = decodeToken(token)

      const user = await User.findOne({
        where: {
          id
        },
        paranoid: false
      })

      if (!user) {
        return res.status(204).json({})
      }

      await User.restore({
        where: { id }
      })

      return res.status(200).json({ message: 'User restored successfully' })

    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' })
    }
  },

  update: async (req, res) => {
    try {
      const { body } = req
      const { locals: id } = req

      const dataToBeUpdated = []
      for (const obj in body) {
        if (dataToBeUpdated.indexOf(obj) === -1) {
          dataToBeUpdated.push(obj)
        }
      }

      const validation = (await schemaValidationForUpdateUser().isValid(body))
      if (!validation) {
        return res.status(406).json({ message: 'Invalid data' })
      }

      const user = await User.findOne({
        where: { id }
      })
      
      if (dataToBeUpdated.indexOf('oldPassword') !== -1) {
        const passwordMatch = await compareHash(body.oldPassword, user.password)
        if (!passwordMatch) {
          return res.status(412).json({ message: 'Password does not match' })
        }
        
        const hashedPassword = await generateHashedPassword(body.newPassword)

        if (typeof hashedPassword === 'string') {
          body.password = hashedPassword
        } else {
          return res.status(406).json({ message: 'Invalid data' })
        }
      }

      const { status, message } = await updateByItem(dataToBeUpdated.join(), body, id)
      return res.status(status).json({ message })

    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' })
    }
  },

  delete: async (req, res) => {
    try {
      const { locals: id } = req

      const userExists = await User.findOne({
        where: { id }
      })

      if (!userExists) {
        return res.status(204).json({ message: 'There is no user' })
      }

      await Log.destroy({
        where: { UserId: id }
      })

      await User.destroy({
        where: { id }
      })

      return res.status(200).json({ message: 'Deleted succesfully' })

    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' })
    }
  },

  hardDelete: async (req, res) => {
    try {
      const { locals: id } = req

      const userExists = await User.findOne({
        where: { id },
        paranoid: false
      })

      if (!userExists) {
        return res.status(204).json({ message: 'There is no user' })
      }

      await Log.destroy({
        where: { UserId: id },
        force: true
      })

      await User.destroy({
        where: {
          id
        },
        force: true
      })

      return res.status(200).json({ message: 'Deleted successfully, this action cannot be undone' })
      
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' })
    }
  }
}
