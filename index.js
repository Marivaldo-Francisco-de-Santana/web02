const express = require('express');
const app = express();
const port = 3000;

const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const Sequelize = require('sequelize');
const { Op } = require('sequelize');

/* ===================================
   CONFIGURAÇÕES DO EXPRESS
=================================== */

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: '2C44-1T58-WFpQ350',
    resave: false,
    saveUninitialized: false,

    cookie: {
        maxAge: 3600000 * 2,
        httpOnly: true
    }
}));

/* ===================================
   MIDDLEWARE AUTENTICAÇÃO
=================================== */

function verificarAutenticacao(req, res, next) {

    if (req.session.usuario) {
        return next();
    }

    res.send(`
        <h2>
            Acesso negado!
        </h2>

        <a href="/login">
            Fazer Login
        </a>
    `);

}

/* ===================================
   CONEXÃO MYSQL
=================================== */
/*
    ALTERE A SENHA ABAIXO
    PELA SENHA DO SEU MYSQL
*/

const sequelize = new Sequelize(
    'zacademico',
    'root',
    '123456', // <- TROQUE AQUI
    {
        host: 'localhost',
        dialect: 'mysql',
        port: 3306,
        logging: false
    }
);

/* ===================================
   TESTAR CONEXÃO
=================================== */

sequelize.authenticate()

.then(() => {

    console.log(`
====================================
Conectado ao MySQL!
====================================
`);

})

.catch((erro) => {

    console.log(`
====================================
Erro ao conectar no banco!
====================================
`);

    console.log(erro);

});

/* ===================================
   MODELS
=================================== */

const Departamento = sequelize.define(
    'departamento',
    {

        codigo: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        nome: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },

        descricao: {
            type: Sequelize.STRING
        }

    }
);

const Produto = sequelize.define(
    'produto',
    {

        codigo: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        nome: {
            type: Sequelize.STRING,
            allowNull: false
        },

        preco: {
            type: Sequelize.DOUBLE,
            allowNull: false
        },

        marca: {
            type: Sequelize.STRING,
            allowNull: false
        }

    }
);

const Usuario = sequelize.define(
    'usuario',
    {

        login: {
            type: Sequelize.STRING(15),
            unique: true,
            allowNull: false
        },

        nome: {
            type: Sequelize.STRING(100),
            allowNull: false
        },

        senha: {
            type: Sequelize.STRING(255),
            allowNull: false
        }

    },
    {
        timestamps: false
    }
);

/* ===================================
   RELACIONAMENTOS
=================================== */

Produto.belongsTo(Departamento);
Departamento.hasMany(Produto);

/* ===================================
   SINCRONIZAR TABELAS
=================================== */

sequelize.sync({ force: false })

.then(() => {

    console.log(`
====================================
Tabelas sincronizadas!
====================================
`);

})

.catch((erro) => {

    console.log(`
====================================
Erro ao sincronizar tabelas!
====================================
`);

    console.log(erro);

});

/* ===================================
   HOME
=================================== */

app.get('/', (req, res) => {

    let usuarioLogado = '';

    if (req.session.usuario) {

        usuarioLogado = `
            Olá,
            <b>${req.session.usuario.nome}</b>

            |

            <a href="/logout">
                Sair
            </a>
        `;

    } else {

        usuarioLogado = `
            <a href="/login">
                Login
            </a>

            |

            <a href="/cadUsuario">
                Criar Conta
            </a>
        `;

    }

    res.send(`

        <h1>
            Sistema Web 2
        </h1>

        <p>
            ${usuarioLogado}
        </p>

        <hr>

        <a href="/formCadastro">
            Cadastrar Produto
        </a>

        <br><br>

        <a href="/produtos">
            Listar Produtos
        </a>

        <br><br>

        <a href="/buscaProduto">
            Buscar Produto
        </a>

    `);

});

/* ===================================
   LOGIN
=================================== */

app.get('/login', (req, res) => {

    res.send(`

        <h1>
            Login
        </h1>

        <form action="/autenticar"
              method="POST">

            Login:

            <input type="text"
                   name="login">

            <br><br>

            Senha:

            <input type="password"
                   name="senha">

            <br><br>

            <button>
                Entrar
            </button>

        </form>

    `);

});

/* ===================================
   LOGOUT
=================================== */

app.get('/logout', (req, res) => {

    req.session.destroy((erro) => {

        if (erro) {
            return res.send('Erro ao sair');
        }

        res.clearCookie('connect.sid');

        res.redirect('/');

    });

});

/* ===================================
   CADASTRO USUÁRIO
=================================== */

app.get('/cadUsuario', (req, res) => {

    res.send(`

        <h1>
            Cadastro Usuário
        </h1>

        <form action="/salvarUsuario"
              method="POST">

            Nome:

            <input type="text"
                   name="nome">

            <br><br>

            Login:

            <input type="text"
                   name="login">

            <br><br>

            Senha:

            <input type="password"
                   name="senha">

            <br><br>

            <button>
                Cadastrar
            </button>

        </form>

    `);

});

app.post('/salvarUsuario', async (req, res) => {

    try {

        const {
            nome,
            login,
            senha
        } = req.body;

        if (!nome || !login || !senha) {

            return res.send(`
                Preencha todos os campos
            `);

        }

        const usuarioExistente =
            await Usuario.findOne({

                where: {
                    login
                }

            });

        if (usuarioExistente) {

            return res.send(`
                Login já existe!
            `);

        }

        const senhaCriptografada =
            await bcrypt.hash(senha, 10);

        await Usuario.create({

            nome,
            login,
            senha: senhaCriptografada

        });

        res.send(`

            Usuário cadastrado!

            <br><br>

            <a href="/login">
                Fazer Login
            </a>

        `);

    }

    catch (erro) {

        console.log(erro);

        res.send(`
            Erro ao cadastrar usuário
        `);

    }

});

/* ===================================
   AUTENTICAR
=================================== */

app.post('/autenticar', async (req, res) => {

    try {

        const {
            login,
            senha
        } = req.body;

        const usuario =
            await Usuario.findOne({

                where: {
                    login
                }

            });

        if (!usuario) {

            return res.send(`
                Usuário não encontrado
            `);

        }

        const senhaValida =
            await bcrypt.compare(
                senha,
                usuario.senha
            );

        if (!senhaValida) {

            return res.send(`
                Senha inválida
            `);

        }

        req.session.usuario = {

            id: usuario.id,
            nome: usuario.nome

        };

        res.redirect('/');

    }

    catch (erro) {

        console.log(erro);

        res.send(`
            Erro ao autenticar
        `);

    }

});

/* ===================================
   FORM PRODUTO
=================================== */

app.get(
    '/formCadastro',
    verificarAutenticacao,

    async (req, res) => {

        try {

            const departamentos =
                await Departamento.findAll();

            let options =
                `<option value="">
                    Sem departamento
                 </option>`;

            departamentos.forEach((dep) => {

                options += `
                    <option value="${dep.id}">
                        ${dep.nome}
                    </option>
                `;

            });

            res.send(`

                <h1>
                    Cadastrar Produto
                </h1>

                <form action="/cadProduto"
                      method="POST">

                    Código:

                    <input type="number"
                           name="codigo">

                    <br><br>

                    Nome:

                    <input type="text"
                           name="nome">

                    <br><br>

                    Preço:

                    <input type="text"
                           name="preco">

                    <br><br>

                    Marca:

                    <input type="text"
                           name="marca">

                    <br><br>

                    Departamento:

                    <select name="departamentoId">

                        ${options}

                    </select>

                    <br><br>

                    <button>
                        Salvar
                    </button>

                </form>

            `);

        }

        catch (erro) {

            console.log(erro);

            res.send(`
                Erro ao abrir formulário
            `);

        }

    }
);

/* ===================================
   CADASTRAR PRODUTO
=================================== */

app.post(
    '/cadProduto',
    verificarAutenticacao,

    async (req, res) => {

        try {

            const {
                codigo,
                nome,
                preco,
                marca,
                departamentoId
            } = req.body;

            if (
                !codigo ||
                !nome ||
                !preco ||
                !marca
            ) {

                return res.send(`
                    Preencha todos os campos
                `);

            }

            const produto =
                await Produto.create({

                    codigo,
                    nome,
                    preco,
                    marca,
                    departamentoId:
                        departamentoId || null

                });

            res.send(`

                Produto cadastrado!

                <br><br>

                ID:
                ${produto.id}

                <br><br>

                <a href="/produtos">
                    Ver Produtos
                </a>

            `);

        }

        catch (erro) {

            console.log(erro);

            res.send(`
                Erro ao cadastrar produto
            `);

        }

    }
);

/* ===================================
   LISTAR PRODUTOS
=================================== */

app.get(
    '/produtos',
    verificarAutenticacao,

    async (req, res) => {

        try {

            const produtos =
                await Produto.findAll({

                    include: Departamento

                });

            let tabela = `

                <h1>
                    Produtos
                </h1>

                <table border="1"
                       cellpadding="10">

                    <tr>

                        <th>ID</th>
                        <th>Código</th>
                        <th>Nome</th>
                        <th>Preço</th>
                        <th>Marca</th>
                        <th>Departamento</th>
                        <th>Ações</th>

                    </tr>

            `;

            produtos.forEach((produto) => {

                const departamento =
                    produto.departamento
                    ? produto.departamento.nome
                    : 'Nenhum';

                tabela += `

                    <tr>

                        <td>${produto.id}</td>

                        <td>${produto.codigo}</td>

                        <td>${produto.nome}</td>

                        <td>${produto.preco}</td>

                        <td>${produto.marca}</td>

                        <td>${departamento}</td>

                        <td>

                            <a href="/formUpdate?id=${produto.id}">
                                Editar
                            </a>

                            |

                            <a href="/excluiProduto?id=${produto.id}">
                                Excluir
                            </a>

                        </td>

                    </tr>

                `;

            });

            tabela += `
                </table>

                <br>

                <a href="/">
                    Voltar
                </a>
            `;

            res.send(tabela);

        }

        catch (erro) {

            console.log(erro);

            res.send(`
                Erro ao listar produtos
            `);

        }

    }
);

/* ===================================
   BUSCAR PRODUTO
=================================== */

app.get('/buscaProduto', (req, res) => {

    res.send(`

        <h1>
            Buscar Produto
        </h1>

        <form action="/procuraProduto"
              method="POST">

            Nome:

            <input type="text"
                   name="nome">

            <button>
                Buscar
            </button>

        </form>

    `);

});

app.post('/procuraProduto', async (req, res) => {

    try {

        const { nome } = req.body;

        const produtos =
            await Produto.findAll({

                where: {

                    nome: {
                        [Op.substring]: nome
                    }

                }

            });

        let html = `
            <h1>
                Resultado
            </h1>
        `;

        produtos.forEach((produto) => {

            html += `

                <p>

                    ${produto.nome}
                    -
                    R$ ${produto.preco}

                </p>

            `;

        });

        html += `
            <a href="/">
                Voltar
            </a>
        `;

        res.send(html);

    }

    catch (erro) {

        console.log(erro);

        res.send(`
            Erro na busca
        `);

    }

});

/* ===================================
   EXCLUIR PRODUTO
=================================== */

app.get(
    '/excluiProduto',
    verificarAutenticacao,

    async (req, res) => {

        try {

            const { id } = req.query;

            await Produto.destroy({

                where: {
                    id
                }

            });

            res.redirect('/produtos');

        }

        catch (erro) {

            console.log(erro);

            res.send(`
                Erro ao excluir
            `);

        }

    }
);

/* ===================================
   UPDATE FORM
=================================== */

app.get(
    '/formUpdate',
    verificarAutenticacao,

    async (req, res) => {

        try {

            const { id } = req.query;

            const produto =
                await Produto.findByPk(id);

            if (!produto) {

                return res.send(`
                    Produto não encontrado
                `);

            }

            res.send(`

                <h1>
                    Atualizar Produto
                </h1>

                <form action="/updProduto"
                      method="POST">

                    <input type="hidden"
                           name="id"
                           value="${produto.id}">

                    Código:

                    <input type="number"
                           name="codigo"
                           value="${produto.codigo}">

                    <br><br>

                    Nome:

                    <input type="text"
                           name="nome"
                           value="${produto.nome}">

                    <br><br>

                    Preço:

                    <input type="text"
                           name="preco"
                           value="${produto.preco}">

                    <br><br>

                    Marca:

                    <input type="text"
                           name="marca"
                           value="${produto.marca}">

                    <br><br>

                    <button>
                        Atualizar
                    </button>

                </form>

            `);

        }

        catch (erro) {

            console.log(erro);

            res.send(`
                Erro ao abrir update
            `);

        }

    }
);

/* ===================================
   UPDATE PRODUTO
=================================== */

app.post(
    '/updProduto',
    verificarAutenticacao,

    async (req, res) => {

        try {

            const {
                id,
                codigo,
                nome,
                preco,
                marca
            } = req.body;

            await Produto.update(

                {
                    codigo,
                    nome,
                    preco,
                    marca
                },

                {
                    where: {
                        id
                    }
                }

            );

            res.redirect('/produtos');

        }

        catch (erro) {

            console.log(erro);

            res.send(`
                Erro ao atualizar
            `);

        }

    }
);

/* ===================================
   SERVIDOR
=================================== */

app.listen(port, () => {

    console.log(`

====================================
Servidor rodando:
http://localhost:${port}
====================================

`);

});