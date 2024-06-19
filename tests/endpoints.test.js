import request from 'supertest';
import app from '../app';

describe('Endpoints', () => {
  let authToken;
  let userId;
  let fileId;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .get('/connect')
      .set('X-Token', 'test_token');

    authToken = loginResponse.body.token;
    userId = loginResponse.body.userId;
  });

  describe('GET /status', () => {
    it('should return status 200 and "OK"', async () => {
      const response = await request(app).get('/status');
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });

  describe('GET /stats', () => {
    it('should return status 200 and stats data', async () => {
      const response = await request(app).get('/stats');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
    });
  });

  describe('POST /users', () => {
    it('should create a new user and return status 201', async () => {
      const response = await request(app)
        .post('/users')
        .send({ username: 'testuser', password: 'testpassword' });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /connect', () => {
    it('should return status 200 and authentication token', async () => {
      const response = await request(app)
        .get('/connect')
        .set('X-Token', 'test_token');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('GET /disconnect', () => {
    it('should return status 200', async () => {
      const response = await request(app)
        .get('/disconnect')
        .set('X-Token', authToken);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /users/me', () => {
    it('should return status 200 and user data', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('X-Token', authToken);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId');
    });
  });

  describe('POST /files', () => {
    it('should upload a file and return status 201', async () => {
      const response = await request(app)
        .post('/files')
        .set('X-Token', authToken)
        .field('name', 'testFile.txt')
        .field('type', 'file')
        .attach('data', 'path/to/testFile.txt');
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      fileId = response.body.id;
    });
  });

  describe('GET /files/:id', () => {
    it('should return status 200 and file data', async () => {
      const response = await request(app)
        .get(`/files/${fileId}`)
        .set('X-Token', authToken);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', fileId);
    });
  });

  describe('GET /files (pagination)', () => {
    it('should return status 200 and paginated file data', async () => {
      const response = await request(app)
        .get('/files')
        .set('X-Token', authToken);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body.files.length).toBeLessThanOrEqual(20);
    });
  });

  describe('PUT /files/:id/publish', () => {
    it('should publish a file and return status 200', async () => {
      const response = await request(app)
        .put(`/files/${fileId}/publish`)
        .set('X-Token', authToken);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', fileId);
      expect(response.body.isPublic).toBe(true);
    });
  });

  describe('PUT /files/:id/unpublish', () => {
    it('should unpublish a file and return status 200', async () => {
      const response = await request(app)
        .put(`/files/${fileId}/unpublish`)
        .set('X-Token', authToken);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', fileId);
      expect(response.body.isPublic).toBe(false);
    });
  });

  describe('GET /files/:id/data', () => {
    it('should return status 200 and file data', async () => {
      const response = await request(app)
        .get(`/files/${fileId}/data`)
        .set('X-Token', authToken);
      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/plain');
    });

    it('should return status 404 when requesting an invalid size', async () => {
      const response = await request(app)
        .get(`/files/${fileId}/data?size=999`)
        .set('X-Token', authToken);
      expect(response.status).toBe(404);
    });
  });
});
