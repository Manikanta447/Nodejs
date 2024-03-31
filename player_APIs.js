const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketTeam.db')
let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server started')
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}
initializeDbAndServer()

app.get('/players/', async (request, response) => {
  console.log('entered')
  const getPlayerQuery = `
  SELECT
     * 
  FROM 
    cricket_team;`
  const playersList = await db.all(getPlayerQuery)
  response.send(playersList)
})

app.post('/players/', async (request, response) => {
  const newPlayerDetails = request.body
  const {playerName, jerseyNumber, role} = newPlayerDetails
  const playerPostQuery = `
    INSERT INTO 
      cricket_team (player_name,jersey_number,role)
    VALUES
      (
        "${playerName}",
        ${jerseyNumber},
        "${role}"
      );
  `
  let responsedb = await db.run(playerPostQuery)
  console.log(responsedb.lastID)
  response.send('Player Added to Team')
})

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `
    SELECT *
    FROM cricket_team
    WHERE 
      player_id = ${playerId};
  `
  const playerDetails = await db.get(getPlayerQuery)
  response.send(playerDetails)
})

app.put('/players/:playerId/', async (request, response) => { //ERROR IN THIS API NEED TO RESOLVE 
  const {playerId} = request.params
  const newPlayerDetails = request.body
  const {playerName, jerseyNumber, role} = newPlayerDetails
  console.log(playerName)
  const updatePlayerQuery = `
    UPDATE cricket_team
    SET 
      player_name = ${playerName},
      jersey_number = ${jerseyNumber},
      role = ${role} 
    WHERE 
      player_id = ${playerId};
  `
  await db.run(updatePlayerQuery)
  response.send('Player Details Updated')
})

app.delete('/players/:playerId', async function (request, response) {
  const {playerId} = request.params
  const deletePlayerQuery = `
    DELETE FROM cricket_team
    WHERE 
      player_id = ${playerId};
  `
  await db.run(deletePlayerQuery)
  response.send('Player Removed')
})

module.exports = app;
