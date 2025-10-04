import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.DB_PATH = ':memory:'

const { app } = await import('../index.js')
const { db } = await import('../db.js')

function resetDatabase() {
  db.exec(`
    DELETE FROM audit_log;
    DELETE FROM claims;
    DELETE FROM completions;
    DELETE FROM instances;
    DELETE FROM templates;
    DELETE FROM inventories;
    DELETE FROM users;
    DELETE FROM settings;
  `)
}

describe('QuestBoard server', () => {
  beforeEach(() => {
    resetDatabase()
  })

  it('allows bootstrapping the first user without a PIN', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        id: 'ava',
        name: 'Ava',
        color: '#fff',
        avatarEmoji: '🛡️',
        joinDate: new Date().toISOString(),
      })
      .expect(201)

    expect(response.body).toMatchObject({ id: 'ava', name: 'Ava' })

    const list = await request(app).get('/api/users').expect(200)
    expect(list.body).toHaveLength(1)
  })

  it('requires a household PIN once users exist', async () => {
    await request(app)
      .post('/api/users')
      .send({
        id: 'ava',
        name: 'Ava',
        color: '#fff',
        avatarEmoji: '🛡️',
        joinDate: new Date().toISOString(),
        pin: '1234',
      })
      .expect(201)

    await request(app).post('/api/users').send({ id: 'milo', name: 'Milo', color: '#000', avatarEmoji: '🗡️', joinDate: new Date().toISOString() }).expect(401)

    const response = await request(app)
      .post('/api/users')
      .set('x-household-pin', '1234')
      .send({
        id: 'nova',
        name: 'Nova',
        color: '#f0f',
        avatarEmoji: '🧙',
        joinDate: new Date().toISOString(),
      })
      .expect(201)

    expect(response.body).toMatchObject({ id: 'nova' })
  })

  it('supports template creation and feed generation', async () => {
    await request(app)
      .post('/api/users')
      .send({
        id: 'ava',
        name: 'Ava',
        color: '#fff',
        avatarEmoji: '🛡️',
        joinDate: new Date().toISOString(),
        pin: '1234',
      })
      .expect(201)

    const template = {
      id: 'dishes-daily',
      title: 'Wash dishes',
      flavorText: 'Scrub the plates',
      difficulty: 'easy',
      points: 5,
      recurrence: 'daily',
      active: true,
      tags: ['kitchen'],
      createdBy: 'ava',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await request(app).put(`/api/templates/${template.id}`).set('x-household-pin', '1234').send(template).expect(200)

    const feed = await request(app).get('/api/instances/feed').set('x-household-pin', '1234').expect(200)

    expect(feed.body[0]).toMatchObject({ template: { id: template.id } })
  })

  it('prevents conflicting claims', async () => {
    await request(app)
      .post('/api/users')
      .send({
        id: 'ava',
        name: 'Ava',
        color: '#fff',
        avatarEmoji: '🛡️',
        joinDate: new Date().toISOString(),
        pin: '1234',
      })
      .expect(201)

    await request(app)
      .post('/api/users')
      .set('x-household-pin', '1234')
      .send({
        id: 'milo',
        name: 'Milo',
        color: '#000',
        avatarEmoji: '🗡️',
        joinDate: new Date().toISOString(),
      })
      .expect(201)

    const template = {
      id: 'laundry-daily',
      title: 'Fold laundry',
      flavorText: 'Tidy the linens',
      difficulty: 'normal',
      points: 5,
      recurrence: 'daily',
      active: true,
      tags: ['laundry'],
      createdBy: 'ava',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await request(app).put(`/api/templates/${template.id}`).set('x-household-pin', '1234').send(template).expect(200)
    const feed = await request(app).get('/api/instances/feed').set('x-household-pin', '1234').expect(200)
    const cardId = feed.body[0].id

    await request(app).post('/api/claims').set('x-household-pin', '1234').send({ cardId, userId: 'ava' }).expect(201)

    await request(app)
      .post('/api/claims')
      .set('x-household-pin', '1234')
      .send({ cardId, userId: 'milo' })
      .expect(409)
  })
})
