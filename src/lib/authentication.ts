import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// const SALT = {
//   saltRounds: parseInt(process.env.SALT_ROUNDS) || 12
// }
const JWT = {
  jwt: process.env.JWT_SECRET || '12345-67890-09876-54321',
  jwtExp: '5d', //5 days
}

export const checkPassword = (passwordInput, passwordHash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(passwordInput, passwordHash, (err, result) => {
      if (err) {
        reject(err)
      }
      resolve(result)
    })
  })
}

export const hashPassword = (password: string) => {
  return new Promise((resolve, reject) => {

    bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS), (err, salt) => {
      if (err) {
        reject(err)
      }
      
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          reject(err)
        }
        resolve(hash)
      })
      });
  })
}

export const newToken = (user) => {
  return jwt.sign({ id: user._id }, JWT.jwt, {
    expiresIn: JWT.jwtExp,
  })
}

export const verifyToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, JWT.jwt, (err, payload) => {
      if (err) return reject(err)
      resolve(payload)
    })
  })