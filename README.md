# Controle de Térmicas — V3

Versão por quantidade + melhorias para uso no celular.

## Novidades da V3

- Cadastro por litragem + quantidade total.
- Empréstimo por quantidade.
- Devolução direta pelo cartão da pessoa.
- Devolução parcial.
- Menus: Início, Disponíveis, Emprestadas e Extrato.
- **Salvar login neste aparelho** usando a persistência segura do Firebase Authentication.
- O sistema **não grava a senha em texto** no navegador.
- Correção para evitar zoom acidental no celular.
- Campos com fonte de 16px para evitar o zoom automático do iPhone ao focar inputs.
- Service Worker com estratégia **network-first**: tenta baixar a versão publicada mais nova antes de usar cache.
- Verificação automática de versão ao abrir o app, voltar para ele, recuperar internet e a cada 5 minutos.
- Uso offline básico da última versão carregada.

---

# IMPORTANTE: se o seu Firebase já está funcionando

**Não substitua o seu `firebase-config.js` configurado.**

O arquivo `firebase-config.js` deste ZIP está apenas como modelo. Mantenha o arquivo da sua instalação atual, que contém a configuração real do seu projeto Firebase.

Para atualizar sua pasta atual, faça backup e copie/substitua:

- `index.html`
- `style.css`
- `app.js`
- `sw.js`
- `version.json`
- `manifest.webmanifest`

O `firestore.rules` não mudou por causa dessas melhorias; pode manter as regras da V2 se já estão funcionando.

---

# Salvar login

Na tela de login existe a opção:

`Salvar login neste aparelho`

- Marcada: o Firebase mantém a sessão mesmo fechando e abrindo o navegador/app.
- Desmarcada: a autenticação usa persistência apenas da sessão do navegador.
- O e-mail pode ser lembrado localmente para facilitar o próximo acesso.
- A senha não é salva pelo código do sistema.

Ao tocar em **Sair**, a sessão Firebase é encerrada normalmente.

---

# Atualização automática / cache

A V3 contém:

- `sw.js`: Service Worker.
- `version.json`: número da versão publicada.

O Service Worker busca os arquivos na internet primeiro, usando o cache apenas quando necessário. Isso evita que o celular fique preso numa versão antiga depois de uma publicação nova.

O sistema também consulta `version.json` sem cache. Quando o número mudar, mostra:

`Nova versão encontrada. Atualizando...`

e recarrega o sistema.

## Nas próximas versões

Ao criar uma nova versão, altere o número em `version.json`, por exemplo:

```json
{
  "version": "3.1.0"
}
```

Também é recomendado alterar a constante `APP_VERSION` no início do `app.js` para o mesmo número, embora a detecção automática use principalmente `version.json`.

Depois publique todos os arquivos novos no Firebase Hosting.

---

# Evitar zoom no celular

A V3 inclui:

- viewport limitado à escala 1;
- `touch-action: manipulation` nos controles;
- inputs/selects com 16px, evitando o zoom automático do Safari/iPhone ao tocar em um campo.

---

# Publicação

Depois de substituir os arquivos na pasta que você já usa, publique novamente o site no Firebase Hosting da mesma forma que já publica seu projeto.

Se usa Firebase CLI, normalmente o passo final é executado na pasta configurada para Hosting:

```bash
firebase deploy --only hosting
```

Não apague o Firestore nem os usuários do Authentication para fazer uma atualização do site.

---

# Estrutura

```text
controle-termicas-firebase-v3/
├── index.html
├── style.css
├── app.js
├── firebase-config.js   ← mantenha o SEU arquivo já configurado
├── firestore.rules
├── sw.js
├── version.json
├── manifest.webmanifest
└── README.md
```
