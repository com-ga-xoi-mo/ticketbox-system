import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module';

describe('Artist Discovery API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /public/artists/top - should return top seeded artists', async () => {
    const res = await request(app.getHttpServer()).get('/public/artists/top?limit=3');
    
    console.log("=== TOP ARTISTS RESPONSE ===");
    console.log(JSON.stringify(res.body, null, 2));
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /public/artists/:slug - should return artist profile with timeline', async () => {
    const res = await request(app.getHttpServer()).get('/public/artists/anh-trai-say-hi');
    
    console.log("=== ARTIST PROFILE RESPONSE ===");
    console.log(JSON.stringify(res.body, null, 2));
    
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('anh-trai-say-hi');
    expect(res.body.displayName).toBe('Anh Trai Say Hi');
  });
});
