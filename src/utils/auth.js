const jwt = require('jsonwebtoken')

module.exports = {

  generateToken: (userId) => {
    const token = jwt.sign({ userId }, process.env.SECRET, {
      expiresIn: '1d'
    })
    return token
  },
  
  decodeToken: (token) => {
    try {
      const [bearer, splitToken] = token.split(' ')

      if (!bearer || !splitToken && bearer !== 'Bearer') {
        return { userId: { id: 0 }, iat: 0, exp: 0 }
      }

      return jwt.verify(splitToken, process.env.SECRET)
    } catch (error) {
      return { userId: { id: 0 }, iat: 0, exp: 0 }
    }
  }
}
