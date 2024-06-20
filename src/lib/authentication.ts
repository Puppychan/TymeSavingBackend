import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { UserRole } from 'src/models/user/interface'
import User from 'src/models/user/model'

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

export const verifyToken = (token): any =>
  new Promise((resolve, reject) => {
    jwt.verify(token, JWT.jwt, (err, payload) => {
      if (err) return reject(err)
      resolve(payload)
    })
  })

export const verifyUser = async (headers: Headers, username?: string) => {
  try {
    const auth = headers.get('Authorization');
    const token = auth?.split(" ")[1];
    if(!auth || !token) 
      return { response: "Unauthorized: Token is required in request header", status: 401 };
  
    const decoded = await verifyToken(token)
    const authuser = await User.findOne({ _id: decoded.id })
    if (!authuser)
      return { response: "Unauthorized: User not found", status: 401 };
  
    if (username)
      if (authuser.role !== UserRole.Admin && authuser.username !== username) {
        return { response: "Forbidden action", status: 403 };
      }
  
    return { response: {...authuser, password: undefined}, status: 200 };  
  }
  catch (err) {
    console.log(err)
    return { response: `Unauthorized: ${err.message}`, status: 401 };
  }
}
export const verifyUserById = async (headers: Headers, id?: string) => {
  try {
    const auth = headers.get('Authorization');
    const token = auth?.split(" ")[1];
    if(!auth || !token) 
      return { response: "Unauthorized: Token is required in request header", status: 401 };
  
    const decoded = await verifyToken(token)
    const authuser = await User.findOne({ _id: decoded.id })
    if (!authuser)
      return { response: "Unauthorized: User not found", status: 401 };
  
    if (id)
      if (authuser.role !== UserRole.Admin && authuser._id.toString() !== id) {
        return { response: "Forbidden action", status: 403 };
      }
  
    return { response: {...authuser, password: undefined}, status: 200 };  
  }
  catch (err) {
    console.log(err)
    return { response: `Unauthorized: ${err.message}`, status: 401 };
  }
}
