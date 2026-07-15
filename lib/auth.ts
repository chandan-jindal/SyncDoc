import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './jwt'

export function getUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]

  try {
    return verifyToken(token)
  } catch {
    return null
  }
}

export function requireUser(req: NextRequest) {
  const user = getUser(req)

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { user, error: null }
}