import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('GET /api/characters (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('caso bien', () => {
    it('responde 200 con el sobre de respuesta y la paginación por defecto', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/characters')
        .expect(200);

      expect(body).toEqual({
        data: expect.any(Array),
        total: expect.any(Number),
        limit: 20,
        offset: 0,
      });
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('cada personaje trae su equipo resuelto', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/characters')
        .expect(200);

      for (const character of body.data) {
        expect(character).toMatchObject({
          id: expect.any(Number),
          alias: expect.any(String),
          powerLevel: expect.any(Number),
        });

        if (character.teamId === null) {
          expect(character.team).toBeNull();
        } else {
          expect(character.team.id).toBe(character.teamId);
        }
      }
    });

    it('filtra por status', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/characters?status=ACTIVE')
        .expect(200);

      expect(body.data.length).toBeGreaterThan(0);
      for (const character of body.data) {
        expect(character.status).toBe('ACTIVE');
      }
    });

    it('filtra por teamId', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/characters?teamId=2')
        .expect(200);

      for (const character of body.data) {
        expect(character.teamId).toBe(2);
      }
    });

    it('convierte limit de texto a número y lo respeta', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/characters?limit=5')
        .expect(200);

      expect(body.limit).toBe(5); // número, no el texto "5"
      expect(body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('caso mal', () => {
    it('rechaza un status que no está en el enum', () => {
      return request(app.getHttpServer())
        .get('/api/characters?status=INVENTADO')
        .expect(400);
    });

    it('rechaza un limit no numérico', () => {
      return request(app.getHttpServer())
        .get('/api/characters?limit=abc')
        .expect(400);
    });

    it('rechaza un limit por encima del máximo', () => {
      return request(app.getHttpServer())
        .get('/api/characters?limit=999')
        .expect(400);
    });

    it('rechaza un filtro que no está declarado en el DTO', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/characters?inventado=1')
        .expect(400);

      expect(body.message.join(' ')).toContain('inventado');
    });
  });
});