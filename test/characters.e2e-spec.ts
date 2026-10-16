import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Characters (e2e)', () => {
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

  //Get all characters tests
  describe('GET /api/characters', () => {
    it('caso bien: responde 200 con la lista paginada de personajes', async () => {
      const { body } = await request(server)
        .get('/api/characters')
        .expect(200);

      expect(body).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number),
      });
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0]).toMatchObject({
        id: expect.any(Number),
        realName: expect.any(String),
        alias: expect.any(String),
        mainPower: expect.any(String),
        powerLevel: expect.any(Number),
        status: expect.any(String),
      });
    });

    it('caso bien: filtra por status', async () => {
      await createCharacter({ status: 'ACTIVE' });

      const { body } = await request(server)
        .get('/api/characters?status=ACTIVE')
        .expect(200);

      for (const character of body.data) {
        expect(character.status).toBe('ACTIVE');
      }
    });

    it('caso bien: filtra por teamId', async () => {
      const team = await createTeam();
      await createCharacter({ teamId: team.id });

      const { body } = await request(server)
        .get(`/api/characters?teamId=${team.id}`)
        .expect(200);

      expect(body.data.length).toBeGreaterThan(0);
      for (const character of body.data) {
        expect(character.teamId).toBe(team.id);
      }
    });

    it('caso bien: respeta limit y offset', async () => {
      const { body } = await request(server)
        .get('/api/characters?limit=2&offset=0')
        .expect(200);

      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.limit).toBe(2);
      expect(body.offset).toBe(0);
    });

    it('caso mal: status inválido responde 400', () => {
      return request(server)
        .get('/api/characters?status=INVALID')
        .expect(400);
    });
  });

  //Get test
  describe('GET /api/characters/:id', () => {
    it('caso bien: responde 200 con el personaje (seed: id 1)', async () => {
      const { body } = await request(server)
        .get('/api/characters/1')
        .expect(200);

      expect(body).toMatchObject({ id: 1 });
      expect(body.realName).toBeDefined();
      expect(body.alias).toBeDefined();
    });

    it('caso mal: personaje inexistente responde 404', () => {
      return request(server).get('/api/characters/999999999').expect(404);
    });
  });

  //Post test
  describe('POST /api/characters', () => {
    it('caso bien: crea un personaje sin equipo', async () => {
      const alias = `Hero ${unique()}`;
      const { body } = await request(server)
        .post('/api/characters')
        .send({
          realName: 'Bruce Wayne',
          alias,
          mainPower: 'Inteligencia',
          powerLevel: 80,
        })
        .expect(201);

      expect(body).toMatchObject({
        realName: 'Bruce Wayne',
        alias,
        mainPower: 'Inteligencia',
        powerLevel: 80,
        status: 'ACTIVE',
        isVillain: false,
      });
    });

    it('caso bien: crea un personaje asignado a un equipo activo', async () => {
      const team = await createTeam();
      const alias = `Hero ${unique()}`;

      const { body } = await request(server)
        .post('/api/characters')
        .send({
          realName: 'Clark Kent',
          alias,
          mainPower: 'Super fuerza',
          powerLevel: 99,
          teamId: team.id,
        })
        .expect(201);

      expect(body.teamId).toBe(team.id);
    });

    it('caso bien: crea un villano con status personalizado', async () => {
      const alias = `Villain ${unique()}`;
      const { body } = await request(server)
        .post('/api/characters')
        .send({
          realName: 'Lex Luthor',
          alias,
          mainPower: 'Genio malvado',
          powerLevel: 70,
          isVillain: true,
          status: 'INJURED',
        })
        .expect(201);

      expect(body).toMatchObject({ isVillain: true, status: 'INJURED' });
    });

    it('caso mal: alias duplicado responde 409', async () => {
      const character = await createCharacter();

      await request(server)
        .post('/api/characters')
        .send({
          realName: 'Otro',
          alias: character.alias,
          mainPower: 'Poder',
          powerLevel: 10,
        })
        .expect(409);
    });

    it('caso mal: equipo inexistente en teamId responde 404', () => {
      return request(server)
        .post('/api/characters')
        .send({
          realName: 'Fantasma',
          alias: `Ghost ${unique()}`,
          mainPower: 'Invisibilidad',
          powerLevel: 30,
          teamId: 999999999,
        })
        .expect(404);
    });

    it('caso mal: equipo inactivo en teamId responde 400', async () => {
      const team = await createTeam({ active: false });

      await request(server)
        .post('/api/characters')
        .send({
          realName: 'Perdido',
          alias: `Lost ${unique()}`,
          mainPower: 'Nada',
          powerLevel: 5,
          teamId: team.id,
        })
        .expect(400);
    });

    it('caso mal: sin realName responde 400', () => {
      return request(server)
        .post('/api/characters')
        .send({
          alias: `NoName ${unique()}`,
          mainPower: 'Poder',
          powerLevel: 50,
        })
        .expect(400);
    });

    it('caso mal: sin alias responde 400', () => {
      return request(server)
        .post('/api/characters')
        .send({
          realName: 'Sin Alias',
          mainPower: 'Poder',
          powerLevel: 50,
        })
        .expect(400);
    });

    it('caso mal: powerLevel fuera de rango (>100) responde 400', () => {
      return request(server)
        .post('/api/characters')
        .send({
          realName: 'Overpowered',
          alias: `OP ${unique()}`,
          mainPower: 'Todo',
          powerLevel: 150,
        })
        .expect(400);
    });

    it('caso mal: powerLevel fuera de rango (<1) responde 400', () => {
      return request(server)
        .post('/api/characters')
        .send({
          realName: 'Underpowered',
          alias: `UP ${unique()}`,
          mainPower: 'Nada',
          powerLevel: 0,
        })
        .expect(400);
    });

    it('caso mal: campo no declarado en el DTO responde 400', async () => {
      const { body } = await request(server)
        .post('/api/characters')
        .send({
          realName: 'Test',
          alias: `Test ${unique()}`,
          mainPower: 'Poder',
          powerLevel: 50,
          inventado: 'no debería estar aquí',
        })
        .expect(400);

      expect(body.message.join(' ')).toContain('inventado');
    });
  });

  //Put tests
  describe('PUT /api/characters/:id', () => {
    it('caso bien: reemplaza un personaje existente', async () => {
      const character = await createCharacter();
      const newAlias = `Replaced ${unique()}`;

      const { body } = await request(server)
        .put(`/api/characters/${character.id}`)
        .send({
          realName: 'Nuevo Nombre',
          alias: newAlias,
          mainPower: 'Nuevo Poder',
          powerLevel: 75,
        })
        .expect(200);

      expect(body).toMatchObject({
        id: character.id,
        realName: 'Nuevo Nombre',
        alias: newAlias,
        mainPower: 'Nuevo Poder',
        powerLevel: 75,
      });
    });

    it('caso bien: reemplaza asignando a un equipo activo', async () => {
      const character = await createCharacter();
      const team = await createTeam();

      const { body } = await request(server)
        .put(`/api/characters/${character.id}`)
        .send({
          realName: character.realName,
          alias: character.alias,
          mainPower: character.mainPower,
          powerLevel: character.powerLevel,
          teamId: team.id,
        })
        .expect(200);

      expect(body.teamId).toBe(team.id);
    });

    it('caso mal: personaje inexistente responde 404', () => {
      return request(server)
        .put('/api/characters/999999999')
        .send({
          realName: 'No existe',
          alias: `Ghost ${unique()}`,
          mainPower: 'Nada',
          powerLevel: 10,
        })
        .expect(404);
    });

    it('caso mal: alias duplicado contra otro personaje responde 409', async () => {
      const characterA = await createCharacter();
      const characterB = await createCharacter();

      await request(server)
        .put(`/api/characters/${characterA.id}`)
        .send({
          realName: characterA.realName,
          alias: characterB.alias,
          mainPower: characterA.mainPower,
          powerLevel: characterA.powerLevel,
        })
        .expect(409);
    });

    it('caso mal: equipo inactivo responde 400', async () => {
      const character = await createCharacter();
      const team = await createTeam({ active: false });

      await request(server)
        .put(`/api/characters/${character.id}`)
        .send({
          realName: character.realName,
          alias: character.alias,
          mainPower: character.mainPower,
          powerLevel: character.powerLevel,
          teamId: team.id,
        })
        .expect(400);
    });

    it('caso mal: transición RETIRED → INJURED responde 400', async () => {
      const character = await createCharacter();

      // Primero lo retiramos
      await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'RETIRED' })
        .expect(200);

      // Intentar pasar a INJURED desde RETIRED
      await request(server)
        .put(`/api/characters/${character.id}`)
        .send({
          realName: character.realName,
          alias: character.alias,
          mainPower: character.mainPower,
          powerLevel: character.powerLevel,
          status: 'INJURED',
        })
        .expect(400);
    });
  });

  //Patch test
  describe('PATCH /api/characters/:id/status', () => {
    it('caso bien: cambia el status de ACTIVE a INJURED', async () => {
      const character = await createCharacter();

      const { body } = await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'INJURED' })
        .expect(200);

      expect(body.status).toBe('INJURED');
    });

    it('caso bien: cambia el status de ACTIVE a RETIRED', async () => {
      const character = await createCharacter();

      const { body } = await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'RETIRED' })
        .expect(200);

      expect(body.status).toBe('RETIRED');
    });

    it('caso bien: cambia el status de RETIRED a ACTIVE', async () => {
      const character = await createCharacter();

      await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'RETIRED' })
        .expect(200);

      const { body } = await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(body.status).toBe('ACTIVE');
    });

    it('caso mal: transición RETIRED → INJURED responde 400', async () => {
      const character = await createCharacter();

      await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'RETIRED' })
        .expect(200);

      await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'INJURED' })
        .expect(400);
    });

    it('caso mal: personaje inexistente responde 404', () => {
      return request(server)
        .patch('/api/characters/999999999/status')
        .send({ status: 'ACTIVE' })
        .expect(404);
    });

    it('caso mal: status inválido responde 400', async () => {
      const character = await createCharacter();

      await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({ status: 'DEAD' })
        .expect(400);
    });

    it('caso mal: sin status en el body responde 400', async () => {
      const character = await createCharacter();

      await request(server)
        .patch(`/api/characters/${character.id}/status`)
        .send({})
        .expect(400);
    });
  });

  //Delete tests
  describe('DELETE /api/characters/:id', () => {
    it('caso bien: elimina un personaje existente', async () => {
      const character = await createCharacter();

      await request(server)
        .delete(`/api/characters/${character.id}`)
        .expect(200);

      await request(server)
        .get(`/api/characters/${character.id}`)
        .expect(404);
    });

    it('caso mal: personaje inexistente responde 404', () => {
      return request(server).delete('/api/characters/999999999').expect(404);
    });
  });
});
