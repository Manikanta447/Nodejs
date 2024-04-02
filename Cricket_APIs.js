app.get('/players/', async (request, response) => {
  console.log('entered')
  let getPlayers = `
          SELECT *
          FROM 
              player_details;
      `
  getPlayers = await db.all(getPlayers)

  console.log(getPlayers)

  const players = getPlayers.map(obj => ({
    playerId: obj.player_id,
    playerName: obj.player_name,
  }))

  response.send(players)
})
