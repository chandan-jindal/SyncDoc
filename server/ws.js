import { WebSocketServer, WebSocket } from 'ws'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness.js'
import * as syncProtocol from 'y-protocols/sync.js'
import * as encoding from 'lib0/encoding.js'
import * as decoding from 'lib0/decoding.js'
import http from 'http'
import pg from 'pg'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const PORT = 3001
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

function debounce(fn, delay) {
  const timers = new Map()
  return (key, ...args) => {
    if (timers.has(key)) clearTimeout(timers.get(key))
    timers.set(key, setTimeout(() => {
      fn(key, ...args)
      timers.delete(key)
    }, delay))
  }
}

async function loadDocument(docId) {
  const result = await pool.query(
    'SELECT state FROM "YjsDocument" WHERE "documentId" = $1',
    [docId]
  )
  return result.rows[0]?.state ?? null
}

async function saveDocument(docId, ydoc) {
  const doc = await pool.query(
    'SELECT id FROM "Document" WHERE id = $1',
    [docId]
  )

  if (doc.rows.length === 0) {
    console.log(`Skipping save — doc ${docId} not in database`)
    return
  }

  const state = Buffer.from(Y.encodeStateAsUpdate(ydoc))

  await pool.query(
    `INSERT INTO "YjsDocument" ("id", "documentId", "state", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, NOW())
     ON CONFLICT ("documentId")
     DO UPDATE SET state = $2, "updatedAt" = NOW()`,
    [docId, state]
  )

  // use a temp doc to decode the binary state into readable XML
  const tempDoc = new Y.Doc()
  Y.applyUpdate(tempDoc, state)
  const xmlContent = tempDoc.getXmlFragment('default').toJSON()
  tempDoc.destroy()

  await pool.query(
    `INSERT INTO "DocumentVersion" ("id", "documentId", "content", "authorId", "createdAt")
     SELECT gen_random_uuid(), $1, $2, "creatorId", NOW()
     FROM "Document" WHERE id = $1`,
    [docId, xmlContent]
  )

  await pool.query(
    `UPDATE "Document" SET "updatedAt" = NOW(), "content" = $2 WHERE id = $1`,
    [docId, xmlContent]
  )

  console.log(`Saved doc ${docId} to Postgres`)
}

const debouncedSave = debounce(saveDocument, 2000)

const documents = new Map()

async function getDocument(docId) {
  if (!documents.has(docId)) {
    const ydoc = new Y.Doc()

    const savedState = await loadDocument(docId)
    if (savedState) {
      Y.applyUpdate(ydoc, savedState)
      console.log(`Restored doc ${docId} from Postgres`)
    }

    ydoc.on('update', () => {
      debouncedSave(docId, ydoc)
    })

    const awareness = new awarenessProtocol.Awareness(ydoc)

    awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = [...added, ...updated, ...removed]
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      )
      const message = encoding.toUint8Array(encoder)

      const { clients } = documents.get(docId)
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    })

    documents.set(docId, { ydoc, awareness, clients: new Set() })
  }

  return documents.get(docId)
}

const server = http.createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const docId = url.pathname.split('/doc/')[1]
  const token = url.searchParams.get('token')

  console.log('docId:', docId)
  console.log('token:', token ? 'present' : 'missing')

  if (!docId) { ws.close(); return }

  const user = verifyToken(token)
  if (!user) {
    console.log('Unauthorized connection rejected')
    ws.close(1008, 'Unauthorized')
    return
  }

  const { ydoc, awareness, clients } = await getDocument(docId)
  clients.add(ws)

  console.log(`Client connected to doc: ${docId} | Total: ${clients.size}`)

  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, MESSAGE_SYNC)
  syncProtocol.writeSyncStep1(encoder, ydoc)
  ws.send(encoding.toUint8Array(encoder))

  const awarenessStates = awareness.getStates()
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awarenessStates.keys())
      )
    )
    ws.send(encoding.toUint8Array(awarenessEncoder))
  }

  ws.on('message', (message) => {
    const decoder = decoding.createDecoder(new Uint8Array(message))
    const messageType = decoding.readVarUint(decoder)

    if (messageType === MESSAGE_SYNC) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_SYNC)
      syncProtocol.readSyncMessage(decoder, encoder, ydoc, null)

      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder))
      }

      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        decoding.readVarUint8Array(decoder),
        ws
      )
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`Client disconnected from doc: ${docId} | Total: ${clients.size}`)

    awarenessProtocol.removeAwarenessStates(
      awareness,
      [ydoc.clientID],
      'disconnect'
    )

    if (clients.size === 0) {
      setTimeout(() => {
        if (documents.get(docId)?.clients.size === 0) {
          documents.delete(docId)
          console.log(`Cleaned up doc from memory: ${docId}`)
        }
      }, 30000)
    }
  })

  ws.on('error', (err) => {
    console.error(`WebSocket error on doc ${docId}:`, err)
    clients.delete(ws)
  })
})

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`)
})