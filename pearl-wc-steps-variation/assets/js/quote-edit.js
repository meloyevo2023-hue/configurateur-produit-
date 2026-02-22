class QuoteProductEditor {
  constructor(options) {
    this.ajaxUrl = options.ajaxUrl;
    this.nonce = options.nonce;
    this.init();
  }

  // Initialize: attach listeners to each product card.
  init() {
    this.productCards = document.querySelectorAll(".offer-product-card");
    this.productCards.forEach(card => {
      // Attach Edit button listener.
      const editBtn = card.querySelector(".edit-product");
      if (editBtn) {
        editBtn.addEventListener("click", e => this.handleEdit(e, card));
      }
      // Attach Cancel button listener.
      const cancelBtn = card.querySelector(".cancel-edit");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", e => this.handleCancel(e, card));
      }
      // Attach Save button listener.
      const saveBtn = card.querySelector(".save-edit");
      if (saveBtn) {
        saveBtn.addEventListener("click", e => this.handleSaveEdit(e, card));
      }
      // Attach Remove button listener.
      const removeBtn = card.querySelector(".remove-product");
      if (removeBtn) {
        removeBtn.addEventListener("click", e => this.handleRemoveProduct(e, card));
      }
    });
  }

  // Handle Edit button click: fetch variation details from the quote.
  handleEdit(e, card) {
    e.preventDefault();
    const productId = card.getAttribute("data-product-id");
    const quoteId = card.getAttribute("data-quote-id");
    const productIndex = card.getAttribute("data-product-index");
    this.fetchVariation(quoteId, productId, productIndex, card);
  }

  // Handle Cancel button click: hide the edit form and show view mode.
  handleCancel(e, card) {
    e.preventDefault();
    const infoView = card.querySelector(".product-info-view");
    const editForm = card.querySelector(".product-edit-form");
    if (infoView && editForm) {
      editForm.style.display = "none";
      infoView.style.display = "block";
    }
  }

  // Handle Save button click: send updated quantity and attributes to update endpoint.
  handleSaveEdit(e, card) {
    e.preventDefault();
    const quoteId = card.getAttribute("data-quote-id");
    const productId = card.getAttribute("data-product-id");
    const variationId = card.getAttribute("data-variationid");
    const productIndex = card.getAttribute("data-product-index");
    const newQuantity = card.querySelector(".edit-quantity").value;
  
    const attributeSelects = card.querySelectorAll(".edit-attribute");
    const newAttributes = {};
    attributeSelects.forEach(select => {
      const attrName = select.getAttribute("data-attr-name");
      newAttributes[attrName] = select.value;
    });
  
    const params = new URLSearchParams();
    params.append("action", "pearl_update_quote_product");
    params.append("nonce", this.nonce);
    params.append("quote_id", quoteId);
    params.append("product_index", productIndex);
    params.append("product_id", JSON.stringify(parseInt(productId)));
    params.append("variation_id", JSON.stringify(parseInt(variationId)));
    params.append("new_quantity", newQuantity);
    params.append("attributes", JSON.stringify(newAttributes));
  
    const xhr = new XMLHttpRequest();
    xhr.open("POST", this.ajaxUrl, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              console.log("Update response:", response.data);
  
              const qtyDisplay = card.querySelector(".quantity-display");
              if (qtyDisplay) {
                qtyDisplay.textContent = newQuantity;
              }
  
              let variationDisplay = card.querySelector(".variation-display") || card.querySelector(".product-info-view p");
              if (variationDisplay && response.data.quote_products && response.data.quote_products[productIndex]) {
                variationDisplay.textContent = response.data.quote_products[productIndex].variation;
              }
  
              const infoView = card.querySelector(".product-info-view");
              const editForm = card.querySelector(".product-edit-form");
              if (infoView && editForm) {
                editForm.style.display = "none";
                infoView.style.display = "block";
              }
  
              // Update totals
              document.getElementById("kd-overview-total").innerHTML = response.data.total_html;
              document.getElementById("kd-overview-tax").innerHTML = response.data.tax_html;
              document.getElementById("kd-overview-total-with-tax").innerHTML = response.data.total_with_tax_html;
  
              alert(response.data.message);
            } else {
              alert("Error: " + response.data);
            }
          } catch (err) {
            alert("Error parsing response.");
          }
        } else {
          alert("Error updating quote product: " + xhr.statusText);
        }
      }
    };
    xhr.send(params.toString());
  }
  

  // Handle Remove button click: send an AJAX request to remove the product, then re-index remaining cards.
  handleRemoveProduct(e, card) {
    e.preventDefault();
    if (!confirm("Are you sure you want to remove this product from the quote?")) {
      return;
    }
    const quoteId = card.getAttribute("data-quote-id");
    const productIndex = card.getAttribute("data-product-index");
    
    const params = new URLSearchParams();
    params.append("action", "remove_quote_product");
    params.append("nonce", this.nonce);
    params.append("quote_id", quoteId);
    params.append("product_index", productIndex);
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", this.ajaxUrl, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              console.log("Remove response:", response.data);
              // Remove the product card from the DOM.
              card.parentNode.removeChild(card);
              alert(response.data.message);
              // Re-index the remaining product cards.
              this.reindexProductCards();
            } else {
              alert("Error: " + response.data);
            }
          } catch (err) {
            alert("Error parsing response.");
          }
        } else {
          alert("Error removing product: " + xhr.statusText);
        }
      }
    };
    xhr.send(params.toString());
  }

  // Re-index all remaining product cards so that data-product-index is in order.
  reindexProductCards() {
    const remainingCards = document.querySelectorAll(".offer-product-card");
    remainingCards.forEach((card, index) => {
      card.setAttribute("data-product-index", index);
    });
  }

  // Fetch variation details from the quote.
  fetchVariation(quoteId, productId, productIndex, card) {
    const postData =
      "action=pearl_wc_get_quote_variation" +
      "&nonce=" + encodeURIComponent(this.nonce) +
      "&quote_id=" + encodeURIComponent(quoteId) +
      "&product_id=" + encodeURIComponent(productId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", this.ajaxUrl, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            this.processResponse(response, productIndex, card);
          } catch (err) {
            alert("Error parsing response.");
          }
        } else {
          alert("Error fetching variation data: " + xhr.statusText);
        }
      }
    };
    xhr.send(postData);
  }

  // Parse variation string into an object.
  parseVariationString(variationString) {
    const variationObj = {};
    if (variationString) {
      const parts = variationString.split(",");
      parts.forEach(part => {
        const keyVal = part.split(":");
        if (keyVal.length === 2) {
          const key = keyVal[0].trim().toLowerCase();
          const value = keyVal[1].trim();
          variationObj[key] = value;
        }
      });
    }
    return variationObj;
  }

  // Process the AJAX response from fetching variation details.
  processResponse(response, productIndex, card) {
    if (response.success) {
      const quoteProducts = response.data.quote_products;
      productIndex = parseInt(productIndex, 10);
      if (!Array.isArray(quoteProducts) || productIndex >= quoteProducts.length) {
        alert("Invalid product index.");
        return;
      }
      const row = quoteProducts[productIndex];
      const variationId = row.varient_id;
      const variationString = row.variation;
      console.log("Found variation id:", variationId);
      console.log("Variation string:", variationString);

      const variationObj = this.parseVariationString(variationString);
      console.log("Parsed variation object:", variationObj);

      // Store the variation id in a hidden field.
      let hiddenField = card.querySelector(".hidden-variation-id");
      if (!hiddenField) {
        hiddenField = document.createElement("input");
        hiddenField.type = "hidden";
        hiddenField.className = "hidden-variation-id";
        card.appendChild(hiddenField);
      }
      hiddenField.value = variationId;

      // Loop through each select in the edit form and preselect matching options.
      const selects = card.querySelectorAll(".edit-attribute");
      selects.forEach(select => {
        const attrName = select.getAttribute("data-attr-name");
        const keyCandidate = attrName.replace(/^pa_/, "").replace(/_/g, " ").toLowerCase();
        if (variationObj[keyCandidate]) {
          const valueToSelect = variationObj[keyCandidate];
          Array.from(select.options).forEach(option => {
            if (option.value === valueToSelect) {
              option.selected = true;
            }
          });
        }
      });

      // Toggle UI: hide view mode and show edit form.
      const infoView = card.querySelector(".product-info-view");
      const editForm = card.querySelector(".product-edit-form");
      if (infoView && editForm) {
        infoView.style.display = "none";
        editForm.style.display = "block";
      }
    } else {
      alert("Error: " + response.data);
    }
  }
}

// Utility function to show a specific step.
function showStep(stepNumber) {
  // Hide all step pages.
  document.querySelectorAll(".step-page").forEach(page => {
    page.style.display = "none";
  });
  // Show the target step.
  const targetPage = document.querySelector('.step-page[data-step="' + stepNumber + '"]');
  if (targetPage) {
    targetPage.style.display = "block";
  }
  // Update the step indicator.
  document.querySelectorAll(".step-indicator .step").forEach(stepEl => {
    const stepNum = parseInt(stepEl.getAttribute("data-step"), 10);
    if (stepNum === stepNumber) {
      stepEl.classList.add("active");
    } else {
      stepEl.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  new QuoteProductEditor({
    ajaxUrl: pearlWCData.ajax_url,
    nonce: pearlWCData.nonce
  });
  
  // Add event listener for the Upload logo button.
  const uploadLogoBtn = document.querySelector('.upload-logo');
  if (uploadLogoBtn) {
    uploadLogoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // When clicked, show the second step (Upload Logo page)
      showStep(2);
    });
  }
});
