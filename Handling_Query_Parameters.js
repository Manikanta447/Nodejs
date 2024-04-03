const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null

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

//GET API IN MY APPROACH
/**app.get('/todos', async (request, response) => {
  const queries = request.query
  let {status = '', priority = '', search_q = ''} = queries
  status = status.split('%20').join(' ')

  let operator = null
  if (status === '' || priority === '') {
    operator = 'OR'
  } else {
    operator = 'AND'
  }
  //console.log(status)
  console.log(search_q)
  const getResults = `
    SELECT *
    FROM 
        todo
    WHERE 
        todo LIKE "%${search_q}%" OR
        (status LIKE "${status}" ${operator}
        priority LIKE "${priority}");
  `
  const results = await db.all(getResults)
  //console.log(results)
  response.send(results)
})**/

//GET API
const priorityAndStatus = obj => {
  return obj.status !== undefined && obj.priority !== undefined
}

const getPriorityResult = obj => {
  return obj.priority !== undefined
}

const getStatusResult = obj => {
  return obj.status !== undefined
}

const isTodo = todo => {
  return todo !== undefined
}

app.get('/todos/', async (request, response) => {
  const query = request.query
  const {search_q = '', priority, status} = query
  let getResultsQuery = ``
  switch (true) {
    case priorityAndStatus(query):
      getResultsQuery = `
        SELECT *
        FROM todo
        WHERE 
          todo LIKE "%${search_q}%" AND 
          priority LIKE "${priority}" AND 
          status LIKE "${status}";
      `
      break

    case getPriorityResult(query):
      getResultsQuery = `
        SELECT *
        FROM todo
        WHERE 
          todo LIKE "%${search_q}%" AND 
          priority LIKE "${priority}";
      `
      break

    case getStatusResult(query):
      getResultsQuery = `
        SELECT *
        FROM todo
        WHERE 
          todo LIKE "%${search_q}%" AND 
          status LIKE "${status}";
      `
      break
    default:
      getResultsQuery = `
      SELECT *
        FROM todo
        WHERE 
          todo LIKE "%${search_q}%";`
  }

  getResultsQuery = await db.all(getResultsQuery)
  response.send(getResultsQuery)
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  //console.log(todoId)
  let getTodo = `
    SELECT *
    FROM todo
    WHERE 
      id = ${todoId};
  `
  getTodo = await db.get(getTodo)
  response.send(getTodo)
})

app.post('/todos', async (request, response) => {
  const todoDetails = request.body
  const {id, todo, priority, status} = todoDetails
  const postTodo = `
    INSERT INTO 
      todo (id,todo,priority,status)
    VALUES 
      (
        ${id},
        "${todo}",
        "${priority}",
        "${status}"
      )
  `
  const responseId = await db.run(postTodo)
  console.log(responseId.lastID)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const todoDetails = req.body
  const {id, todo, priority, status} = todoDetails
  let updatedKey = ''
  let putTodo = ``
  switch (true) {
    case isTodo(todo):
      putTodo = `
        UPDATE todo
        SET 
          todo = "${todo}";
        WHERE 
          id = ${todoId};
          
      `
      updatedKey = 'Todo'
      break
    case getPriorityResult(todoDetails):
      putTodo = `
        UPDATE todo
        SET 
          priority =" ${priority}"
        WHERE 
          id = ${todoId};
      `
      updatedKey = 'Priority'
      break

    case getStatusResult(todoDetails):
      putTodo = `
        UPDATE todo
        SET 
          status = "${status}"
        WHERE 
          id = ${todoId};
      `
      updatedKey = 'Status'
  }

  putTodo = await db.run(putTodo)
  res.send(`${updatedKey} Updated`)
})

app.delete('/todos/:todoId', async (request, response) => {
  const {todoId} = request.params
  let delTodo = `
      DELETE FROM todo
      WHERE id = ${todoId};
    `
  await db.run(delTodo)
  response.send('Todo Deleted')
})

module.exports = app;
