class DesignRequestHandler {
  constructor(options) {
    this.ajaxUrl = options.ajaxUrl;
    this.nonce = options.nonce;
    this.init();
  }

  init() {
    // Attach event listener for the "Request free design" button on step 2.
    const requestDesignBtn = document.getElementById('request_free_design');
    if (requestDesignBtn) {
      requestDesignBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.sendDesignRequest();
      });
    }
  }

  // Gather data from the page and send as FormData (multipart/form-data)
  sendDesignRequest() {
    // Grab file from file input (for logo)
    const fileInput = document.getElementById('upload-logo');
    const file = fileInput && fileInput.files.length ? fileInput.files[0] : null;

    // Visible fields.
    const specialRequests = document.getElementById('special-requests')
      ? document.getElementById('special-requests').value
      : '';

    // Hidden fields.
    const userId = document.getElementById('hidden_user_id')
      ? document.getElementById('hidden_user_id').value
      : '';
    const quoteId = document.getElementById('hidden_quote_id')
      ? document.getElementById('hidden_quote_id').value
      : '';
    const hiddenDeliveryDate = document.getElementById('hidden_delivery_date')
      ? document.getElementById('hidden_delivery_date').value
      : '';
    const designAmountHidden = document.getElementById('hidden_design_amount')
      ? document.getElementById('hidden_design_amount').value
      : '';

    // Gather unique quote products from hidden inputs.
    let quoteProducts = [];
    const productElements = document.querySelectorAll('.hidden_quote_product');
    productElements.forEach(el => {
      const prodId = el.getAttribute('data-product-id') || '';
      const prodName = el.getAttribute('data-product-name') || '';
      const prodQty = el.getAttribute('data-quantity') || '0';
      quoteProducts.push({ product_id: prodId, product_name: prodName, quantity: prodQty });
    });

    // Create a FormData object.
    let formData = new FormData();
    formData.append("action", "save_design_request");
    formData.append("nonce", this.nonce);
    formData.append("design_amount", designAmountHidden);
    formData.append("delivery_date", hiddenDeliveryDate);
    formData.append("quote_id", quoteId);
    formData.append("special_requests", specialRequests);
    formData.append("design_products", JSON.stringify(quoteProducts));
    formData.append("user_id", userId);
    formData.append("hidden_delivery_date", hiddenDeliveryDate);
    formData.append("design_amount_hidden", designAmountHidden);

    // Append the file if available.
    if (file) {
      formData.append("upload_logo", file);
    }

    // Send the AJAX request.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", this.ajaxUrl, true);
    // Do not manually set the Content-Type header for FormData.
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              console.log("Server response:", response.data);
              // Replace the content in step 2 with the success message.
              const step2 = document.querySelector('.step-page[data-step="2"]');
              if (step2) {
                step2.innerHTML = `
                  <h2>Design Request Submitted Successfully</h2>
                  <p>${response.data.message}</p>
                `;
              }
            } else {
              alert("Error: " + response.data);
            }
          } catch (err) {
            alert("Error parsing server response.");
          }
        } else {
          alert("AJAX error: " + xhr.statusText);
        }
      }
    };
    xhr.send(formData);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new DesignRequestHandler({
    ajaxUrl: pearlDesignData.ajax_url,
    nonce: pearlDesignData.ajax_nonce
  });
});
