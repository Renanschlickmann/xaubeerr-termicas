# Controle de Térmicas — Firebase

Sistema simples, responsivo e focado em celular para uma equipe controlar térmicas disponíveis e emprestadas.

## O que já funciona

- Login individual por e-mail e senha.
- Dados compartilhados entre todos os usuários autorizados.
- Cadastro de térmicas.
- Empréstimo com seleção da térmica, pessoa, local e data/hora automática.
- Devolução com um toque.
- Contadores de disponíveis e emprestadas.
- Atualização em tempo real entre aparelhos.
- Histórico técnico na coleção `movements`.
- Proteção contra duas pessoas emprestarem/devolverem a mesma térmica ao mesmo tempo usando transações do Firestore.

---

# CONFIGURAÇÃO DO FIREBASE — PASSO A PASSO

## 1. Criar o projeto

1. Entre em https://console.firebase.google.com/
2. Clique em **Criar um projeto**.
3. Dê um nome, por exemplo: `controle-termicas`.
4. Pode deixar o Google Analytics desativado se não precisar.
5. Termine a criação.

## 2. Criar o app Web

1. Dentro do projeto, clique no ícone **Web `</>`**.
2. Nome: `Controle de Térmicas`.
3. Não é obrigatório ativar Firebase Hosting neste momento.
4. Clique em **Registrar app**.
5. O Firebase mostrará um objeto parecido com:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

6. Abra o arquivo `firebase-config.js` desta pasta.
7. Substitua os valores `COLE_AQUI` pelos valores do seu projeto.

> O objeto `firebaseConfig` de um app Web não é uma senha do banco. A proteção real dos dados é feita pelo Authentication e pelas Security Rules.

## 3. Ativar login por e-mail e senha

1. Firebase Console > **Authentication**.
2. Clique em **Get started / Começar**.
3. Vá em **Sign-in method / Método de login**.
4. Abra **E-mail/senha**.
5. Ative a primeira opção de e-mail/senha.
6. Salve.

## 4. Criar seu usuário e os usuários dos funcionários

1. Firebase Console > **Authentication** > **Users / Usuários**.
2. Clique em **Add user / Adicionar usuário**.
3. Coloque o e-mail e uma senha.
4. Repita para cada funcionário.

O site não tem cadastro aberto. Portanto, somente as contas que você criar no Firebase conseguirão entrar.

## 5. Criar o Firestore

1. Firebase Console > **Firestore Database**.
2. Clique em **Create database / Criar banco de dados**.
3. Escolha uma região próxima dos usuários.
4. Pode iniciar em **Production mode / Modo de produção**.
5. Conclua.

Não precisa criar as coleções manualmente. O sistema cria `thermals` e `movements` no primeiro uso.

## 6. Colocar as regras de segurança

1. Firebase Console > **Firestore Database** > aba **Rules / Regras**.
2. Abra o arquivo `firestore.rules` desta pasta.
3. Copie todo o conteúdo.
4. Cole no editor de regras do Firebase.
5. Clique em **Publish / Publicar**.

Essas regras permitem que somente usuários autenticados leiam e alterem os dados previstos pelo sistema.

## 7. Rodar no VS Code

Não abra o `index.html` clicando duas vezes, porque módulos JavaScript funcionam melhor por um servidor local.

### Opção fácil: Live Server

1. Abra a pasta no VS Code.
2. Instale a extensão **Live Server** se ainda não tiver.
3. Abra `index.html`.
4. Clique em **Go Live** no canto inferior do VS Code.
5. O navegador vai abrir o sistema.

## 8. Testar a sincronização

1. Entre no sistema com sua conta em um navegador.
2. Entre com a conta de um funcionário em outro celular/navegador.
3. Cadastre ou empreste uma térmica em um aparelho.
4. O outro aparelho deve atualizar automaticamente.

---

# Estrutura da pasta

```text
controle-termicas-firebase/
├── index.html
├── style.css
├── app.js
├── firebase-config.js
├── firestore.rules
└── README.md
```

# Observação para uso real

Para colocar o sistema na internet, você pode publicar depois no Firebase Hosting, GitHub Pages, Netlify ou outro serviço HTTPS. Para uso por celular fora da mesma rede, ele precisa estar hospedado em um endereço acessível pela internet.
