/* ===============================
   helpers (ajax + form builders)
   =============================== */

// POST to WP ajax with your localized nonce
async function pearlPostAjax(action, payload = {}) {
  const fd = new FormData();
  fd.append("action", action);
  // server side you allow either nonce via pearl_verify_any_nonce()
  fd.append("nonce", pearlWCData.nonce);
  Object.entries(payload).forEach(([k, v]) => fd.append(k, v));

  const res = await fetch(pearlWCData.ajax_url, {
    method: "POST",
    credentials: "same-origin",
    body: fd,
  });
  return res.json();
}

// Build the same FormData your submit uses (for retry after login)
function buildQuoteFormData(quoteForm) {
  const fd = new FormData();

  const customerType =
    quoteForm.querySelector('input[name="customer-type"]:checked')?.value ||
    "individual";
  fd.append("customer-type", customerType);

  const base = [
    "country",
    "first-name",
    "surname",
    "customer_phone",
    "customer_email",
    "quotation_name",
    "vat-number"
  ];
  base.forEach((name) => {
    const el = quoteForm.querySelector(`[name="${name}"]`);
    if (el && el.value.trim() !== "") fd.append(name, el.value.trim());
  });

  const designRequestDesc = document.getElementById('design-request-description');
  const designReqDesc = designRequestDesc?.value?.trim();
  if (designReqDesc) fd.append("designReqDesc", designReqDesc);

  if (customerType === "company") {
    const company = quoteForm.querySelector('[name="company_name"]')?.value.trim();
    if (company) fd.append("company_name", company);
  } else if (customerType === "association") {
    const assoc = quoteForm.querySelector('[name="association_name"]')?.value.trim();
    if (assoc) fd.append("association_name", assoc);
  }

  const addressShown = document.getElementById("address-fields")?.style.display === "block";
  if (addressShown) {
    ["postal-code", "house-number", "street", "city"].forEach((name) => {
      const el = quoteForm.querySelector(`[name="${name}"]`);
      if (el && el.value.trim() !== "") fd.append(name, el.value.trim());
    });
  }

  // ✅ SAFE file handling
  const uploadInput = document.getElementById("design_upload");

  if (Array.isArray(kdSelectedFiles) && kdSelectedFiles.length > 0) {
    kdSelectedFiles.forEach((file) => fd.append("design_upload[]", file));
  } else if (uploadInput?.files?.length) {
    Array.from(uploadInput.files).forEach((file) =>
      fd.append("design_upload[]", file)
    );
  }
  // else: no files selected — that’s fine; we still submit

  fd.append("action", "pearl_register_quote_customer");
  fd.append("security", pearlWCData.nonce);
  return fd;
}


/* ===============================
   inline login UI (no extra buttons)
   =============================== */

// === replace ensureInlineLoginUI with this cart-matching version ===
function ensureInlineLoginUI(quoteForm, emailValue) {
  let block = quoteForm.querySelector(".pearl-inline-login");
  if (block) return block._ctl;

  // we'll insert right before the submit row
  const submitBtn = quoteForm.querySelector(".kd-submit-btn");
  const submitRow = submitBtn?.closest(".kd-row") || quoteForm.lastElementChild;

  // container follows your form grid structure (kd-row / kd-col-100)
  block = document.createElement("div");
  block.className = "pearl-inline-login";
  block.innerHTML = `
    <div class="kd-row" style="margin-top:10px;">
      <div class="kd-col-100">
        <div class="pearl-existing-notice" style="
          background:#fff7e6; border:1px solid #f0d48a; color:#333;
          border-radius:8px; padding:12px 14px; line-height:1.45;">
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <div style="font-size:18px; line-height:1.1;">⚠️</div>
            <div>
              <div style="font-weight:700;">Cet e-mail est lié à un compte existant</div>
              <div style="margin-top:4px;">Pour créer votre commande, veuillez vous connecter en utilisant cette adresse e-mail.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="kd-row" style="margin-top:12px;">
      <div class="kd-col-100">
        <label>Mot de passe <span style="color:#d00">*</span></label>
        <input type="password" class="pearl-login-pass" placeholder="Mot de passe"
               style="width:100%;">
        <div class="pearl-pass-error" style="color:#b00020; font-size:13px; min-height:18px; display:none;"></div>
        <a href="#" class="pearl-forgot-link" style="display:inline-block; margin-top:6px; font-size:13px; color:#3467eb; text-decoration:none;">
          Mot de passe oublié?
        </a>
      </div>
    </div>
  `;
  submitRow.parentNode.insertBefore(block, submitRow);

  // we don't render an extra email input on quote (cart doesn't either);
  // we still keep the email value for OTP calls
  const emailVal = (emailValue || "").trim();
  const passEl = block.querySelector(".pearl-login-pass");
  const errEl = block.querySelector(".pearl-pass-error");
  const forgot = block.querySelector(".pearl-forgot-link");
  let mode = "password";

  const ctl = {
    el: block,
    setModeOTP() {
      mode = "otp";
      passEl.value = "";
      passEl.type = "text";
      passEl.setAttribute("inputmode", "numeric");
      passEl.setAttribute("maxlength", "6");
      passEl.placeholder = "Enter 6-digit code";
    },
    async sendOTP() {
      errEl.style.display = "none";
      errEl.textContent = "";
      try {
        const resp = await pearlPostAjax("pearl_send_login_otp", {
          email: emailVal,
        });
        if (resp?.success) {
          ctl.setModeOTP();
        } else {
          errEl.textContent = resp?.data?.message || "Could not send code.";
          errEl.style.display = "block";
        }
      } catch (e) {
        errEl.textContent = "Could not send code.";
        errEl.style.display = "block";
      }
    },
    async loginThen(onSuccess) {
      errEl.style.display = "none";
      errEl.textContent = "";
      const passVal = passEl.value.trim();
      if (!passVal) {
        errEl.textContent =
          mode === "otp" ? "Enter the 6-digit code." : "Enter your password.";
        errEl.style.display = "block";
        return;
      }
      try {
        let resp;
        if (mode === "otp") {
          resp = await pearlPostAjax("pearl_login_with_otp", {
            email: emailVal,
            code: passVal,
          });
        } else {
          resp = await pearlPostAjax("pearl_login_existing", {
            email: emailVal,
            password: passVal,
          });
        }
        if (
          resp?.success &&
          (resp.data?.logged_in || resp.data?.already_logged_in)
        ) {
          onSuccess();
        } else {
          errEl.textContent =
            resp?.data?.message ||
            (mode === "otp"
              ? "Invalid or expired code."
              : "Incorrect password.");
          errEl.style.display = "block";
        }
      } catch (e) {
        errEl.textContent = "Login failed. Please try again.";
        errEl.style.display = "block";
      }
    },
  };

  forgot.addEventListener("click", (e) => {
    e.preventDefault();
    ctl.sendOTP();
  });
  block._ctl = ctl;
  return ctl;
}

/* ===============================
   main submit handler
   =============================== */

document.addEventListener("DOMContentLoaded", () => {
  const quoteForm = document.querySelector(".pearl-quote-form form");
  if (!quoteForm) return;

  quoteForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const hiddenCart = document.getElementById("kd-empty-cart");
    if (hiddenCart && hiddenCart.value === "yes") {
      alert("No products in the bucket!");
      return;
    }

    const submitBtn = quoteForm.querySelector(".kd-submit-btn");
    submitBtn.disabled = true;
    submitBtn.classList.add("kd-disabled");

    const formData = buildQuoteFormData(quoteForm);

    try {
      const response = await fetch(pearlWCData.ajax_url, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        window.location.href = `${pearlWCData.thank_you_page_url}?userId=${result.data.user_id}&username=${result.data.first_name}&quoteId=${result.data.quote_post_id}`;
        return;
      }

      // if the email is an existing account → extend the form & reuse submit button
      if (result.data === "existing_account") {
        const emailVal =
          quoteForm.querySelector('[name="customer_email"]')?.value || "";
        const loginUI = ensureInlineLoginUI(quoteForm, emailVal);

        // change button label & behavior to "Log in & continue"
        submitBtn.disabled = false;
        submitBtn.classList.remove("kd-disabled");
        submitBtn.textContent = "Se connecter et continuer";

        // replace button node to clear old listeners, then bind login→resubmit
        submitBtn.replaceWith(submitBtn.cloneNode(true));
        const newSubmitBtn = quoteForm.querySelector(".kd-submit-btn");
        newSubmitBtn.textContent = "Se connecter et continuer";
        newSubmitBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          await loginUI.loginThen(async () => {
            const retryFd = buildQuoteFormData(quoteForm);
            try {
              const retryRes = await fetch(pearlWCData.ajax_url, {
                method: "POST",
                body: retryFd,
              }).then((r) => r.json());
              if (retryRes.success) {
                window.location.href = `${pearlWCData.thank_you_page_url}?userId=${retryRes.data.user_id}&username=${retryRes.data.first_name}&quoteId=${retryRes.data.quote_post_id}`;
              } else {
                alert(
                  "Échec de l’envoi: " + (retryRes.data || "Erreur inconnue")
                );
              }
            } catch (e) {
              alert("An error occurred while finishing your quote.");
            }
          });
        });

        return; // stop original flow
      }

      // generic error
      alert("Échec de l’envoi: " + (result.data || "Erreur inconnue"));
    } catch (error) {
      console.error("AJAX error:", error);
      alert("An error occurred while processing your request.");
    } finally {
      // if we didn't switch into login mode, re-enable the button
      if (!quoteForm.querySelector(".pearl-inline-login")) {
        const btn = quoteForm.querySelector(".kd-submit-btn");
        btn.disabled = false;
        btn.classList.remove("kd-disabled");
      }
    }
  });
});

/* ===============================
   UI toggles
   =============================== */

document.addEventListener("DOMContentLoaded", function () {
  const individual = document.getElementById("type-individual");
  const company = document.getElementById("type-company");
  const association = document.getElementById("type-association");

  const companyDetails = document.getElementById("company-details");
  const companyWrapper = document.getElementById("company-name-wrapper");
  const associationWrapper = document.getElementById(
    "association-name-wrapper"
  );
  const vatWrapper = document.getElementById("vat-wrapper");

  const addressToggle = document.getElementById("address-field-toggle");
  const addressFields = document.getElementById("address-fields");

  function toggleFields() {
    if (company?.checked) {
      companyDetails.style.display = "block";
      companyWrapper.style.display = "block";
      associationWrapper.style.display = "none";
      // vatWrapper.style.display = 'block';
    } else if (association?.checked) {
      companyDetails.style.display = "block";
      companyWrapper.style.display = "none";
      associationWrapper.style.display = "block";
      // vatWrapper.style.display = 'block';
    } else {
      companyDetails.style.display = "none";
      companyWrapper.style.display = "none";
      associationWrapper.style.display = "none";
      // vatWrapper.style.display = 'none';
    }
  }

  [individual, company, association].forEach((el) =>
    el?.addEventListener("change", toggleFields)
  );
  toggleFields();

  // Address fields toggle
  addressToggle?.addEventListener("click", function (e) {
    e.preventDefault();
    const isVisible = addressFields.style.display === "block";
    addressFields.style.display = isVisible ? "none" : "block";
    addressToggle.innerHTML = isVisible
      ? 'Afficher les champs d’adresse <span class="caret">▼</span>'
      : 'Masquer les champs d’adresse <span class="caret">▲</span>';
  });
});

/* ===============================
   file upload constraints
   =============================== */

// [ADDED] persistent store + helpers for APPENDING to the file input
const KD_MAX_FILES = 10; // mirrors your UI text
const KD_MAX_TOTAL_MB = 20;
const KD_ALLOWED_EXT = ["jpg", "jpeg", "png", "pdf"];
let kdSelectedFiles = []; // accumulate across multiple selections

// [ADDED] helper: convert MB to bytes
function kdBytesLimit() {
  return KD_MAX_TOTAL_MB * 1024 * 1024;
}

// [ADDED] helper: stable key for de-duplication
function kdFileKey(f) {
  return `${f.name}__${f.size}__${f.lastModified}`;
}

// [ADDED] helper: reflect kdSelectedFiles back into the real <input>.files
function kdSyncInputFileList() {
  const input = document.getElementById("design_upload");
  if (!input) return;

  input.dataset.kdFiles = kdSelectedFiles.length;

  console.log("kdSelectedFiles synced (count):", kdSelectedFiles.length);
  // const dt = new DataTransfer();
  // kdSelectedFiles.forEach(f => dt.items.add(f));

  // console.log(dt)
  // input.files = dt.files;
}

// [ADDED] helper: (re)render UI and allow removing a file
function kdUpdateOutputList() {

  console.log('comes here')
  const output = document.getElementById("selected-files");

  console.log(output)
  if (!output) return;
  output.innerHTML = "";
  kdSelectedFiles.forEach((file, idx) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "8px";
    row.style.margin = "4px 0";

    const label = document.createElement("span");
    label.textContent = `✔ ${file.name}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "supprimer";
    btn.style.border = "none";
    btn.style.background = "#eee";
    btn.style.padding = "4px 8px";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => {
      kdSelectedFiles.splice(idx, 1);
      kdSyncInputFileList();
      kdUpdateOutputList();
    });

    row.appendChild(label);
    row.appendChild(btn);
    output.appendChild(row);

    console.log(output)
  });
}

// [ADDED] helper: validate & merge new files with current list
function kdValidateAndMerge(newFiles) {
  const map = new Map(kdSelectedFiles.map(f => [kdFileKey(f), f]));
  const errors = [];

  for (const f of newFiles) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!KD_ALLOWED_EXT.includes(ext)) {
      errors.push(`"${f.name}" is not an allowed type (JPG, PNG, PDF).`);
      continue;
    }
    const key = kdFileKey(f);
    if (!map.has(key)) map.set(key, f);
  }

  // count limit
  let merged = Array.from(map.values());
  if (merged.length > KD_MAX_FILES) {
    errors.push(`You can upload a maximum of ${KD_MAX_FILES} files.`);
    merged = merged.slice(0, KD_MAX_FILES); // keep earliest chosen
  }

  // total size limit
  let total = merged.reduce((s, f) => s + f.size, 0);
  while (total > kdBytesLimit() && merged.length) {
    const removed = merged.pop(); // drop latest-added until within limit
    total -= removed.size;
  }
  if (total > kdBytesLimit()) {
    errors.push(`Total upload size cannot exceed ${KD_MAX_TOTAL_MB} MB.`);
  }

  kdSelectedFiles = merged;
  return errors;
}

function handleFileSelect(e) {
  // [CHANGED] append new selections to existing (not overwrite)
  const incoming = Array.from(e.target.files || []);
  const errors = kdValidateAndMerge(incoming);

  kdSyncInputFileList();   // reflect merged list into input.files
  kdUpdateOutputList();    // refresh UI list

  if (errors.length) {
    alert(errors.join("\n"));
  }

  // allow re-selecting the same file after removal
  e.target.value = "";
}

document.addEventListener("DOMContentLoaded", function () {
  const checkbox = document.getElementById("design-request-radio-btn");
  const uploadBtn = document.querySelector(".design-upload-btn");
  const quoteDesc = document.querySelector(".resign-request-checkbox-desc");
  const designDescription = document.querySelector(
    ".design-upload-description"
  );

  if (!checkbox) return;
  checkbox.addEventListener("change", function () {
    if (checkbox.checked) {
      uploadBtn?.classList.add("active");
      quoteDesc?.classList.add("active");
      designDescription?.classList.add("active");
    } else {
      uploadBtn?.classList.remove("active");
      quoteDesc?.classList.remove("active");
      designDescription?.classList.remove("active");
      // (optional) clear selections when turning off request:
      // kdSelectedFiles = [];
      // kdSyncInputFileList();
      // kdUpdateOutputList();
    }
  });
});
