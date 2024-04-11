const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const dateFns = require('date-fns')
const app = express()

app.use(express.json())
let db = null
const dbPath = path.join(__dirname, 'todoApplication.db')

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started At http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error : ${error.message} `)
    process.exit(1)
  }
}

initializeDbAndServer()

//functions
const checkStatus = status => {
  console.log(status)
  const values = ['TO DO', 'IN PROGRESS', 'DONE']
  if (values.includes(status)) {
    return true
  } else {
    return false
  }
}

const checkPriority = priority => {
  console.log(priority)
  const values = ['HIGH', 'MEDIUM', 'LOW']
  if (values.includes(priority)) {
    return true
  } else {
    return false
  }
}

const checkCategory = category => {
  console.log(category)
  const values = ['WORK', 'HOME', 'LEARNING']
  if (values.includes(category)) {
    return true
  } else {
    return false
  }
}

const checkDueDate = date => {
  console.log(date)
  const refDate = dateFns.format(new Date(date), 'yyyy-MM-dd')
  if (date === refDate) {
    return true
  } else {
    return false
  }
}

const checkValue = q => {
  if (q === undefined) {
    return false
  } else {
    return true
  }
}

const checkValues = (q1, q2) => {
  if (q1 !== undefined && q2 !== undefined) {
    return true
  } else {
    return false
  }
}

const convertResults = obj => {
  const {id, todo, priority, status, category, due_date} = obj
  return {
    id,
    todo,
    priority,
    status,
    category,
    dueDate: due_date,
  }
}

//api-1
app.get('/todos/', async (request, response) => {
  const queryParams = request.query
  let {category, status, priority, search_q = ''} = queryParams

  switch (true) {
    case checkValue(status):
      status = status.split('%20').join(' ')

      if (checkStatus(status) === false) {
        response.status(400)
        response.send('Invalid Todo Status')
      } else {
        let getQuery = `
            SELECT * FROM todo WHERE status = "${status}"
          `
        let todos = await db.all(getQuery)
        todos = todos.map(obj => convertResults(obj))
        response.send(todos)
      }
      break

    case checkValue(priority):
      let getQueryPriority = `
        SELECT * FROM todo WHERE priority = "${priority}";
      `
      if (checkPriority(priority) === false) {
        response.status(400)
        response.send('Invalid Todo Priority')
      } else {
        getQueryPriority = await db.all(getQueryPriority)
        const getPriority = getQueryPriority.map(obj => convertResults(obj))
        response.send(getPriority)
      }

      break

    case checkValues(priority, status):
      status = status.split('%20').join(' ')
      let getQueryWithStatusAndPriority = `
        SELECT * FROM todo WHERE priority = "${priority}" AND status = "${status}";
      `
      if (checkStatus(status) === false) {
        response.status(400)
        response.send('Invalid Todo Status')
      } else if (checkPriority(priority) === false) {
        response.status(400)
        response.send('Invalid Priority Status')
      } else {
        getQueryWithStatusAndPriority = await db.all(
          getQueryWithStatusAndPriority,
        )
        const getQAndPResults = getQueryWithStatusAndPriority.map(obj => {
          return convertResults(obj)
        })
        response.send(getQAndPResults)
      }
      break

    case checkValues(category, status):
      status = status.split('%20').join(' ')
      let getResultsCAndS = `
        SELECT * FROM todo WHERE status = "${status}" AND category = "${category}"
      `

      if (checkCategory(category) === false) {
        response.status(400)
        response.send('Invalid Todo Category')
      } else if (checkStatus(status) === false) {
        response.status(400)
        response.send('Invalid Todo Status')
      } else {
        getResultsCAndS = await db.all(getResultsCAndS)
        const cAndSResults = getResultsCAndS.map(obj => convertResults(obj))
        response.send(cAndSResults)
      }
      break

    case checkValue(category):
      let getQueryC = `
          SELECT * FROM todo WHERE category = "${category}"
        `

      if (checkCategory(category) === false) {
        response.status(400)
        response.send('Invalid Todo Category')
      } else {
        getQueryC = await db.all(getQueryC)
        const resultsC = getQueryC.map(obj => convertResults(obj))
        response.send(resultsC)
      }
      break

    case checkValues(category, priority):
      let getResultsCAndP = `
        SELECT * FROM todo WHERE priority = "${priority}" AND  category = "${category}"
      `

      if (checkCategory(category) === false) {
        response.status(400)
        response.send('Invalid Todo Category')
      } else if (checkPriority(priority) === false) {
        response.status(400)
        response.send('Invalid Todo Priority')
      } else {
        getResultsCAndP = await db.all(getResultsCAndP)
        const cAndPResults = getResultsCAndP.map(obj => convertResults(obj))
        response.send(cAndPResults)
      }
      break

    default:
      let getWithSearch = `
        SELECT * FROM todo WHERE todo LIKE "%${search_q}%";
      `
      getWithSearch = await db.all(getWithSearch)
      const sResults = getWithSearch.map(obj => convertResults(obj))
      response.send(sResults)
  }
})

//API 2
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let getTodo = `
    SELECT * FROM todo WHERE id = ${todoId}
  `
  getTodo = await db.get(getTodo)
  const todo = convertResults(getTodo)
  response.send(todo)
})

//API 3
app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const newDate = dateFns.format(new Date(date), 'yyyy-MM-dd')
  console.log(date)
  console.log(newDate)
  let getByDate = `
      SELECT * FROM todo WHERE due_date = "${newDate}"
  `

  if (checkDueDate(date) === false) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    getByDate = await db.all(getByDate)
    //console.log(getByDate)
    const dateResults = getByDate.map(obj => convertResults(obj))
    response.send(dateResults)
  }
})

//API4
app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body

  if (checkStatus(status) === false) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (checkPriority(priority) === false) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else if (checkCategory(category) === false) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else if (checkDueDate(dueDate) === false) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    let postTodo = `
      INSERT INTO todo (id,todo,category,priority,status,due_date)
      VALUES 
        (
          ${id},
          "${todo}",
          "${category}",
          "${priority}",
          "${status}",
          "${dueDate}"
        )

    `
    const res = await db.run(postTodo)
    console.log(res.lastID)
    response.send('Todo Successfully Added')
  }
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let {todo, priority, status, category, dueDate} = request.body

  const updateTable = async obj => {
    const {name, value, id} = obj
    let putStatus = `
        UPDATE todo
        SET 
          ${name} = "${value}"
        WHERE 
          id = ${id}
      `
    await db.run(putStatus)
    return true
  }
  switch (true) {
    case checkValue(status):
      let obj = {
        name: 'status',
        value: status,
        id: todoId,
      }

      if (checkStatus(status) === false) {
        response.status(400)
        response.send('Invalid Todo Status')
        break
      }

      if (updateTable(obj)) {
        response.send('Status Updated')
      }
      break

    case checkValue(priority):
      const objTwo = {
        name: 'priority',
        value: priority,
        id: todoId,
      }

      if (checkPriority(priority) === false) {
        response.status(400)
        response.send('Invalid Todo Priority')
        break
      }

      if (updateTable(objTwo)) {
        response.send('Priority Updated')
      }
      break

    case checkValue(todo):
      const objThree = {
        name: 'todo',
        value: todo,
        id: todoId,
      }
      if (updateTable(objThree)) {
        response.send('Todo Updated')
      }
      break

    case checkValue(category):
      const objFour = {
        name: 'category',
        value: category,
        id: todoId,
      }

      if (checkCategory(category) === false) {
        response.status(400)
        response.send('Invalid Todo Category')
        break
      }

      if (updateTable(objFour)) {
        response.send('Category Updated')
      }
      break

    case checkValue(dueDate):
      const objFive = {
        name: 'due_date',
        value: dueDate,
        id: todoId,
      }

      if (checkDueDate(dueDate) === false) {
        response.status(400)
        response.send('Invalid Due Date')
        break
      }

      if (updateTable(objFive)) {
        response.send('Due Date Updated')
      }
      break
  }
})

/**let putStatus = `
        UPDATE todo
        SET 
          status = "${status}"
        WHERE 
          id = ${todoId}
      `
      await db.run(putStatus)**/

//DELETE API
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const delTodo = `
      DELETE FROM todo
      WHERE 
        id = ${todoId};
  `
  await db.run(delTodo)
  response.send('Todo Deleted')
})

module.exports = app
