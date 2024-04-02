const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const app = express()
app.use(express.json())
let db = null

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')
const initializeDbAndServer = async () => {
  try {
    db = await open({       //BY OPEN METHOD WILL CONNECT THE DB AND RETURNS CONNECTION OBJECT
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

const convertingPlayers = obj => {
  return {
    playerId: obj.player_id,
    playerName: obj.player_name,
  }
}

const convertMatch = obj => {
  return {
    matchId: obj.match_id,
    match: obj.match,
    year: obj.year,
  }
}

//GET players API

app.get('/players/', async (request, response) => {
  let getPlayers = `
    SELECT *
    FROM player_details
  `
  getPlayers = await db.all(getPlayers)
  const players = getPlayers.map(obj => convertingPlayers(obj))
  response.send(players)
})

//GET PLAYER DETAILS
app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  let getPlayer = `
    SELECT *
    FROM player_details
    WHERE 
      player_id = ${playerId};
  `
  getPlayer = await db.get(getPlayer)
  const player = convertingPlayers(getPlayer)
  response.send(player)
})

// UPDATE PLAYER DETAILS API
app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const {playerName} = request.body
  //console.log(playerName)
  let updatePlayer = `
    UPDATE player_details
    SET 
      player_name = "${playerName}"
    WHERE 
      player_id = ${playerId};
  `
  await db.run(updatePlayer)
  response.send('Player Details Updated')
})

//GET MATCH DETAILS
app.get('/matches/:matchId', async (request, response) => {
  const {matchId} = request.params
  let getMatch = `
    SELECT *
    FROM match_details
    WHERE 
      match_id = ${matchId};
  `
  getMatch = await db.get(getMatch)
  const match = convertMatch(getMatch)
  response.send(match)
})

// GET PLAYER MATCH DETAILS API
app.get('/players/:playerId/matches/', async (request, response) => {
  const {playerId} = request.params
  let getMatches = `
  SELECT 
    match_details.match_id AS match_id,
    match_details.match AS match,
    match_details.year AS year
  FROM 
    player_details INNER JOIN player_match_score
    ON player_details.player_id = player_match_score.player_id INNER JOIN 
    match_details ON match_details.match_id = player_match_score.match_id
  WHERE 
    player_details.player_id = ${playerId};
  `
  getMatches = await db.all(getMatches)
  const matches = getMatches.map(obj => convertMatch(obj))
  response.send(matches)
})

//GET PLAYERS IN A SEPECIFIC MATCH
app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  let getPlayers = `
    SELECT 
      m.player_id AS player_id,
      m.player_name AS player_name
    FROM 
      (player_details INNER JOIN player_match_score
      ON player_details.player_id = player_match_score.player_id) AS m
    WHERE 
      match_id = ${matchId}; 
  `
  getPlayers = await db.all(getPlayers)
  //console.log(getPlayers)
  const players = getPlayers.map(obj => convertingPlayers(obj))
  response.send(players)
})

//GET PLAYER TOTAL STATS
app.get('/players/:playerId/playerScores/', async (request, response) => {
  const {playerId} = request.params
  let getStats = `
    SELECT 
      m.player_id AS player_id,
      m.player_name AS player_name,
      SUM(m.score) AS total_score,
      SUM(m.sixes) AS total_sixes,
      SUM(m.fours) AS total_fours
    FROM 
      (player_details INNER JOIN player_match_score
      ON player_details.player_id = player_match_score.player_id) AS m
    WHERE 
      m.player_id = ${playerId}
    GROUP BY 
      m.player_id;
  `
  getStats = await db.get(getStats)
  const stats = {
    playerId: getStats.player_id,
    playerName: getStats.player_name,
    totalScore: getStats.total_score,
    totalSixes: getStats.total_sixes,
    totalFours: getStats.total_fours,
  }
  response.send(stats)
})

module.exports= app;
