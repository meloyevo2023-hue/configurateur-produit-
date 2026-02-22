document.addEventListener('DOMContentLoaded', function () {
	const btn = document.getElementById('kd-place-order-btn');
	if (!btn) return;

	btn.addEventListener('click', function () {
		const quoteId = btn.getAttribute('data-quote-id');

		fetch(pearlQuoteData.ajax_url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				action: 'pearl_add_quote_to_cart',
				security: pearlQuoteData.nonce,
				quote_id: quoteId,
			}),
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				window.location.href = pearlQuoteData.checkout_url;
			} else {
				alert(data.message || 'An error occurred. Please try again.');
			}
		});
	});
});

// inline orders
// 
document.addEventListener('DOMContentLoaded', function () {
	const btns = Array.from(document.getElementsByClassName('kd-inline-order-btn'));
	if (!btns) return;
	
	console.log(btns)
	
	btns.forEach(btn=>{
			btn.addEventListener('click', function (e) {
				e.preventDefault();
				console.log('here')
			const quoteId = btn.getAttribute('data-quote-id');

			fetch(pearlQuoteData.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'pearl_add_quote_to_cart',
					security: pearlQuoteData.nonce,
					quote_id: quoteId,
				}),
			})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					window.location.href = pearlQuoteData.checkout_url;
				} else {
					alert(data.message || 'An error occurred. Please try again.');
				}
			});
		});
	})
});

// download pdf
window.addEventListener("load", () => {
	
	if(document.getElementById("kd-download-pdf-btn")){
			document.getElementById("kd-download-pdf-btn").addEventListener("click", function () {
		const postId = this.getAttribute("data-quote-id");
  
		// Adjust this to 'email' if sending via email instead of download
		const actionType = "download";
  
		const formData = new FormData();
		formData.append("action", "generate_quote_pdf");
		formData.append("post_id", postId);
		formData.append("action_type", actionType);
  
		fetch(pearlQuoteData.ajax_url, {
		  method: "POST",
		  credentials: "same-origin",
		  body: formData,
		})
		  .then((response) => response.json())
		  .then((result) => {
			if (result.success) {
			  console.log(result)
			  if (result.data.download_url) {
				// Open the PDF download
				window.open(result.data.download_url, "_blank");
			  } else if (result.data.message) {
				alert(result.data.message); // Email sent confirmation
			  }
			} else {
			  alert(result.data.message || "Something went wrong");
			}
		  })
		  .catch((error) => {
			console.error("PDF generation error:", error);
			alert("Error generating PDF");
		  });
	  });
	}

  });

  // send pdf by email
window.addEventListener("load", () => {
	const emailBtn = document.getElementById("kd-send-email-btn");
	if (!emailBtn) return;
  
	emailBtn.addEventListener("click", function () {
	  const postId = this.getAttribute("data-quote-id");
  
	  const formData = new FormData();
	  formData.append("action", "generate_quote_pdf");
	  formData.append("post_id", postId);
	  formData.append("action_type", "email");
  
	  fetch(pearlQuoteData.ajax_url, {
		method: "POST",
		credentials: "same-origin",
		body: formData,
	  })
		.then((response) => response.json())
		.then((result) => {
		  if (result.success) {
			alert(result.data.message || "Quote sent to your email.");
		  } else {
			alert(result.data.message || "Failed to send email.");
		  }
		})
		.catch((error) => {
		  console.error("Email PDF error:", error);
		  alert("Error sending PDF via email.");
		});
	});
  });


// delete quote request
// Handle quote cancellations
const deleteButtons = document.querySelectorAll('.kd-delete-quote-btn');

if (deleteButtons.length > 0) {
  deleteButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const quoteId = this.dataset.quoteId;

      if (confirm("Are you sure you want to cancel? This action can't be undone.")) {
        const formData = new FormData();
        formData.append('action', 'kd_delete_quote_request');
        formData.append('quote_id', quoteId);

        fetch(pearlQuoteData.ajax_url, {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert("Quote request cancelled.");
            location.reload();
          } else {
            alert("Failed to cancel quote.");
          }
        })
        .catch(err => {
          console.error(err);
          alert("Unexpected error occurred.");
        });
      }
    });
  });
}
  