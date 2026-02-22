window.addEventListener('load', function () {
    const inputs = document.querySelectorAll('.product-search-input');

    inputs.forEach(input => {
        let debounceTimer;

        input.addEventListener('keyup', function () {
            const term = input.value.trim();
            const resultsDiv = input.closest('.product-search-wrapper').querySelector('.product-search-results');

            clearTimeout(debounceTimer);

            if (term.length < 2) {
                resultsDiv.innerHTML = '';
                resultsDiv.classList.remove('active');
                return;
            }

            debounceTimer = setTimeout(() => {
                const xhr = new XMLHttpRequest();
                const params = new URLSearchParams();
                params.append('action', 'product_search');
                params.append('nonce', ProductSearchData.nonce);
                params.append('term', term);

                xhr.open('POST', ProductSearchData.ajax_url, true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

                xhr.onload = function () {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success && response.data.length > 0) {
                            const items = response.data.map(item => `
                                <li class="product-result-item">
                                    <a href="${item.url}">
                                        <img src="${item.thumbnail}" alt="${item.title}" class="product-thumb" />
                                        <div class="product-info">
                                            <div class="product-title">${item.title}</div>
                                            <div class="product-price" style="font-size: 15px; color: #1598d7">${item.price}</div>
                                        </div>
                                    </a>
                                </li>
                            `).join('');
                            resultsDiv.innerHTML = `<ul class="product-result-list">${items}</ul>`;
                        } else {
                            resultsDiv.innerHTML = '<p>No products found.</p>';
                        }

                        resultsDiv.classList.add('active');
                    }
                };

                xhr.send(params.toString());
            }, 300);
        });
    });
});
