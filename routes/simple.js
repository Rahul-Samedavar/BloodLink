const express = require('express')
const axios = require('axios')
const jwt = require('jsonwebtoken');
require('dotenv').config();


const admin = require('firebase-admin');
const serviceAccount = require("../messenger-bace1-firebase-adminsdk-6vlv6-23a2f09ff3.json");


import('../database.mjs')
  .then((db) => {
    database = db;
  })
  .catch((error) => {
    console.error('Error loading database module:', error);
  });

const router = express()


router.get('/', (req, res) => {
    const user = authenticate(req.cookies.access_token)
    res.status(200).render('home', {user})
})

router.get('/request', (req, res) => {
    res.status(200).render('request')
})

router.get('/deleterequest', (req, res) => {
    res.status(200).render('delreq')
})

router.post('/deleterequest', async (req,  res)=>{
    try{
        const {phone, password} = req.body;
        const id = await database.requestIDFromPhone(phone);
        if(!id || id === 0) res.json({msg: 0})
        else{
            if(await database.checkpassword(id, password)){
                await database.deleteRequest(phone, password)
                res.json({msg: 1})
            }
            else{
                res.json({msg: -1})
            }
        }
    }
    catch(er){
        console.log(er)
        res.json({msg: -2})
    }
})

router.get("/search/:blood/:state/:district", async (req, res) =>{
    try {
        const { blood, state, district } = req.params;
        const response = await database.searchDonors({ blood, state, district });
        res.json(response);
    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.get('/getAddress/:lat/:long', async (req, res) => {
    try {
        const { lat, long } = req.params;

        const response = await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${long}&apiKey=0ba7efeecbcb4cba909c0a5366cfaa9d`);
        const state = response.data.features[0].properties.state;
        const district = response.data.features[0].properties.state_district.split(" ")[0];
        const city = response.data.features[0].properties.city;

        res.json({ state, district, city });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/request', async (req, res)=>{
    try {
        const {name, phone, password, blood, needExact, price, state, district} = req.body
        const subdistrict = district
        const city = district
        const address = district 
        const r = await database.createrequest(name, phone, password, blood, price, needExact, state, district, subdistrict, city, address);
        const targets = await database.findMatch(r)
        const request = await database.requestFromID(r)
        console.log(request)
        targets.forEach(token =>{
            console.log(token);
            if(token !== ""){
                try {
                    sendPushNotification(token, request.requestID, request.blood, request.name);
                    // console.log(token)
                } catch (error) {
                    console.log("token", error)
                }
            }
        })
        res.json({r})
        }
    catch (error) {
        console.log(error)
        res.json({r: -1})
    }
    
})

router.get('/req/:requestID', async (req, res)=>{
    try{
        const {requestID} = req.params;
        const data = await database.requestFromID(requestID)
        if(data.needExact !== 1) data.blood = compatibilityMap[data.blood]
        res.render('viewrequest', data)
    }
    catch(error){
        res.render('deleted')
    }

})
  

function authenticate(token){
    let user = {
        name: "",
        donorID: "",

    }
    if(token){
        jwt.verify(token, process.env.JWT_TOKEN, (err, data)=>{
            if (err) console.log(err)
            user = data
        }) 
    }
    return user 
}



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


function sendPushNotification(registrationToken, requestID, blood, name) {
    console.log(requestID)
    const message = {
        token: registrationToken,
        notification: {
            title: "BloodLink",
            body: `${name} needs ${blood} blood`
        },
        data: {
            title: "BloodLink",
            body: "request",
        },
        webpush: {
            fcm_options: {
                link: `http://localhost:3000/req/:${requestID}`
            }
        }
    };

    admin.messaging().send(message)
        .then((response) => {
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

module.exports = router

const compatibilityMap = {
    'A+': ['A+', 'O+'],
    'A-': ['A+', 'A-', 'O+', 'O-'],
    'B+': ['B+', 'O+'],
    'B-': ['B+', 'B-', 'O+', 'O-'],
    'AB+': ['A+', 'B+', 'AB+', 'O+'],
    'AB-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'O+': ['O+'],
    'O-': ['O+', 'O-']
};