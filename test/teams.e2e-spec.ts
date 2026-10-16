import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Teams (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;

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
    server = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const unique = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const createTeam = async (overrides: Record<string, unknown> = {}) => {
    const { body } = await request(server)
      .post('/api/teams')
      .send({ name: `Test Team ${unique()}`, ...overrides })
      .expect(201);
    return body;
  };

  const createCharacter = async (overrides: Record<string, unknown> = {}) => {
    const { body } = await request(server)
      .post('/api/characters')
      .send({
        realName: `Real ${unique()}`,
        alias: `Alias ${unique()}`,
        mainPower: 'Test power',
        powerLevel: 50,
        ...overrides,
      })
      .expect(201);
    return body;
  };

  describe('GET /api/teams', () => {
    it('caso bien: responde 200 con la lista de equipos', async () => {
      const { body } = await request(server).get('/api/teams').expect(200);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        active: expect.any(Boolean),
      });
    });
  });

  describe('GET /api/teams/:id', () => {
    it('caso bien: responde 200 con el equipo (seed: Avengers)', async () => {
      const { body } = await request(server).get('/api/teams/1').expect(200);

      expect(body).toMatchObject({ id: 1, name: 'Avengers' });
    });

    it('caso mal: equipo inexistente responde 404', () => {
      return request(server).get('/api/teams/999999999').expect(404);
    });
  });

  describe('GET /api/teams/:id/characters', () => {
    it('caso bien: responde 200 con los personajes del equipo (seed: X-Men)', async () => {
      const { body } = await request(server)
        .get('/api/teams/2/characters')
        .expect(200);

      expect(body.length).toBeGreaterThan(0);
      for (const character of body) {
        expect(character.teamId).toBe(2);
      }
    });

    it('caso mal: equipo inexistente responde 404', () => {
      return request(server).get('/api/teams/999999999/characters').expect(404);
    });
  });

  describe('POST /api/teams', () => {
    it('caso bien: crea un equipo sin personajes', async () => {
      const name = `Nuevo Equipo ${unique()}`;
      const { body } = await request(server)
        .post('/api/teams')
        .send({ name, base: 'HQ', foundedYear: 2020, active: true })
        .expect(201);

      expect(body).toMatchObject({ name, base: 'HQ', foundedYear: 2020, active: true });
    });

    it('caso bien: crea un equipo activo y asigna personajes existentes', async () => {
      const character = await createCharacter();
      const team = await createTeam({ characterIds: [character.id] });

      const { body } = await request(server)
        .get(`/api/teams/${team.id}/characters`)
        .expect(200);

      expect(body.map((c: { id: number }) => c.id)).toContain(character.id);
    });

    it('caso mal: equipo inactivo con personajes responde 400', async () => {
      const character = await createCharacter();

      await request(server)
        .post('/api/teams')
        .send({
          name: `Equipo Inactivo ${unique()}`,
          active: false,
          characterIds: [character.id],
        })
        .expect(400);
    });

    it('caso mal: personaje inexistente en characterIds responde 404', () => {
      return request(server)
        .post('/api/teams')
        .send({ name: `Equipo Fantasma ${unique()}`, characterIds: [999999999] })
        .expect(404);
    });

    it('caso mal: nombre duplicado responde 409', async () => {
      const team = await createTeam();

      await request(server)
        .post('/api/teams')
        .send({ name: team.name })
        .expect(409);
    });

    it('caso mal: sin name responde 400', () => {
      return request(server).post('/api/teams').send({ base: 'HQ' }).expect(400);
    });

    it('caso mal: foundedYear fuera de rango responde 400', () => {
      return request(server)
        .post('/api/teams')
        .send({ name: `Equipo ${unique()}`, foundedYear: 1800 })
        .expect(400);
    });

    it('caso mal: campo no declarado en el DTO responde 400', async () => {
      const { body } = await request(server)
        .post('/api/teams')
        .send({ name: `Equipo ${unique()}`, inventado: 1 })
        .expect(400);

      expect(body.message.join(' ')).toContain('inventado');
    });
  });

  describe('PUT /api/teams/:id', () => {
    it('caso bien: reemplaza un equipo existente', async () => {
      const team = await createTeam();
      const newName = `Equipo Reemplazado ${unique()}`;

      const { body } = await request(server)
        .put(`/api/teams/${team.id}`)
        .send({ name: newName, base: 'Nueva base', active: true })
        .expect(200);

      expect(body).toMatchObject({ id: team.id, name: newName, base: 'Nueva base' });
    });

    it('caso mal: equipo inexistente responde 404', () => {
      return request(server)
        .put('/api/teams/999999999')
        .send({ name: `Equipo ${unique()}` })
        .expect(404);
    });

    it('caso mal: nombre duplicado contra otro equipo responde 409', async () => {
      const teamA = await createTeam();
      const teamB = await createTeam();

      await request(server)
        .put(`/api/teams/${teamA.id}`)
        .send({ name: teamB.name })
        .expect(409);
    });

    it('caso mal: enviar characterIds en el PUT responde 400 (no permitido en replace)', async () => {
      const team = await createTeam();

      await request(server)
        .put(`/api/teams/${team.id}`)
        .send({ name: team.name, characterIds: [1] })
        .expect(400);
    });
  });

  describe('PATCH /api/teams/:id/characters', () => {
    it('caso bien: asigna personajes a un equipo activo', async () => {
      const team = await createTeam();
      const character = await createCharacter();

      const { body } = await request(server)
        .patch(`/api/teams/${team.id}/characters`)
        .send({ characterIds: [character.id] })
        .expect(200);

      expect(body.map((c: { id: number }) => c.id)).toContain(character.id);
      expect(body.find((c: { id: number }) => c.id === character.id).teamId).toBe(team.id);
    });

    it('caso bien: reasigna un personaje que ya pertenecía a otro equipo', async () => {
      const teamA = await createTeam();
      const teamB = await createTeam();
      const character = await createCharacter({ teamId: teamA.id });

      const { body } = await request(server)
        .patch(`/api/teams/${teamB.id}/characters`)
        .send({ characterIds: [character.id] })
        .expect(200);

      expect(body.find((c: { id: number }) => c.id === character.id).teamId).toBe(teamB.id);
    });

    it('caso mal: equipo inexistente responde 404', () => {
      return request(server)
        .patch('/api/teams/999999999/characters')
        .send({ characterIds: [1] })
        .expect(404);
    });

    it('caso mal: equipo inactivo responde 400', async () => {
      const team = await createTeam({ active: false });
      const character = await createCharacter();

      await request(server)
        .patch(`/api/teams/${team.id}/characters`)
        .send({ characterIds: [character.id] })
        .expect(400);
    });

    it('caso mal: personaje inexistente responde 404', async () => {
      const team = await createTeam();

      await request(server)
        .patch(`/api/teams/${team.id}/characters`)
        .send({ characterIds: [999999999] })
        .expect(404);
    });

    it('caso mal: characterIds vacío responde 400', async () => {
      const team = await createTeam();

      await request(server)
        .patch(`/api/teams/${team.id}/characters`)
        .send({ characterIds: [] })
        .expect(400);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('caso bien: elimina un equipo sin personajes asignados', async () => {
      const team = await createTeam();

      await request(server).delete(`/api/teams/${team.id}`).expect(200);
      await request(server).get(`/api/teams/${team.id}`).expect(404);
    });

    it('caso mal: equipo inexistente responde 404', () => {
      return request(server).delete('/api/teams/999999999').expect(404);
    });

    it('caso mal: equipo con personajes asignados responde 409', async () => {
      const team = await createTeam();
      await createCharacter({ teamId: team.id });

      await request(server).delete(`/api/teams/${team.id}`).expect(409);
    });
  });
});
