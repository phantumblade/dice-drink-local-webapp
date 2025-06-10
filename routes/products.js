// routes/products.js
const express = require('express');
const ProductsDao = require('../daos/productsDao');

const router = express.Router();

// GET /api/products?category=giochi
router.get('/', async (req, res, next) => {
  try {
    const items = await ProductsDao.findAll(req.query.category);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const id = await ProductsDao.create(req.body);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
