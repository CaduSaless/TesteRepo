import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import  jwt from "jsonwebtoken"
import { pool } from './config/bd.js';
import cookieParser from 'cookie-parser'
import fileupload from 'express-fileupload'
import createTables from './config/init.js'

asd
awdaw
das
da
wd
aw
asdawefd
aw
//Inicializando as dependências
dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser())
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://192.168.100.204:3000"],
  credentials: true
}

));
app.use(fileupload())

//Iniciando o servidor
const port = process.env.PORT || 5000;
createTables().then(() => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}/`);
  })
})

app.get('/', (req, res) => {
  res.send('API is running...');
});

//Rotas

//5. Autenticação do usuário: Apenas verifica se está ou não logado

app.get('/auth', async (req, res) => {
  const token = req.cookies['token_login']

  if(!token) {
    return res.status(401).json({message: 'Unauthorized'})
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY)
    const user = await pool.query("select * from usuarios where id = $1", [decoded.id])
    if(!user.rows[0]) {
      return res.status(401).json({message: 'Unauthorized'})
    }
    return res.status(201).json(user.rows[0]);
  } catch(err) {
    return res.status(401).json({message: 'Ocorreu um erro, tente novamente'})
  } 
});

//6. Login: Efetua o login do usuário, criando um cookie para ser utilizado nas requisições

app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  console.log(req.body);

  const user = await pool.query('select * from usuarios where email= $1', [email]);
  const password = user.rows[0]?.senha_hash || '';
  console.log(user.rows);
  console.log("PASSWORD:", password, "SENHA:", senha);
  if(!user || password != senha) {
    return res.status(401).json({ message: "Invalid email or password" })
  }
  const token = jwt.sign({ id: user.rows[0].id }, process.env.SECRET_KEY, { expiresIn: '1h' });
  const isProd = process.env.NODE_ENV === 'production';
  console.log("IS PROD:", isProd);
  res.cookie('token_login', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'none',
    maxAge: 60 * 60 * 1000, // 1 hora
  })

  return res.status(201).json({ user: user.rows[0] });
});

//7. Cria um Login: Cria o login do usuário, além de também entregar o cookie para ser utilizado nas requisições


app.post('/auth/new', async (req, res) => {  
  console.log(req.body);
  const { email, senha, nome, cpf, telefone } = req.body;
  
  if(!email || !senha || !nome || !cpf || !telefone) {
    console.log('Chegou aqui');	
    return res.status(401).json({ message: "Missing arguments" })
  }
  try {
    const existingUser = await pool.query('select * from usuarios where email = $1 or cpf = $2', [email, cpf]);
    if(existingUser.rows.length > 0) {
      console.log(existingUser.rows);
      return res.status(401).json({ message: "User already exists with this email or CPF" })
    }
  } catch(err) {
    return res.status(500).json({ message: "Internal server error" })
    
  } finally {
    const user = await pool.query('insert into usuarios (email, senha_hash, nome, cpf, telefone) values ($1, $2, $3, $4, $5) returning *', [email, senha, nome, cpf, telefone]); 
    const token = jwt.sign({ id: user.rows[0].id }, process.env.SECRET_KEY, { expiresIn: '1h' });
    const isProd = process.env.NODE_ENV === 'production';
    
    res.cookie('token_login', token, {
      secure: true,
      maxAge: 60 * 60 * 1000, // 1 hora
      sameSite: 'none',
      httpOnly: true
    })
    res.status(201).json(user.rows[0]);
  }
});

//8. *Defeituosa Desconectaria em tese, o usuário logado deixaria de estar logado.

app.post('/auth/logout', async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  try {
    res.clearCookie("token_login", {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 0,
    });
  } catch(err) {
    return res.status(401).json({ message: "Erro ao fazer logout"})
  }
  
  return res.status(201).send("Cookie removido");
});
