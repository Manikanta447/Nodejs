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
      //console.log('server started')
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}
initializeDbAndServer()

const convertsnake_caseToCamelCase = dbObject => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    jerseyNumber: dbObject.jersey_number,
    role: dbObject.role,
  }
}

app.get('/players/', async (request, response) => {
  //console.log('entered')
  let getPlayerQuery = `
  SELECT
     * 
  FROM 
    cricket_team;`
  getPlayerQuery = await db.all(getPlayerQuery)
  const newPlayersList = getPlayerQuery.map(convertsnake_caseToCamelCase)

  response.send(newPlayersList)
})

app.post('/players/', async (request, response) => {
  const newPlayerDetails = request.body
  const {playerName, jerseyNumber, role} = newPlayerDetails
  let playerPostQuery = `
    INSERT INTO 
      cricket_team (player_name,jersey_number,role)
    VALUES
      (
        "${playerName}",
        ${jerseyNumber},
        "${role}"
      );
  `
  playerPostQuery = await db.run(playerPostQuery)
  //console.log(playerPostQuery.lastID);
  response.send('Player Added to Team')
})

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  let getPlayerQuery = `
    SELECT *
    FROM cricket_team
    WHERE 
      player_id = ${playerId};
  `
  getPlayerQuery = await db.get(getPlayerQuery)
  const newPlayerDetails = convertsnake_caseToCamelCase(getPlayerQuery)
  response.send(newPlayerDetails)
})

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  //console.log(playerId)
  const newPlayerDetails = request.body
  const {playerName, jerseyNumber, role} = newPlayerDetails
  //console.log(playerName)
  const updatePlayerQuery = `
    UPDATE cricket_team
    SET 
      player_name = "${playerName}",
      jersey_number = ${jerseyNumber},
      role = "${role}" 
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

module.exports = app
