document.addEventListener("DOMContentLoaded", function () {
    // console.clear();
    // console.log("pearl cart init");
  
    const form = document.querySelector(".form-quote-form-form");
    const btn = document.querySelector(".kd-submit-btn");
  
    if (!form || !btn) return;
  
    // State
    let existingAccount = false;
    let passwordVisible = false;
  
    // Create/ensure a container to inject the existing-account UI
    let noticeBlock = document.createElement("div");
    noticeBlock.className = "pearl-existing-account";
    noticeBlock.style.display = "none";
    noticeBlock.innerHTML = ""; // will be filled lazily
    form.insertBefore(noticeBlock, form.querySelector(".kd-row.text-right"));
  
    // --- helper: lightweight modal ---
    function showConfirmModal({
      title,
      body,
      confirmText = "Continue",
      cancelText = "Cancel",
    }) {
      return new Promise((resolve) => {
        // overlay
        const overlay = document.createElement("div");
        overlay.className = "pearl-modal-overlay";
        overlay.style.cssText = `
          position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:9999;
        `;
  
        // modal
        const modal = document.createElement("div");
        modal.className = "pearl-modal";
        modal.style.cssText = `
          background:#fff; max-width:520px; width:92%; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.2);
          padding:20px 20px 16px; font-family:inherit;
        `;
        modal.innerHTML = `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="font-size:22px; line-height:1.2">ℹ️</div>
            <div>
              <div style="font-weight:700; font-size:18px; margin-bottom:6px;">${title}</div>
              <div style="color:#333; line-height:1.5">${body}</div>
            </div>
          </div>
          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:18px;">
            <button type="button" class="pearl-btn-cancel" style="padding:10px 14px; border-radius:8px; border:1px solid #ddd; background:#fff; cursor:pointer; color: black">${cancelText}</button>
            <button type="button" class="pearl-btn-confirm" style="padding:10px 14px; border-radius:8px; border:0; background:#111; color:#fff; cursor:pointer;">${confirmText}</button>
          </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
  
        const cleanup = (val) => {
          document.body.removeChild(overlay);
          resolve(val);
        };
        modal.querySelector(".pearl-btn-cancel").onclick = () => cleanup(false);
        modal.querySelector(".pearl-btn-confirm").onclick = () => cleanup(true);
        overlay.onclick = (e) => {
          if (e.target === overlay) cleanup(false);
        }; // click outside closes
      });
    }
  
    function ensurePasswordUI() {
      if (passwordVisible) return;
      passwordVisible = true;
  
      // Build the UI
      noticeBlock.innerHTML = `
              <div class="pearl-existing-account-banner" style="display:flex;gap:10px;align-items:flex-start;margin:10px 0 14px;padding:12px;border-radius:8px;background:#fff7e6;border:1px solid #ffe2b3;">
                  <div style="font-size:18px;line-height:1">⚠️</div>
                  <div>
                      <div style="font-weight:600">${pearl_cart_params.i18n.existingTitle}</div>
                      <div style="margin-top:2px">${pearl_cart_params.i18n.existingBody}</div>
                  </div>
              </div>
              <div class="kd-row">
                <div class="kd-col-100">
                  <label>${pearl_cart_params.i18n.passwordLabel} *</label>
                  <input type="password" name="existing_password" class="pearl-existing-password" required>
                  <div class="pearl-pass-error" style="color:#b00020;margin-top:6px;display:none;"></div>
                  <div style="margin-top:8px;">
                    <a href="${pearl_cart_params.lost_password_url}" class="pearl-forgot-link" target="_blank" rel="noopener">Forgot password?</a>
                  </div>
                </div>
              </div>
          `;
      noticeBlock.style.display = "block";
  
      // Change button label
      btn.textContent = pearl_cart_params.i18n.loginBtn;
    }
  
    function validateRequired() {
      let valid = true;
      let firstInvalid = null;
      form.querySelectorAll("[required]").forEach((input) => {
        // if password UI is not visible, ignore its required state
        if (input.name === "existing_password" && !passwordVisible) {
          input.classList.remove("field-error");
          return;
        }
        if (!input.value.trim()) {
          valid = false;
          input.classList.add("field-error");
          if (!firstInvalid) firstInvalid = input;
        } else {
          input.classList.remove("field-error");
        }
      });
      if (!valid) {
        alert("Please fill in all required fields.");
        if (firstInvalid) firstInvalid.focus();
      }
      return valid;
    }
  
    async function postAjax(action, payload) {
      const data = new FormData();
      data.append("action", action);
      data.append("nonce", pearl_cart_params.nonce);
      Object.keys(payload || {}).forEach((k) => data.append(k, payload[k]));
  
      const res = await fetch(pearl_cart_params.ajax_url, {
        method: "POST",
        credentials: "same-origin",
        body: data,
      });
      return res.json();
    }
  
    function bindForgotLinkHandler() {
      const forgot = form.querySelector(".pearl-forgot-link");
      const pass = form.querySelector(".pearl-existing-password");
      if (!forgot || !pass) return;
  
      forgot.addEventListener("click", async function (e) {
        e.preventDefault();
  
        const emailInput = form.querySelector('input[name="customer_email"]');
        const email = (emailInput?.value || "").trim();
        if (!email) {
          alert("Please enter your email first.");
          return;
        }
  
        // request OTP
        try {
          const resp = await postAjax("pearl_send_login_otp", { email });
          if (resp?.success && resp.data?.sent) {
            // switch to OTP mode
            pass.value = "";
            pass.setAttribute("inputmode", "numeric");
            pass.setAttribute("maxlength", "6");
            pass.placeholder = "Enter 6-digit code";
            pass.dataset.mode = "otp";
  
            const passErr = form.querySelector(".pearl-pass-error");
            if (passErr) {
              passErr.style.display = "none";
              passErr.textContent = "";
            }
  
            // inform user
            const msg = document.createElement("div");
            msg.style.cssText = "margin-top:8px;color:#0a7a0a;";
            msg.textContent =
              "We’ve emailed you a one-time code. Enter it above to continue.";
            forgot.closest(".kd-col-100").appendChild(msg);
  
            // update button text for clarity
            btn.textContent = "Verify code & continue";
            pass.focus();
          } else {
            alert(
              resp?.data?.message || "Could not send the code. Please try again."
            );
          }
        } catch (err) {
          console.error("OTP send error", err);
          alert("Could not send the code. Please try again.");
        }
      });
    }
  
    btn.addEventListener("click", async function (e) {
      e.preventDefault();
      if (!validateRequired()) return;
  
      const emailInput = form.querySelector('input[name="customer_email"]');
      const passInput = form.querySelector('input[name="existing_password"]');
  
      // Phase 1: if we haven't checked/handled existing account yet, check it
      if (!existingAccount) {
        try {
          const check = await postAjax("pearl_check_email", {
            email: emailInput?.value || "",
          });
  
          if (check?.success) {
            const { state, same_email, user_email } = check.data || {};
  
            if (state === "logged_in") {
              // already authenticated → just save and go
              // (optional) if mismatch, you can warn or auto-correct the email field
              if (same_email === false && user_email) {
                // e.g., sync the email field to the logged-in account
                emailInput.value = user_email;
                // or show a small note if you prefer
              }
              await saveQuoteAndGo();
              return;
            }
  
            if (state === "needs_login") {
              existingAccount = true;
              ensurePasswordUI();
              bindForgotLinkHandler();
              form.querySelector(".pearl-existing-password")?.focus();
              return; // wait for next click to attempt login
            }
  
            if (state === 'available') {
              // No confirmation — just create account straight away
              const payload = {
                email: (emailInput?.value || ''),
                first_name: form.querySelector('input[name="first_name"]')?.value || '',
                surname:    form.querySelector('input[name="surname"]')?.value || '',
                customer_phone: form.querySelector('input[name="customer_phone"]')?.value || '',
                country: form.querySelector('select[name="country"]')?.value || ''
              };
            
              const createRes = await postAjax('pearl_create_account', payload);
              if (!(createRes?.success && (createRes.data?.created || createRes.data?.already_logged_in))) {
                alert(createRes?.data?.message || 'Could not create your account. Please try again.');
                return;
              }
            
              await saveQuoteAndGo();
              return;
            }
            
          }
        } catch (err) {
          console.error("Email check failed", err);
          // On failure, fall through to normal save
        }
      }
  
      // Phase 2: if existing account detected, try to login
      if (existingAccount) {
        const passError = form.querySelector(".pearl-pass-error");
        const mode = passInput?.dataset?.mode || "password"; // 'password' or 'otp'
        const emailVal = emailInput.value.trim();
  
        if (!passInput || !passInput.value.trim()) {
          if (passError) {
            passError.textContent =
              mode === "otp"
                ? "Please enter the 6-digit code we sent."
                : "Please enter your password.";
            passError.style.display = "block";
          }
          passInput?.focus();
          return;
        }
  
        try {
          if (mode === "otp") {
            // verify code and login
            const otpRes = await postAjax("pearl_login_with_otp", {
              email: emailVal,
              code: passInput.value.trim(),
            });
  
            if (otpRes?.success && otpRes.data?.logged_in) {
              await saveQuoteAndGo();
              return;
            }
  
            if (passError) {
              passError.textContent =
                otpRes?.data?.message || "Invalid or expired code.";
              passError.style.display = "block";
            }
            return;
          } else {
            // normal password login (your existing code)
            const login = await postAjax("pearl_login_existing", {
              email: emailVal,
              password: passInput.value,
            });
  
            if (login?.success && login.data?.logged_in) {
              await saveQuoteAndGo();
              return;
            }
            if (passError) {
              passError.textContent = pearl_cart_params.i18n.badPassword;
              passError.style.display = "block";
            }
            return;
          }
        } catch (err) {
          console.error("Login/OTP error", err);
          alert("Login failed. Please try again.");
          return;
        }
      }
  
      // Phase 3: normal path for non-existing email → save + go
      await saveQuoteAndGo();
    });
  
    async function saveQuoteAndGo() {
      try {
        const data = new FormData(form);
        data.append("action", "pearl_cart_save_quote");
        data.append("nonce", pearl_cart_params.nonce);
  
        const resp = await fetch(pearl_cart_params.ajax_url, {
          method: "POST",
          credentials: "same-origin",
          body: data,
        }).then((r) => r.json());
  
        if (resp.success) {
          window.location.href = pearl_cart_params.checkout_url;
        } else {
          alert("Could not save your details. Please try again.");
        }
      } catch (err) {
        console.error("AJAX error:", err);
        alert("Something went wrong. Please try again.");
      }
    }
  });
  