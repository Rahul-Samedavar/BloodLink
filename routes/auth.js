const express = require('express')
const axios = require('axios')
const jwt = require('jsonwebtoken');
require('dotenv').config();

import('../database.mjs')
  .then((db) => {
    database = db;
  })
  .catch((error) => {
    console.error('Error loading database module:', error);
  });

const router = express()

router.get('/register', (req, res) => {
  res.status(200).render('signup')
})

router.get('/login', (req, res) => {
  res.status(200).render('login')
})

router.get('/logins', (req, res) => {
  res.status(200).render('login',  {msg: "account created"})
})

router.get('/logout', async (req, res) => {
  res.clearCookie('access_token');
  res.status(200).render('login', {msg:"logged out"})
})

router.post('/login', async (req, res) => {
  try {
    const { phone, password,  nToken } = req.body;
    const result = await database.login(phone, password);
    if (typeof result === "number") {
      if (result === 0) {
        return res.status(401).json({ error: "Wrong Phone Number" });
      } else if (result === -1) {
        return res.status(401).json({ error: "Wrong Password" });
      }
    } else {
      if(nToken) await database.updateToken(result.donorID, nToken);
      const token = jwt.sign({ donorID: result.donorID, name: result.name }, process.env.JWT_TOKEN, { expiresIn: '1000h' });
      return res.status(200).json({ token });
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/signup', (req, res)=>{
  res.status(200).render('signup')
})

router.post('/signup', async (req,  res)=>{
  try {
    res.clearCookie('access_token');
  }
  catch(err){}
  try{
    const {name, phone, password, state, district, issearchable} = req.body;
    const v = await database.donorIdFromPhone(phone)
    if(v == 0){
      const token = ""
      const subdistrict = district
      const city = subdistrict
      const area = city
      await database.signup(name, phone, password, token, issearchable, state, district, city, area)
      res.json({er: 0})
    }
    else{
      res.json({er: -1})
    }
  }
  catch(er){
    res.json({er: 1})
  }

})


module.exports = router
