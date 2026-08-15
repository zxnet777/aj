import express from 'express';
import { register, login, authMiddleware } from '../auth.js';
const router = express.Router();
router.post('/register', (req, res) => {
  try { res.json(register(req.body.username, req.body.password)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.post('/login', (req, res) => {
  try { res.json(login(req.body.username, req.body.password)); }
  catch (e) { res.status(401).json({ error: e.message }); }
});
export { router, authMiddleware };
