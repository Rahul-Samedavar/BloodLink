import mysql from 'mysql2'
import dotenv from 'dotenv'
dotenv.config()

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise()

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

export async function signup(name, phone, password, token,  issearchable, state, district, subdistrict, city, area){
    if(!subdistrict) subdistrict = district
    if(!city) city = subdistrict
    if(!area) area = city
    let issearchableValue = (issearchable)? 1: 0
    try {
        await pool.query(
            `INSERT INTO donors (name, phone, blood, state, district, subdistrict, city, area, password, token, issearchable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [name, phone, '{}', state, district, subdistrict, city, area, password, token, issearchableValue]
        )
        
    } catch(error){
        console.log("database error while creating donor acnt", error);
        throw error;
    }
}

export async function update(donorID, blood, issearchable){
    blood = JSON.stringify(blood)
    try{
        await pool.query(`
        UPDATE donors SET blood = ?, issearchable = ?  WHERE donorID = ?
        `, [blood, issearchable, donorID])
        return true
    }
    catch(error){
        console.log('error updating', error)
    }
    return false
}

export async function donorIdFromPhone(phone){
    try{
        let [result] = await pool.query(
            `
            SELECT donorID FROM donors WHERE (phone = ?)
            `, [phone]
        )
        return result[0].donorID

    } catch(er){}
    return 0
}

export async function login(phone, password){
    let [result] = await pool.query(
        `
        SELECT * FROM donors WHERE phone = ?
        `, [phone]
    )
    if(!result[0]) return 0
    if(result[0].password != password) return -1
    result[0].password = ""
    return result[0]
}

export async function donorFromID(donorID, password=null){
    let [result] = await pool.query(
        `
        SELECT * FROM donors WHERE (donorID = ?)
        `, [donorID]
    )
    if(password){
        if (password != result[0].password){
            return {error: "wp"}
        }
    }
    result[0].password = undefined
    return result[0]
}

export async function updateToken(donorID,  token){
    try {
        await pool.query(`
        UPDATE donors SET token = ? WHERE donorID = ?
        `, [token, donorID]);
    } catch (error) {
        console.log(error)
    }
}

export async function deleteDonor(donorID, password){
    await pool.query(`
     DELETE FROM donors WHERE (donorID = ? AND password = ?);
    `, [donorID, password]
)}

export async function getDonorToken(donorID){
    let [result] = await pool.query(`
        SELECT token FROM donors WHERE (donorID = ?)
        `, [donorID]
    )
    return result[0].token
}

export async function searchDonors(data) {
    try {
        const [result] = await pool.query(
            `SELECT name, blood, city, phone FROM donors WHERE state = ? AND district = ? AND issearchable=1`,
            [data.state, data.district]
        );
        let list = [];
        result.forEach(donor => {
            if(donor.blood  && donor.blood[data.blood] >=0  ) {
                list.push(donor);
            }
        });
        return list;
    } catch (error) {
        console.error("Error in searchDonors function:", error);
        throw error;
    }
}


export async function createrequest(name, phone, password, blood, price, needExact, state, district, subdistrict, city, address) {
    let NEV = needExact? 1: 0
    try {
        await pool.query(
            `INSERT INTO requests (name, phone, password, blood, price, state, district, subdistrict, city, address, needExact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, phone, password, blood, price, state, district, subdistrict, city, address, NEV]
        );
        return await requestIDFromPhone(phone);
    } catch (error) {
        console.log('Error creating request:', error);
        return 0 
    }
}

export async function requestIDFromPhone(phone){
    try{
        let [result] = await pool.query(`
        SELECT requestID FROM requests WHERE phone = ?
        `, [phone])
        return result[0].requestID
    }
    catch{
        return 0
    }
}

export async function requestFromID(ID, password=null){
    let [result] = await pool.query(
        `
        SELECT * FROM requests WHERE (requestID = ?)
        `, [ID]
    )
    if(password){
        if (password != result[0].password){
            return {error: "wp"}
        }
    }
    result[0].password = undefined
    return result[0]
}

export async function checkpassword(ID, password){
    try{
        let [result] = await pool.query(
            `
            SELECT password FROM requests WHERE (requestID = ?)
            `, [ID]
        )
        if(result[0].password === password) return true
    }
    catch(Error){ console.log(Error)}
    return false
}

export async function deleteRequest(phone, password){
    await pool.query(`
     DELETE FROM requests WHERE (phone = ? AND password = ?);
    `, [phone, password])
}

export async function findMatch(requestID) {
    let request = await requestFromID(requestID);
    try {
        const [result] = await pool.query(
            `SELECT blood, token FROM donors WHERE state = ? AND district = ?`,
            [request.state, request.district]
        );
        let list = [];
        if (request.needExact) {
            result.forEach(donor => {
                if (donor.blood && request.blood in donor.blood && donor.blood[request.blood] <= request.price) {
                    list.push(donor.token);
                }
            });
        } else {
            result.forEach(donor => {
                let wants = compatibilityMap[request.blood]
                if (donor.blood) {
                    Object.entries(donor.blood).forEach(([bloodGroup, price]) => {
                        if (!(donor.token in list) &&  wants.indexOf(bloodGroup)>-1 && price <= request.price) {
                            list.push(donor.token);
                        }
                    });
                }
            });
        }
        return list;
    } catch (error) {
        console.error("Error in findMatch function:", error);
        throw error;
    }
}
