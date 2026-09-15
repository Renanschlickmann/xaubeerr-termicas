# Controle de Térmicas — versão por quantidade

Versão reorganizada para controlar muitas térmicas sem cadastrar uma por uma.

## O que mudou

- Cadastro por **litragem + quantidade total**.
  - Ex.: `50 L = 20 unidades`.
  - Ex.: `240 L = 8 unidades`.
- Empréstimo por **tamanho + quantidade**.
- O estoque disponível é reduzido automaticamente no empréstimo.
- Na tela **Emprestadas**, o nome da pessoa aparece em destaque.
- Botão **Devolver** diretamente no cartão do empréstimo.
- A devolução já abre com a quantidade total preenchida; se houver devolução parcial, basta alterar o número.
- Menu inferior separado em:
  - Início
  - Disponíveis
  - Emprestadas
  - Extrato
- Campo de busca pelo nome da pessoa na tela de emprestadas.
- Extrato de cadastro/ajuste de estoque, empréstimos e devoluções.
- Login individual e sincronização em tempo real continuam funcionando.

---

# IMPORTANTE SE A SUA VERSÃO ATUAL JÁ ESTÁ FUNCIONANDO

Se você já colocou os dados reais do Firebase no arquivo `firebase-config.js`, **não perca esse arquivo**.

Para atualizar com segurança:

1. Faça uma cópia da sua pasta atual.
2. Copie desta versão nova:
   - `index.html`
   - `style.css`
   - `app.js`
   - `firestore.rules`
3. Mantenha o seu `firebase-config.js` atual, que já está configurado.
4. Publique novamente as regras do arquivo `firestore.rules` no Firebase Console.

O `firebase-config.js` deste ZIP continua com os campos `COLE_AQUI` porque as chaves do seu projeto ficam na sua cópia local.

---

# NOVA ESTRUTURA DO FIRESTORE

Esta versão usa três coleções principais:

## `inventory`
Um documento para cada tamanho de térmica.

Exemplo para 50 litros:

```text
inventory/50
  liters: 50
  totalQuantity: 20
  availableQuantity: 15
```

Nesse exemplo existem 20 térmicas de 50 L no total e 5 estão emprestadas.

## `loans`
Cada empréstimo vira um registro com:

```text
person
location
liters
quantityBorrowed
quantityOutstanding
status
borrowedAt
borrowedByEmail
```

## `movements`
É o extrato. Registra:

- ajuste de estoque;
- empréstimo;
- devolução.

---

# ATENÇÃO AOS DADOS DA VERSÃO ANTIGA

A versão anterior cadastrava cada térmica individualmente na coleção `thermals`.

Esta versão nova trabalha por quantidade e usa `inventory` + `loans`. Os documentos antigos em `thermals` não são apagados, mas também não entram automaticamente nos novos totais.

Se você ainda estava apenas testando, basta cadastrar o estoque real novamente pela nova tela.

Se já existem muitos dados reais na versão antiga, mantenha um backup antes da troca.

---

# FIREBASE — REGRAS

No Firebase Console:

1. Abra **Firestore Database**.
2. Vá em **Rules / Regras**.
3. Copie todo o conteúdo do arquivo `firestore.rules`.
4. Substitua as regras atuais.
5. Clique em **Publish / Publicar**.

As regras permitem acesso apenas a usuários autenticados e liberam as novas coleções `inventory`, `loans` e `movements`.

---

# COMO RODAR NO VS CODE

1. Abra a pasta no VS Code.
2. Confira se o seu `firebase-config.js` está preenchido.
3. Abra `index.html`.
4. Use a extensão **Live Server**.
5. Clique em **Go Live**.
6. Entre com um dos usuários cadastrados no Firebase Authentication.

---

# COMO USAR

## Primeiro cadastro

Abra **Cadastrar**.

Exemplo:

```text
Tamanho: 50
Quantidade total: 20
```

Depois cadastre outro tamanho:

```text
Tamanho: 240
Quantidade total: 8
```

## Empréstimo

Abra **Emprestar** e informe:

```text
Tamanho: 50 L
Quantidade: 5
Para quem: João
Onde: Festa da comunidade
```

O sistema passa de 20 disponíveis para 15 disponíveis e cria um empréstimo de 5 para João.

## Devolução

1. Abra o menu **Emprestadas**.
2. Procure pelo nome da pessoa.
3. Toque em **Devolver** no cartão dela.
4. A quantidade total pendente já aparece preenchida.
5. Confirme.

Se foram emprestadas 5 e voltaram somente 3, altere a quantidade para 3. O empréstimo continuará mostrando 2 pendentes.

---

# Arquivos

```text
controle-termicas-firebase-v2/
├── index.html
├── style.css
├── app.js
├── firebase-config.js
├── firestore.rules
└── README.md
```
