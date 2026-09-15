import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
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
  rememberLogin: document.querySelector("#rememberLogin"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  userEmail: document.querySelector("#userEmail"),
  availableCount: document.querySelector("#availableCount"),
  borrowedCount: document.querySelector("#borrowedCount"),
  availableList: document.querySelector("#availableList"),
  borrowedList: document.querySelector("#borrowedList"),
  historyList: document.querySelector("#historyList"),
  borrowedSearch: document.querySelector("#borrowedSearch"),

  stockForm: document.querySelector("#stockForm"),
  stockLiters: document.querySelector("#stockLiters"),
  stockQuantity: document.querySelector("#stockQuantity"),
  stockMessage: document.querySelector("#stockMessage"),

  loanForm: document.querySelector("#loanForm"),
  loanInventory: document.querySelector("#loanInventory"),
  loanQuantity: document.querySelector("#loanQuantity"),
  loanAvailableHint: document.querySelector("#loanAvailableHint"),
  loanPerson: document.querySelector("#loanPerson"),
  loanLocation: document.querySelector("#loanLocation"),
  loanMessage: document.querySelector("#loanMessage"),

  returnForm: document.querySelector("#returnForm"),
  returnLoanId: document.querySelector("#returnLoanId"),
  returnQuantity: document.querySelector("#returnQuantity"),
  returnSummary: document.querySelector("#returnSummary"),
  returnMessage: document.querySelector("#returnMessage"),

  toast: document.querySelector("#toast")
};

let inventoryItems = [];
let loans = [];
let movements = [];
let unsubscribeInventory = null;
let unsubscribeLoans = null;
let unsubscribeMovements = null;
let toastTimer = null;

const APP_VERSION = "3.1.0";
const REMEMBER_LOGIN_KEY = "termicas_remember_login";
const REMEMBER_EMAIL_KEY = "termicas_login_email";
const APP_VERSION_KEY = "termicas_app_version";

function restoreLoginPreference() {
  const remember = localStorage.getItem(REMEMBER_LOGIN_KEY) === "1";
  els.rememberLogin.checked = remember;
  if (remember) {
    els.loginEmail.value = localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
  }
}

async function configureLoginPersistence() {
  const remember = els.rememberLogin.checked;
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

  if (remember) {
    localStorage.setItem(REMEMBER_LOGIN_KEY, "1");
    localStorage.setItem(REMEMBER_EMAIL_KEY, els.loginEmail.value.trim());
  } else {
    localStorage.removeItem(REMEMBER_LOGIN_KEY);
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }
}

async function checkAppVersion() {
  try {
    const response = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const remoteVersion = String(data.version || "").trim();
    if (!remoteVersion) return;

    const previousVersion = localStorage.getItem(APP_VERSION_KEY);
    if (!previousVersion) {
      localStorage.setItem(APP_VERSION_KEY, remoteVersion);
      return;
    }

    if (previousVersion !== remoteVersion) {
      localStorage.setItem(APP_VERSION_KEY, remoteVersion);
      showToast("Nova versão encontrada. Atualizando...");
      setTimeout(() => window.location.reload(), 900);
    }
  } catch (error) {
    console.debug("Verificação de versão indisponível:", error);
  }
}

function registerAutoUpdate() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
      await registration.update();

      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });

      window.addEventListener("online", () => {
        registration.update().catch(() => {});
        checkAppVersion();
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
          checkAppVersion();
        }
      });

      setInterval(() => {
        registration.update().catch(() => {});
        checkAppVersion();
      }, 5 * 60 * 1000);
    } catch (error) {
      console.debug("Service Worker não pôde ser registrado:", error);
    }
  });
}

function currentUserData() {
  return {
    uid: auth.currentUser?.uid || "",
    email: auth.currentUser?.email || "Equipe"
  };
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2700);
}

function clearMessages() {
  els.loginMessage.textContent = "";
  els.stockMessage.textContent = "";
  els.loanMessage.textContent = "";
  els.returnMessage.textContent = "";
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  clearMessages();
  if (id === "loanModal") fillLoanInventory();
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function setActiveView(viewName) {
  document.querySelectorAll(".app-view").forEach(view => view.classList.add("hidden"));
  document.querySelector(`#view-${viewName}`)?.classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(timestamp.toDate());
}

function pluralThermal(quantity) {
  return quantity === 1 ? "térmica" : "térmicas";
}

function getActiveLoans() {
  return loans.filter(item => item.status === "ativo" && Number(item.quantityOutstanding) > 0);
}

function updateStats() {
  const available = inventoryItems.reduce((sum, item) => sum + Number(item.availableQuantity || 0), 0);
  const borrowed = getActiveLoans().reduce((sum, item) => sum + Number(item.quantityOutstanding || 0), 0);
  els.availableCount.textContent = available;
  els.borrowedCount.textContent = borrowed;
}

function renderAvailable() {
  const sorted = [...inventoryItems].sort((a, b) => Number(a.liters) - Number(b.liters));

  els.availableList.innerHTML = sorted.length
    ? sorted.map(item => {
        const total = Number(item.totalQuantity || 0);
        const available = Number(item.availableQuantity || 0);
        const borrowed = Math.max(0, total - available);
        return `
          <article class="item-card">
            <div class="item-card-top">
              <div class="item-title-block">
                <span class="item-name">Térmicas de ${escapeHtml(item.liters)} L</span>
                <span class="item-subtitle">Estoque por tamanho</span>
              </div>
              <span class="status-badge">${available} disponíveis</span>
            </div>
            <div class="stock-numbers">
              <div class="stock-number"><span>Total</span><strong>${total}</strong></div>
              <div class="stock-number"><span>Disponíveis</span><strong>${available}</strong></div>
              <div class="stock-number"><span>Emprestadas</span><strong>${borrowed}</strong></div>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">Nenhum tamanho cadastrado ainda.<br>Toque em <strong>+ Estoque</strong> para informar quantas térmicas você tem.</div>`;

  fillLoanInventory();
}

function renderBorrowed() {
  const term = normalizeText(els.borrowedSearch.value);
  const active = getActiveLoans().filter(item => {
    if (!term) return true;
    return [item.person, item.location, item.liters, item.quantityOutstanding]
      .some(value => normalizeText(value).includes(term));
  });

  els.borrowedList.innerHTML = active.length
    ? active.map(item => {
        const qty = Number(item.quantityOutstanding || 0);
        return `
          <article class="item-card">
            <div class="item-card-top">
              <div class="item-title-block">
                <span class="item-name">${escapeHtml(item.person || "Sem nome")}</span>
                <span class="item-subtitle">${qty} ${pluralThermal(qty)} de ${escapeHtml(item.liters)} L</span>
              </div>
              <span class="status-badge borrowed">Emprestada</span>
            </div>
            <div class="item-meta">
              <span><strong>Onde:</strong> ${escapeHtml(item.location || "-")}</span>
              <span><strong>Quando:</strong> ${formatDate(item.borrowedAt)}</span>
              <span><strong>Lançado por:</strong> ${escapeHtml(item.borrowedByEmail || "Equipe")}</span>
            </div>
            <div class="item-actions">
              <button class="return-btn" data-return-loan="${item.id}" type="button">Devolver</button>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">${term ? "Nenhum empréstimo encontrado para essa busca." : "Nenhuma térmica emprestada no momento."}</div>`;
}

function movementPresentation(item) {
  const qty = Number(item.quantity || 0);
  const liters = item.liters ? `${item.liters} L` : "térmicas";

  if (item.type === "emprestimo") {
    return {
      icon: "↗",
      iconClass: "out",
      title: `${qty} ${pluralThermal(qty)} de ${liters} para ${item.person || "-"}`,
      detail: `Local: ${item.location || "-"} • por ${item.userEmail || "Equipe"}`
    };
  }

  if (item.type === "devolucao") {
    return {
      icon: "↩",
      iconClass: "",
      title: `${item.person || "-"} devolveu ${qty} ${pluralThermal(qty)} de ${liters}`,
      detail: `Registrado por ${item.userEmail || "Equipe"}`
    };
  }

  if (item.type === "estoque_ajuste") {
    const delta = Number(item.delta || 0);
    const deltaText = delta > 0 ? `+${delta}` : String(delta);
    return {
      icon: "+",
      iconClass: "",
      title: `Estoque de ${liters} definido para ${Number(item.newTotal || 0)} unidades`,
      detail: `Alteração ${deltaText} • por ${item.userEmail || "Equipe"}`
    };
  }

  return {
    icon: "•",
    iconClass: "",
    title: "Movimentação registrada",
    detail: item.userEmail || "Equipe"
  };
}

function renderHistory() {
  els.historyList.innerHTML = movements.length
    ? movements.map(item => {
        const info = movementPresentation(item);
        return `
          <article class="timeline-card">
            <div class="timeline-icon ${info.iconClass}">${info.icon}</div>
            <div class="timeline-body">
              <strong>${escapeHtml(info.title)}</strong>
              <p>${escapeHtml(info.detail)}</p>
              <time>${formatDate(item.createdAt)}</time>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">O extrato aparecerá aqui conforme você cadastrar, emprestar e devolver térmicas.</div>`;
}

function renderAll() {
  updateStats();
  renderAvailable();
  renderBorrowed();
  renderHistory();
}

function fillLoanInventory() {
  const available = [...inventoryItems]
    .filter(item => Number(item.availableQuantity || 0) > 0)
    .sort((a, b) => Number(a.liters) - Number(b.liters));

  const currentValue = els.loanInventory.value;
  els.loanInventory.innerHTML = `<option value="">Selecione...</option>` +
    available.map(item => `
      <option value="${escapeHtml(item.id)}">${escapeHtml(item.liters)} L — ${Number(item.availableQuantity)} disponíveis</option>
    `).join("");

  if (available.some(item => item.id === currentValue)) els.loanInventory.value = currentValue;
  updateLoanAvailableHint();
}

function updateLoanAvailableHint() {
  const item = inventoryItems.find(stock => stock.id === els.loanInventory.value);
  if (!item) {
    els.loanAvailableHint.textContent = "";
    els.loanQuantity.removeAttribute("max");
    return;
  }
  const available = Number(item.availableQuantity || 0);
  els.loanAvailableHint.textContent = `${available} disponíveis desse tamanho.`;
  els.loanQuantity.max = String(available);
}

function openReturnModal(loanId) {
  const loan = getActiveLoans().find(item => item.id === loanId);
  if (!loan) {
    showToast("Esse empréstimo já foi devolvido.");
    return;
  }

  const qty = Number(loan.quantityOutstanding || 0);
  els.returnLoanId.value = loan.id;
  els.returnQuantity.value = qty;
  els.returnQuantity.max = String(qty);
  els.returnSummary.innerHTML = `
    <strong>${escapeHtml(loan.person || "Sem nome")}</strong>
    <p>${qty} ${pluralThermal(qty)} de ${escapeHtml(loan.liters)} L</p>
    <p>${escapeHtml(loan.location || "-")}</p>
  `;
  openModal("returnModal");
}

function startRealtimeListeners() {
  unsubscribeInventory?.();
  unsubscribeLoans?.();
  unsubscribeMovements?.();

  unsubscribeInventory = onSnapshot(
    query(collection(db, "inventory"), orderBy("liters")),
    snapshot => {
      inventoryItems = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      renderAll();
    },
    error => {
      console.error(error);
      showToast("Não foi possível carregar o estoque.");
    }
  );

  unsubscribeLoans = onSnapshot(
    query(collection(db, "loans"), orderBy("borrowedAt", "desc"), limit(300)),
    snapshot => {
      loans = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      renderAll();
    },
    error => {
      console.error(error);
      showToast("Não foi possível carregar os empréstimos.");
    }
  );

  unsubscribeMovements = onSnapshot(
    query(collection(db, "movements"), orderBy("createdAt", "desc"), limit(200)),
    snapshot => {
      movements = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      renderHistory();
    },
    error => {
      console.error(error);
      showToast("Não foi possível carregar o extrato.");
    }
  );
}

els.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessages();
  const submitButton = event.submitter;
  submitButton.disabled = true;
  submitButton.textContent = "Entrando...";

  try {
    await configureLoginPersistence();
    await signInWithEmailAndPassword(
      auth,
      els.loginEmail.value.trim(),
      els.loginPassword.value
    );
    els.loginPassword.value = "";
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

els.stockForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.stockMessage.textContent = "";
  const submitButton = event.submitter;
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";

  const liters = toInt(els.stockLiters.value);
  const newTotal = toInt(els.stockQuantity.value);

  try {
    if (liters <= 0) throw new Error("Informe uma litragem válida.");
    if (newTotal < 0) throw new Error("Informe uma quantidade válida.");

    const inventoryId = String(liters);
    const inventoryRef = doc(db, "inventory", inventoryId);
    const movementRef = doc(collection(db, "movements"));
    const user = currentUserData();

    await runTransaction(db, async transaction => {
      const stockSnap = await transaction.get(inventoryRef);
      const old = stockSnap.exists() ? stockSnap.data() : null;
      const oldTotal = Number(old?.totalQuantity || 0);
      const oldAvailable = Number(old?.availableQuantity || 0);
      const borrowedNow = Math.max(0, oldTotal - oldAvailable);

      if (newTotal < borrowedNow) {
        throw new Error(`Existem ${borrowedNow} térmicas desse tamanho emprestadas. O total não pode ficar abaixo disso.`);
      }

      const newAvailable = newTotal - borrowedNow;
      const stockData = {
        liters,
        totalQuantity: newTotal,
        availableQuantity: newAvailable,
        updatedAt: serverTimestamp(),
        updatedByUid: user.uid,
        updatedByEmail: user.email
      };

      if (stockSnap.exists()) {
        transaction.update(inventoryRef, stockData);
      } else {
        transaction.set(inventoryRef, {
          ...stockData,
          createdAt: serverTimestamp(),
          createdByUid: user.uid,
          createdByEmail: user.email
        });
      }

      transaction.set(movementRef, {
        type: "estoque_ajuste",
        inventoryId,
        liters,
        oldTotal,
        newTotal,
        delta: newTotal - oldTotal,
        createdAt: serverTimestamp(),
        userUid: user.uid,
        userEmail: user.email
      });
    });

    els.stockForm.reset();
    closeModal(document.querySelector("#stockModal"));
    showToast(`Estoque de ${liters} L atualizado.`);
  } catch (error) {
    console.error(error);
    els.stockMessage.textContent = error.message || "Erro ao salvar estoque.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Salvar estoque";
  }
});

els.loanForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.loanMessage.textContent = "";
  const submitButton = event.submitter;
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";

  const inventoryId = els.loanInventory.value;
  const quantity = toInt(els.loanQuantity.value);
  const person = els.loanPerson.value.trim();
  const location = els.loanLocation.value.trim();

  try {
    if (!inventoryId || quantity <= 0 || !person || !location) {
      throw new Error("Preencha todos os campos.");
    }

    const inventoryRef = doc(db, "inventory", inventoryId);
    const loanRef = doc(collection(db, "loans"));
    const movementRef = doc(collection(db, "movements"));
    const user = currentUserData();

    await runTransaction(db, async transaction => {
      const stockSnap = await transaction.get(inventoryRef);
      if (!stockSnap.exists()) throw new Error("Esse tamanho não está cadastrado no estoque.");

      const stock = stockSnap.data();
      const available = Number(stock.availableQuantity || 0);
      if (quantity > available) {
        throw new Error(`Só existem ${available} térmicas de ${stock.liters} L disponíveis.`);
      }

      transaction.update(inventoryRef, {
        availableQuantity: available - quantity,
        updatedAt: serverTimestamp(),
        updatedByUid: user.uid,
        updatedByEmail: user.email
      });

      transaction.set(loanRef, {
        inventoryId,
        liters: Number(stock.liters),
        person,
        location,
        quantityBorrowed: quantity,
        quantityOutstanding: quantity,
        status: "ativo",
        borrowedAt: serverTimestamp(),
        borrowedByUid: user.uid,
        borrowedByEmail: user.email
      });

      transaction.set(movementRef, {
        type: "emprestimo",
        loanId: loanRef.id,
        inventoryId,
        liters: Number(stock.liters),
        quantity,
        person,
        location,
        createdAt: serverTimestamp(),
        userUid: user.uid,
        userEmail: user.email
      });
    });

    els.loanForm.reset();
    updateLoanAvailableHint();
    closeModal(document.querySelector("#loanModal"));
    showToast("Empréstimo registrado.");
  } catch (error) {
    console.error(error);
    els.loanMessage.textContent = error.message || "Erro ao registrar empréstimo.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Confirmar empréstimo";
  }
});

els.returnForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.returnMessage.textContent = "";
  const submitButton = event.submitter;
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";

  const loanId = els.returnLoanId.value;
  const quantity = toInt(els.returnQuantity.value);

  try {
    if (!loanId || quantity <= 0) throw new Error("Informe a quantidade devolvida.");

    const loanRef = doc(db, "loans", loanId);
    const movementRef = doc(collection(db, "movements"));
    const user = currentUserData();

    await runTransaction(db, async transaction => {
      const loanSnap = await transaction.get(loanRef);
      if (!loanSnap.exists()) throw new Error("Empréstimo não encontrado.");

      const loan = loanSnap.data();
      const outstanding = Number(loan.quantityOutstanding || 0);
      if (loan.status !== "ativo" || outstanding <= 0) {
        throw new Error("Esse empréstimo já foi devolvido.");
      }
      if (quantity > outstanding) {
        throw new Error(`Faltam devolver apenas ${outstanding} térmicas nesse empréstimo.`);
      }

      const inventoryRef = doc(db, "inventory", loan.inventoryId);
      const stockSnap = await transaction.get(inventoryRef);
      if (!stockSnap.exists()) throw new Error("Estoque desse tamanho não foi encontrado.");

      const stock = stockSnap.data();
      const currentAvailable = Number(stock.availableQuantity || 0);
      const total = Number(stock.totalQuantity || 0);
      if (currentAvailable + quantity > total) {
        throw new Error("A devolução ultrapassaria o total cadastrado desse tamanho. Confira o estoque.");
      }

      const remaining = outstanding - quantity;

      transaction.update(inventoryRef, {
        availableQuantity: currentAvailable + quantity,
        updatedAt: serverTimestamp(),
        updatedByUid: user.uid,
        updatedByEmail: user.email
      });

      transaction.update(loanRef, {
        quantityOutstanding: remaining,
        status: remaining === 0 ? "devolvido" : "ativo",
        lastReturnAt: serverTimestamp(),
        lastReturnByUid: user.uid,
        lastReturnByEmail: user.email,
        ...(remaining === 0 ? {
          returnedAt: serverTimestamp(),
          returnedByUid: user.uid,
          returnedByEmail: user.email
        } : {})
      });

      transaction.set(movementRef, {
        type: "devolucao",
        loanId,
        inventoryId: loan.inventoryId,
        liters: Number(loan.liters),
        quantity,
        person: loan.person || "",
        location: loan.location || "",
        remainingAfterReturn: remaining,
        createdAt: serverTimestamp(),
        userUid: user.uid,
        userEmail: user.email
      });
    });

    els.returnForm.reset();
    closeModal(document.querySelector("#returnModal"));
    showToast("Devolução registrada.");
  } catch (error) {
    console.error(error);
    els.returnMessage.textContent = error.message || "Erro ao registrar devolução.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Marcar como devolvida";
  }
});

els.loanInventory.addEventListener("change", updateLoanAvailableHint);
els.borrowedSearch.addEventListener("input", renderBorrowed);

els.borrowedList.addEventListener("click", event => {
  const button = event.target.closest("[data-return-loan]");
  if (button) openReturnModal(button.dataset.returnLoan);
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

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => setActiveView(button.dataset.view));
});

document.querySelectorAll("[data-go-view]").forEach(button => {
  button.addEventListener("click", () => setActiveView(button.dataset.goView));
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal:not(.hidden)").forEach(closeModal);
  }
});

restoreLoginPreference();
registerAutoUpdate();
checkAppVersion();

onAuthStateChanged(auth, user => {
  if (user) {
    els.loginScreen.classList.add("hidden");
    els.appScreen.classList.remove("hidden");
    els.userEmail.textContent = user.email || "Usuário";
    setActiveView("home");
    startRealtimeListeners();
  } else {
    unsubscribeInventory?.();
    unsubscribeLoans?.();
    unsubscribeMovements?.();
    unsubscribeInventory = null;
    unsubscribeLoans = null;
    unsubscribeMovements = null;
    inventoryItems = [];
    loans = [];
    movements = [];
    els.appScreen.classList.add("hidden");
    els.loginScreen.classList.remove("hidden");
    els.userEmail.textContent = "-";
    els.availableCount.textContent = "0";
    els.borrowedCount.textContent = "0";
    els.availableList.innerHTML = "";
    els.borrowedList.innerHTML = "";
    els.historyList.innerHTML = "";
  }
});
