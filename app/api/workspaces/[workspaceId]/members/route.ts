import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/workspaces/:workspaceId/members - invite a user by email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId } = await params
  const { email, role = 'EDITOR' } = await req.json()

  // check requester is owner or editor
  const requesterMembership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.userId,
        workspaceId
      }
    }
  })

  if (!requesterMembership || requesterMembership.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'You do not have permission to invite members' },
      { status: 403 }
    )
  }

  // find the user being invited
  const invitee = await prisma.user.findUnique({ where: { email } })
  if (!invitee) {
    return NextResponse.json(
      { error: 'No user found with that email' },
      { status: 404 }
    )
  }

  // check they're not already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: invitee.id,
        workspaceId
      }
    }
  })

  if (existing) {
    return NextResponse.json(
      { error: 'User is already a member' },
      { status: 409 }
    )
  }

  const member = await prisma.workspaceMember.create({
    data: { userId: invitee.id, workspaceId, role },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  })

  return NextResponse.json({ member }, { status: 201 })
}