import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app.js'

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const response = await request(app).get('/api/health')
    
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
  })

  it('returns a valid timestamp', async () => {
    const response = await request(app).get('/api/health')
    
    expect(response.body.timestamp).toBeDefined()
    const timestamp = new Date(response.body.timestamp)
    expect(timestamp.getTime()).not.toBeNaN()
  })

  it('returns service name', async () => {
    const response = await request(app).get('/api/health')
    
    expect(response.body.service).toBe('StewardChMS API')
  })
})

