const express = require('express')
const axios = require('axios')
import('../database.mjs')
  .then((db) => {
    database = db;
  })
  .catch((error) => {
    console.error('Error loading database module:', error);
  });


const router = express()




router.get('/update', async (req, res) => {
  try{
    if(req.user.donorID){
      const user = await database.donorFromID(req.user.donorID, null)
      res.status(200).render('update', {user})
    }else{
      res.status(200).render('login')
    }
  }catch(error){
    console.log(error)
    res.status(200).render('login')
  }
})

router.post('/updateBlood', async (req, res) => {
  console.log(req.body)
  try {
    const bloodmap = req.body.bloodmap
    const issearchable = req.body.issearchable

    if (req.user.donorID) {
      await database.update(req.user.donorID, bloodmap, issearchable);
      res.json({m: "success"})
    } else {
      res.status(200).render('login');
    }
  } catch (error) {
    console.log(error);
    res.status(200).render('login');
  }
});



module.exports = router