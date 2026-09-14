import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  appScreen: document.querySelector("#appScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  userEmail: document.querySelector("#userEmail"),
  availableCount: document.querySelector("#availableCount"),
  borrowedCount: document.querySelector("#borrowedCount"),
  availableList: document.querySelector("#availableList"),
  borrowedList: document.querySelector("#borrowedList"),
  registerForm: document.querySelector("#registerForm"),
  thermalName: document.querySelector("#thermalName"),
  registerMessage: document.querySelector("#registerMessage"),
  loanForm: document.querySelector("#loanForm"),
  loanThermal: document.querySelector("#loanThermal"),
  loanPerson: document.querySelector("#loanPerson"),
  loanLocation: document.querySelector("#loanLocation"),
  loanMessage: document.querySelector("#loanMessage"),
  returnForm: document.querySelector("#returnForm"),
  returnThermal: document.querySelector("#returnThermal"),
  returnMessage: document.querySelector("#returnMessage"),
  toast: document.querySelector("#toast")
};

let thermalItems = [];
let unsubscribeThermals = null;
let toastTimer = null;

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2600);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  clearMessages();
  fillSelects();
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function clearMessages() {
  els.loginMessage.textContent = "";
  els.registerMessage.textContent = "";
  els.loanMessage.textContent = "";
  els.returnMessage.textContent = "";
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(timestamp.toDate());
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLists() {
  const available = thermalItems.filter(item => item.status === "disponivel");
  const borrowed = thermalItems.filter(item => item.status === "emprestada");

  els.availableCount.textContent = available.length;
  els.borrowedCount.textContent = borrowed.length;

  els.availableList.innerHTML = available.length
    ? available.map(item => `
        <article class="item-card">
          <div class="item-card-top">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="status-badge">Disponível</span>
          </div>
          <div class="item-meta">
            <span>Cadastrada por: ${escapeHtml(item.createdByEmail || "Equipe")}</span>
          </div>
        </article>
      `).join("")
    : `<div class="empty-state">Nenhuma térmica disponível.</div>`;

  els.borrowedList.innerHTML = borrowed.length
    ? borrowed.map(item => `
        <article class="item-card">
          <div class="item-card-top">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="status-badge borrowed">Emprestada</span>
          </div>
          <div class="item-meta">
            <span><strong>Para:</strong> ${escapeHtml(item.borrowedTo || "-")}</span>
            <span><strong>Onde:</strong> ${escapeHtml(item.borrowedLocation || "-")}</span>
            <span><strong>Quando:</strong> ${formatDate(item.borrowedAt)}</span>
            <span><strong>Lançado por:</strong> ${escapeHtml(item.borrowedByEmail || "Equipe")}</span>
          </div>
        </article>
      `).join("")
    : `<div class="empty-state">Nenhuma térmica emprestada.</div>`;

  fillSelects();
}

function fillSelects() {
  const available = thermalItems.filter(item => item.status === "disponivel");
  const borrowed = thermalItems.filter(item => item.status === "emprestada");

  els.loanThermal.innerHTML = `<option value="">Selecione...</option>` +
    available.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("");

  els.returnThermal.innerHTML = `<option value="">Selecione...</option>` +
    borrowed.map(item => `<option value="${item.id}">${escapeHtml(item.name)} — ${escapeHtml(item.borrowedTo || "")}</option>`).join("");
}

function startRealtimeListener() {
  unsubscribeThermals?.();
  const q = query(collection(db, "thermals"), orderBy("name"));

  unsubscribeThermals = onSnapshot(q, snapshot => {
    thermalItems = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderLists();
  }, error => {
    console.error(error);
    showToast("Não foi possível carregar as térmicas.");
  });
}

els.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessages();
  const submitButton = event.submitter;
  submitButton.disabled = true;
  submitButton.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(
      auth,
      els.loginEmail.value.trim(),
      els.loginPassword.value
    );
    els.loginForm.reset();
  } catch (error) {
    console.error(error);
    els.loginMessage.textContent = "E-mail ou senha incorretos, ou usuário não autorizado.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

els.registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.registerMessage.textContent = "";
  const submitButton = event.submitter;
  submitButton.disabled = true;

  try {
    const name = els.thermalName.value.trim();
    if (!name) throw new Error("Informe o nome.");

    await addDoc(collection(db, "thermals"), {
      name,
      status: "disponivel",
      createdAt: serverTimestamp(),
      createdByUid: auth.currentUser.uid,
      createdByEmail: auth.currentUser.email
    });

    els.registerForm.reset();
    closeModal(document.querySelector("#registerModal"));
    showToast("Térmica cadastrada.");
  } catch (error) {
    console.error(error);
    els.registerMessage.textContent = error.message || "Erro ao cadastrar.";
  } finally {
    submitButton.disabled = false;
  }
});

els.loanForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.loanMessage.textContent = "";
  const submitButton = event.submitter;
  submitButton.disabled = true;

  const thermalId = els.loanThermal.value;
  const person = els.loanPerson.value.trim();
  const location = els.loanLocation.value.trim();

  try {
    if (!thermalId || !person || !location) throw new Error("Preencha todos os campos.");

    const thermalRef = doc(db, "thermals", thermalId);

    await runTransaction(db, async transaction => {
      const thermalSnap = await transaction.get(thermalRef);
      if (!thermalSnap.exists()) throw new Error("Térmica não encontrada.");
      if (thermalSnap.data().status !== "disponivel") {
        throw new Error("Essa térmica já foi emprestada por outro usuário.");
      }

      transaction.update(thermalRef, {
        status: "emprestada",
        borrowedTo: person,
        borrowedLocation: location,
        borrowedAt: serverTimestamp(),
        borrowedByUid: auth.currentUser.uid,
        borrowedByEmail: auth.currentUser.email
      });
    });

    await addDoc(collection(db, "movements"), {
      type: "emprestimo",
      thermalId,
      thermalName: thermalItems.find(item => item.id === thermalId)?.name || "Térmica",
      person,
      location,
      createdAt: serverTimestamp(),
      userUid: auth.currentUser.uid,
      userEmail: auth.currentUser.email
    });

    els.loanForm.reset();
    closeModal(document.querySelector("#loanModal"));
    showToast("Empréstimo registrado.");
  } catch (error) {
    console.error(error);
    els.loanMessage.textContent = error.message || "Erro ao emprestar.";
  } finally {
    submitButton.disabled = false;
  }
});

els.returnForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.returnMessage.textContent = "";
  const submitButton = event.submitter;
  submitButton.disabled = true;
  const thermalId = els.returnThermal.value;

  try {
    if (!thermalId) throw new Error("Selecione uma térmica.");
    const thermalRef = doc(db, "thermals", thermalId);
    let oldData = null;

    await runTransaction(db, async transaction => {
      const thermalSnap = await transaction.get(thermalRef);
      if (!thermalSnap.exists()) throw new Error("Térmica não encontrada.");
      oldData = thermalSnap.data();
      if (oldData.status !== "emprestada") {
        throw new Error("Essa térmica já foi devolvida por outro usuário.");
      }

      transaction.update(thermalRef, {
        status: "disponivel",
        borrowedTo: null,
        borrowedLocation: null,
        borrowedAt: null,
        borrowedByUid: null,
        borrowedByEmail: null,
        returnedAt: serverTimestamp(),
        returnedByUid: auth.currentUser.uid,
        returnedByEmail: auth.currentUser.email
      });
    });

    await addDoc(collection(db, "movements"), {
      type: "devolucao",
      thermalId,
      thermalName: oldData?.name || "Térmica",
      previousPerson: oldData?.borrowedTo || "",
      previousLocation: oldData?.borrowedLocation || "",
      createdAt: serverTimestamp(),
      userUid: auth.currentUser.uid,
      userEmail: auth.currentUser.email
    });

    els.returnForm.reset();
    closeModal(document.querySelector("#returnModal"));
    showToast("Devolução registrada.");
  } catch (error) {
    console.error(error);
    els.returnMessage.textContent = error.message || "Erro ao devolver.";
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll("[data-open-modal]").forEach(button => {
  button.addEventListener("click", () => openModal(button.dataset.openModal));
});

document.querySelectorAll("[data-close-modal]").forEach(button => {
  button.addEventListener("click", () => closeModal(button.closest(".modal")));
});

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal:not(.hidden)").forEach(closeModal);
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    els.loginScreen.classList.add("hidden");
    els.appScreen.classList.remove("hidden");
    els.userEmail.textContent = user.email || "Usuário";
    startRealtimeListener();
  } else {
    unsubscribeThermals?.();
    unsubscribeThermals = null;
    thermalItems = [];
    els.appScreen.classList.add("hidden");
    els.loginScreen.classList.remove("hidden");
    els.userEmail.textContent = "-";
    els.availableCount.textContent = "0";
    els.borrowedCount.textContent = "0";
    els.availableList.innerHTML = "";
    els.borrowedList.innerHTML = "";
  }
});
