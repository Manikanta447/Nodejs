const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const app = express()
app.use(express.json())

let db = null
const dbPath = path.join(__dirname, 'moviesData.db')

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

const convertsnake_caseToCamelCase = function (dbObject) {
  return {
    movieId: dbObject.movie_id,
    directorId: dbObject.director_id,
    movieName: dbObject.movie_name,
    leadActor: dbObject.lead_actor,
  }
}

// GET API
app.get('/movies/', async (request, response) => {
  let movieNames = `
        SELECT 
            movie_name
        FROM 
            movie
    `
  movieNames = await db.all(movieNames)
  movieNames = movieNames.map(obj => ({movieName: obj.movie_name}))
  response.send(movieNames)
})

// POST api
app.post('/movies/', async (request, response) => {
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails
  let postNewMovie = `
    INSERT INTO 
      movie (director_id,movie_name,lead_actor)
    VALUES 
      (
        ${directorId},
        "${movieName}",
        "${leadActor}"
      )
  `
  await db.run(postNewMovie)
  response.send('Movie Successfully Added')
})

//GET movie by movieID
app.get('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  let getMovie = `
    SELECT 
      *
    FROM 
      movie 
    WHERE 
      movie_id = ${parseInt(movieId)};
  `
  getMovie = await db.get(getMovie)
  getMovie = convertsnake_caseToCamelCase(getMovie)
  response.send(getMovie)
})

//update movie
app.put('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails
  let updateMovie = `
    UPDATE movie
    SET 
      director_id = ${directorId},
      movie_name = "${movieName}",
      lead_actor = "${leadActor}"
    WHERE 
      movie_id = ${movieId};
  `
  await db.run(updateMovie)
  response.send('Movie Details Updated')
})

//DELETE MOVIE

app.delete('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  let deleteMovie = `
    DELETE FROM 
      movie
    WHERE 
      movie_id = ${movieId};
  `
  await db.run(deleteMovie)
  response.send('Movie Removed')
})

//GET DIRECTORS DETAILS
app.get('/directors/', async (request, response) => {
  let directorDetails = `
  SELECT 
    director_id,
    director_name
  FROM 
    director
  `
  directorDetails = await db.all(directorDetails)
  const result = directorDetails.map(obj => ({
    directorName: obj.director_name,
    directorId: obj.director_id,
  }))
  response.send(result)
})

//get Director MOvies
app.get('/directors/:directorId/movies', async (request, response) => {
  const {directorId} = request.params
  let getDirectorMovies = `
    SELECT 
      movie_name
    FROM 
      movie
    WHERE 
      director_id = ${directorId};
  `
  getDirectorMovies = await db.all(getDirectorMovies)
  const movies = getDirectorMovies.map(obj => ({movieName: obj.movie_name}))
  response.send(movies)
})


module.exports = app;
