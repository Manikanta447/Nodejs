const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null
app.use(express.json())

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started At: http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB error: ${error.message}`)
    process.exit(1)
  }
}
initializeDbAndServer()

//Authenticate Token Function
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'Secret', (error, user) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//login api
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const checkUsername = `
        SELECT * FROM user WHERE username = "${username}";
    `
  const dbUser = await db.get(checkUsername)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const passwordCheck = await bcrypt.compare(password, dbUser.password)
    if (passwordCheck) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'Secret')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//converting snake_case to camelCase
const convertStates = obj => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  }
}

const convertDistrict = obj => {
  const {district_id, district_name, state_id, cases, cured, active, deaths} =
    obj
  return {
    districtId: district_id,
    districtName: district_name,
    stateId: state_id,
    cases,
    cured,
    active,
    deaths,
  }
}

//GET all states API
app.get('/states/', authenticateToken, async (request, response) => {
  let getStates = `
        SELECT * FROM state;
    `
  getStates = await db.all(getStates)
  const states = getStates.map(obj => convertStates(obj))
  response.send(states)
})

//get state api
app.get('/states/:stateId', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  let getState = `
    SELECT * FROM state WHERE state_id = ${stateId};
  `
  getState = await db.get(getState)
  const state = convertStates(getState)
  response.send(state)
})

app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateDistrict = `
    UPDATE district 
    SET 
      district_name = "${districtName}",
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE 
      district_id = ${districtId};
  `
    await db.run(updateDistrict)
    response.send('District Details Updated')
  },
)

//post district API
app.post('/districts/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const postDistrict = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES 
      (
        "${districtName}",
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
      )
  `
  await db.run(postDistrict)
  response.send('District Successfully Added')
})

//GET district

app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    let getDistrict = `
    SELECT * 
    FROM district 
    WHERE 
      district_id = ${districtId};`
    getDistrict = await db.get(getDistrict)
    const district = convertDistrict(getDistrict)
    response.send(district)
  },
)

// delete district
app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    let deleteDistrict = `
    DELETE FROM 
      district
    WHERE 
      district_id = ${districtId};
  `

    await db.run(deleteDistrict)
    response.send('District Removed')
  },
)

//stats
app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    let getStats = `
      SELECT 
        SUM(cases) AS total_cases,
        SUM(cured) AS total_cured,
        SUM(active) AS total_active,
        SUM(deaths) AS total_deaths
      FROM 
        district
      WHERE 
        state_id = ${stateId}
      GROUP BY 
        state_id 
  `
    getStats = await db.get(getStats)
    const stats = {
      totalCases: getStats.total_cases,
      totalCured: getStats.total_cured,
      totalActive: getStats.total_active,
      totalDeaths: getStats.total_deaths,
    }
    response.send(stats)
  },
)

module.exports = app
