const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const app = express()
app.use(express.json())
let db = null

const dbPath = path.join(__dirname, 'covid19India.db')
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started')
    })
  } catch (error) {
    console.log(error.message)
    process.exit(1)
  }
}
initializeDbAndServer()

const convertsnake_caseToCamelCase = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertsnake_caseToCamelCaseDistrict = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

//GET STATES API
app.get('/states/', async (request, response) => {
  let getStates = `
        SELECT 
            *
        FROM 
            state
    `
  getStates = await db.all(getStates)
  const statesList = getStates.map(obj => convertsnake_caseToCamelCase(obj))
  response.send(statesList)
})

//GET STATE API
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  let getState = `
    SELECT 
      *
    FROM 
      state
    WHERE 
      state_id = ${stateId};
  `
  getState = await db.get(getState)
  const state = convertsnake_caseToCamelCase(getState)
  response.send(state)
})

//POST DISTRICT
app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  let postDistrict = `
    INSERT INTO 
      district (district_name,state_id,cases,cured,active,deaths)
    VALUES
      (
        "${districtName}",
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
      );
  `
  const responseId = await db.run(postDistrict)
  //console.log(responseId.lastID)
  response.send('District Successfully Added')
})

//GET DISTRICT
app.get('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  let getDistrict = `
    SELECT *
    FROM district
    WHERE 
      district_id = ${districtId};
  `
  getDistrict = await db.get(getDistrict)
  console.log(getDistrict)
  const district = convertsnake_caseToCamelCaseDistrict(getDistrict)
  response.send(district)
})

//DELETE DISTRICT API
app.delete('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrict = `
      DELETE FROM district
      WHERE 
        district_id = ${districtId};
    `
  await db.run(deleteDistrict)
  response.send('District Removed')
})

//UPDATE DISTRICT API
app.put('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  let updateDistrict = `
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
})

//GET TOTAL STATS OF SPECIFIC STATE API
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  let getStats = `
    SELECT 
      state.state_id AS state_id,
      SUM(district.cases) AS total_cases,
      SUM(district.cured) AS total_cured,
      SUM(district.active) AS total_active,
      SUM(district.Deaths) AS total_deaths
    FROM 
      district INNER JOIN state 
      ON district.state_id = state.state_id
    WHERE 
      state.state_id = ${stateId}
    GROUP BY 
      state.state_id;
  `

  getStats = await db.get(getStats)
  //console.log(getStats)

  const stats = {
    totalCases: getStats.total_cases,
    totalCured: getStats.total_cured,
    totalActive: getStats.total_active,
    totalDeaths: getStats.total_deaths,
  }
  response.send(stats)
})

//GET STATE NAME OF SPECIFIC DISTRICT API
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  let getState = `
    SELECT 
      state.state_name AS state_name
    FROM 
      state INNER JOIN district 
      ON state.state_id = district.state_id 
    WHERE 
      district.district_id = ${districtId};
  `
  getState = await db.get(getState)
  //console.log(getState)
  const state = {
    stateName: getState.state_name,
  }
  response.send(state)
})

module.exports = app;
