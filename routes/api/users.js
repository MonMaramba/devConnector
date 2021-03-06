const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

const User = require('../../models/User');

// @route  POST api/users
// @desc   Register user
// @access Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password } = req.body;
    try {
      //checking for the email so that only one user per email is registered
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ erros: [{ msg: 'User already exists' }] });
      }
      // getting the gravatar
      const avatar = gravatar.url(email, { s: '200', r: 'pg', d: 'mm' });
      // setting an instance of the user using the model
      user = new User({
        name,
        email,
        avatar,
        password,
      });
      // hashing the password before saving
      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // creating the payload
      const payload = {
        user: {
          id: user.id, // mongoose abstraction refers to _id in mongodb
        },
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 3600000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
