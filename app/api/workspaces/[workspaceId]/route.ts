import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/workspaces/:workspaceId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId } = await params

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { userId: user.userId } }
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      _count: { select: { documents: true } }
    }
  })

  if (!workspace) {
    return NextResponse.json(
      { error: 'Workspace not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ workspace })
}

// export async function DELETE(
//   req: NextRequest,
//   context: any
// ) {
//   console.log("CONTEXT:", context)

//   const params = await context.params
//   console.log("PARAMS:", params)

//   return NextResponse.json({ params })
// }

// DELETE /api/workspaces/:workspaceId

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId } = await params

  console.log("USER: ", user);
  console.log("workspaceId: ", workspaceId)
  

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: user.userId }
  })

  if (!workspace) {
    return NextResponse.json(
      { error: 'Workspace not found or you are not the owner' },
      { status: 403 }
    )
  }

  await prisma.workspace.delete({ where: { id: workspaceId } })

  return NextResponse.json({ message: 'Workspace deleted' })
}
