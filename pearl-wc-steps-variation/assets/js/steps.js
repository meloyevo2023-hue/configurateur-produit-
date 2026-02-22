/* global React, ReactDOM, pearlWCData */
const { useState, useEffect, useRef } = React;

function StepsForm(props) {
  const {
    attributes,
    addons,
    product_id,
    ajax_url,
    ajax_action,
    nonce,
    quote_page_url,
    estimated_delivery_date,
    currency_code,
    currency_symbol,
    currency_position,
    tax_percent,
    cart_has_items,
    minimum_quantity,
    variations,
  } = props;

  // filtered addons

  // let filteredAddons = addons.filter((addon) => addon.parent_id === 0);

  const [addonsEnabled, setAddonsEnabled] = useState(false);

  // parse float safely
  function parseFloatSafe(value) {
    if (typeof value === "string") {
      value = value.replace(",", ".");
    }
    return parseFloat(value) || 0;
  }

  useEffect(() => {
    const hasValidAddons = addons.some(
      (addon) =>
        addon.parent_id === 0 &&
        Array.isArray(addon.options) &&
        addon.options.length > 0
    );
    setAddonsEnabled(hasValidAddons);
  }, [addons]);

  const attributeKeys = Object.keys(attributes || {});
  const [totalSteps, setTotalSpets] = useState(attributeKeys.length);
  const [initSteps, setInitSteps] = useState(attributeKeys.length);

  const [maxVisibleStep, setMaxVisibleStep] = useState(0);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedAddons, setSelectedAddons] = useState({});
  const [quantitySelected, setQuantitySelected] = useState(0);
  const [selectedQtyOption, setSelectedQtyOption] = useState(null);
  const [selectedPriceOption, setSelectedPriceOption] = useState(null);
  const [variationData, setVariationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quantityRange, setQuantityRange] = useState({ min: 1, max: 100 });
  const [showUrgentPopup, setShowUrgentPopup] = useState(false);
  const [urgentDate, setUrgentDate] = useState("");
  const [urgentName, setUrgentName] = useState("");
  const [urgentTel, setUrgentTel] = useState("");
  const [urgentEmail, setUrgentEmail] = useState("");
  const [urgentMessage, setUrgentMessage] = useState("");
  const [maxSelected, setMaxSelected] = useState(false);
  const [defaultSelected, setDefaultSelected] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [urgentFiles, setUrgentFiles] = useState([]);
  const [urgentSubmitting, setUrgentSubmitting] = useState(false);
  const [addtoCartErr, setAddtoCartErr] = useState("");

  // upload urgent files

  function handleUrgentFileChange(e) {
    const files = Array.from(e.target.files);
    const maxFiles = 10;
    const maxSize = 20 * 1024 * 1024;
    const allowedTypes = ["jpg", "jpeg", "png", "pdf"];

    if (files.length > maxFiles) {
      alert(`You can upload up to ${maxFiles} files.`);
      e.target.value = "";
      setUrgentFiles([]);
      return;
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > maxSize) {
      alert("Total file size must be less than 20MB.");
      e.target.value = "";
      setUrgentFiles([]);
      return;
    }

    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!allowedTypes.includes(ext)) {
        alert("Only JPG, PNG, or PDF files are allowed.");
        e.target.value = "";
        setUrgentFiles([]);
        return;
      }
    }

    setUrgentFiles(files);
  }

  // upload urgent files

  // useEffect(() => {
  //   console.clear();
  //   console.log(attributes);
  //   // console.log(filteredAddons);
  //   // console.log(currency_symbol);
  //   // console.log(currency_symbol);
  //   // console.log(currency_position);
  //   console.log(tax_percent);
  //   // console.log(variationData)
  // }, [attributes]);

  // useEffect(() => {
  //   // console.clear();
  //   console.log(variations);
  // }, [variations]);

  useEffect(() => {
    const filteredAddons = addons.filter((a) => a.parent_id === 0);
    if (filteredAddons.length - 1 > totalSteps) {
      setTotalSpets(totalSteps + filteredAddons.length - 1);
      setInitSteps(totalSteps + filteredAddons.length - 1);
    }

    // console.clear();
    // console.log(filteredAddons.length);
    // console.log(totalSteps);
  }, [addons]);

  // useEffect(() => {
  //   console.clear()
  //   console.log(totalSteps)
  // }, [totalSteps]);

  // check if only attribute is pa-options
  useEffect(() => {
    if (
      attributeKeys.length === 1 &&
      attributeKeys[0] === "pa_options" &&
      Object.keys(selectedAttributes).length === 0
    ) {
      const attrKey = "pa_options";
      const attr = attributes[attrKey];
      const terms = attr?.terms || [];

      if (terms.length === 1 && terms[0].slug === "default") {
        handleSelect(attrKey, "default");
        setMaxVisibleStep(1); // Jump to quantity step
        setDefaultSelected(true);
      }
    }
  }, [attributeKeys, attributes, selectedAttributes]);
  // check if only attribute is pa-options

  useEffect(() => {
    let minQty = Infinity;
    let maxQty = -Infinity;

    // 1. Handle variant base conditional prices
    if (
      variationData &&
      Array.isArray(variationData.conditional_prices) &&
      variationData.conditional_prices.length
    ) {
      const sorted = [...variationData.conditional_prices].sort(
        (a, b) => Number(a.qty) - Number(b.qty)
      );
      minQty = Math.min(minQty, Number(sorted[0].qty));
      maxQty = Math.max(maxQty, Number(sorted[sorted.length - 1].qty));
    }

    // 2. Handle addon minimum qtys
    addons.forEach((addon) => {
      const selected = selectedAddons[addon.id];
      if (!selected) return;

      const optionsArray = Array.isArray(addon.options)
        ? addon.options
        : Object.values(addon.options || {});

      const selectedNames = Array.isArray(selected) ? selected : [selected];

      selectedNames.forEach((selectedName) => {
        const matched = optionsArray.find((opt) => opt.name === selectedName);
        if (
          matched &&
          Array.isArray(matched.price_table) &&
          matched.price_table.length > 0
        ) {
          const firstQty = Number(matched.price_table[0].qty);
          if (!isNaN(firstQty)) {
            minQty = Math.max(minQty, firstQty); // We want the *highest* minimum
          }

          const lastQty = Number(
            matched.price_table[matched.price_table.length - 1].qty
          );
          if (!isNaN(lastQty)) {
            maxQty = Math.max(maxQty, lastQty);
          }
        }
      });
    });

    // Fallback to defaults if no data
    if (!isFinite(minQty)) minQty = 1;
    if (!isFinite(maxQty)) maxQty = 1000;

    setQuantityRange({ min: minQty, max: maxQty });
  }, [variationData, selectedAddons, addons]);

  useEffect(() => {
    if (
      variationData &&
      selectedQtyOption !== null &&
      quantitySelected > 0 &&
      Object.keys(selectedAttributes).length === attributeKeys.length &&
      maxVisibleStep === attributeKeys.length
    ) {
      setMaxVisibleStep(attributeKeys.length + 1);
    }
  }, [variationData, selectedQtyOption, quantitySelected]);

  useEffect(() => {
    const allAttrsSelected =
      Object.keys(selectedAttributes).length === attributeKeys.length;
    const onQuantityStep = maxVisibleStep === attributeKeys.length;

    if (
      allAttrsSelected &&
      onQuantityStep &&
      !variationData &&
      quantitySelected === 0
    ) {
      // console.clear();
      console.log(variationData);
      findVariation({ ...selectedAttributes, quantity: 0 });
    }
  }, [selectedAttributes, maxVisibleStep]);

  useEffect(() => {
    const matchedMinimums = [];

    attributeKeys.forEach((attrKey) => {
      const { enabled_if, enabled_if_value, minimum_qty } =
        attributes[attrKey] || {};

      if (!minimum_qty || isNaN(minimum_qty)) return;

      if (!enabled_if || !enabled_if_value) {
        matchedMinimums.push(parseInt(minimum_qty, 10));
      } else {
        const targetKey = attributeKeys.find((k) => k.endsWith(enabled_if));
        const selectedVal = selectedAttributes[targetKey];
        if (selectedVal === enabled_if_value) {
          matchedMinimums.push(parseInt(minimum_qty, 10));
        }
      }
    });

    const maxMinQty =
      matchedMinimums.length > 0 ? Math.max(...matchedMinimums) : 1;
    // setQuantityRange((prev) => ({ ...prev, min: maxMinQty }));
  }, [selectedAttributes, attributes, attributeKeys]);

  function handleSelect(attrKey, selectedSlug) {
    setSelectedAttributes((prev) => {
      const newSelections = { ...prev, [attrKey]: selectedSlug };
      setVariationData(null);
      const stepIndex = attributeKeys.indexOf(attrKey);

      const allAttrsPreviouslySelected =
        Object.keys(prev).length === attributeKeys.length;
      const changingLastAttribute = stepIndex === attributeKeys.length - 1;

      if (allAttrsPreviouslySelected && changingLastAttribute) {
        setQuantitySelected(0);
        setSelectedQtyOption(null);
        setSelectedPriceOption(null);
        setMaxVisibleStep(attributeKeys.length);
      } else {
        if (stepIndex === attributeKeys.length - 1) {
          setMaxVisibleStep(attributeKeys.length);
        } else {
          setMaxVisibleStep(stepIndex + 1);
        }
      }

      return newSelections;
    });
  }

  // ===========================new variation logic

  // --- helpers ---
  function attrsMatch(a = {}, b = {}) {
    const norm = (obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          String(k).toLowerCase(),
          String(v).toLowerCase(),
        ])
      );
    a = norm(a);
    b = norm(b);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if ((a[k] || "") !== (b[k] || "")) return false;
    return true;
  }

  // Same logic as your PHP (exact tier -> interpolate -> nearest)
  function interpolatePrice(tiers = [], qty = 0, fallback = null) {
    if (!Array.isArray(tiers) || !tiers.length) return fallback ?? 0;
    const sorted = [...tiers].sort(
      (x, y) => parseFloatSafe(x.qty) - parseFloatSafe(y.qty)
    );
    if (!qty || qty <= 0) return fallback ?? parseFloatSafe(sorted[0].price);

    let below = null,
      above = null;
    for (const t of sorted) {
      const tq = parseFloatSafe(t.qty),
        tp = parseFloatSafe(t.price);
      if (tq === qty) return tp;
      if (tq < qty) below = t;
      if (tq > qty) {
        above = t;
        break;
      }
    }
    if (
      below &&
      above &&
      parseFloatSafe(above.qty) !== parseFloatSafe(below.qty)
    ) {
      const pA = parseFloatSafe(below.price),
        pB = parseFloatSafe(above.price);
      const qA = parseFloatSafe(below.qty),
        qB = parseFloatSafe(above.qty);
      return pA + ((pB - pA) * (qty - qA)) / (qB - qA);
    }
    if (below) return parseFloatSafe(below.price);
    if (above) return parseFloatSafe(above.price);
    return fallback ?? parseFloatSafe(sorted[0].price);
  }

  function formatMoney(
    amount,
    {
      symbol = window.pearlWCData?.currency_symbol || "£",
      position = window.pearlWCData?.currency_position || "left", // left|right|left_space|right_space
      decimals = window.pearlWCData?.price_decimals ?? 2,
      decSep = window.pearlWCData?.decimal_sep || ".",
      thouSep = window.pearlWCData?.thousand_sep || ",",
    } = {}
  ) {
    const n = Number(amount);
    const parts = n.toFixed(decimals).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thouSep);
    const num = decimals ? `${parts[0]}${decSep}${parts[1]}` : parts[0];
    const leftish = position === "left" || position === "left_space";
    const spacer =
      position === "left_space" || position === "right_space" ? " " : "&nbsp;";
    return `<span class="woocommerce-Price-amount amount"><bdi>${
      leftish
        ? `<span class="woocommerce-Price-currencySymbol">${symbol}</span>${spacer}${num}`
        : `${num}${spacer}<span class="woocommerce-Price-currencySymbol">${symbol}</span>`
    }</bdi></span>`;
  }

  // --- main ---
  async function findVariation(currentSelections) {
    setLoading(true);
    try {
      // 1) Build prefixedSelections (attributes + quantity as attribute_quantity)
      const prefixedSelections = {};
      for (const [key, val] of Object.entries(currentSelections || {})) {
        const k = key.startsWith("attribute_") ? key : `attribute_${key}`;
        prefixedSelections[k] = val;
      }
      // normalize quantity source
      if (
        currentSelections?.quantity != null &&
        prefixedSelections.attribute_quantity == null
      ) {
        prefixedSelections.attribute_quantity = currentSelections.quantity;
      }

      // 2) Split out qty and pure attribute set
      const qtyValue = Number(prefixedSelections.attribute_quantity || 0);
      const attrsOnly = Object.fromEntries(
        Object.entries(prefixedSelections).filter(
          ([k]) => k !== "attribute_quantity"
        )
      );

      // 3) Try client-side match if variations exist
      const localVariations =
        typeof variations !== "undefined" && Array.isArray(variations)
          ? variations
          : Array.isArray(window.pearlWCData?.variations)
          ? window.pearlWCData.variations
          : null;

      let matchedVar = null;
      if (Array.isArray(localVariations) && localVariations.length) {
        matchedVar = localVariations.find((v) =>
          attrsMatch(v.attributes, attrsOnly)
        );
        if (matchedVar) {
          const fallback =
            matchedVar.display_price != null
              ? Number(matchedVar.display_price)
              : null;
          const priceNum = interpolatePrice(
            matchedVar.conditional_prices,
            qtyValue,
            fallback
          );
          const priceHtml = formatMoney(priceNum);

          // optimistic UI update
          setVariationData({
            variation_id: matchedVar.variation_id,
            price: priceHtml,
            price_num: priceNum,
            attributes: { ...matchedVar.attributes },
            conditional_prices: Array.isArray(matchedVar.conditional_prices)
              ? matchedVar.conditional_prices
              : [],
            lead_time:
              window.pearlWCData?.lead_times?.[matchedVar.variation_id] ??
              matchedVar.lead_time ??
              null,
          });

          return;
        }
      }

      // 4) Server call (authoritative, includes PHP-side interpolation & meta)
      const response = await fetch(ajax_url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: ajax_action,
          product_id,
          attributes: JSON.stringify(attrsOnly), // DO NOT send attribute_quantity here
          quantity: String(qtyValue),
          nonce,
        }),
      });

      const result = await response.json();
      if (result?.success) {
        setVariationData(result.data);
      } else if (!matchedVar) {
        // Only clear if we didn't already set optimistic data
        setVariationData(null);
      }
    } catch (err) {
      console.error("findVariation error:", err);
      setVariationData(null);
    } finally {
      setLoading(false);
    }
  }

  //  ========================== new variation logic

  // async function findVariation(currentSelections) {
  //   setLoading(true);
  //   try {
  //     const prefixedSelections = {};
  //     for (const [key, val] of Object.entries(currentSelections)) {
  //       prefixedSelections[
  //         key.startsWith("attribute_") ? key : `attribute_${key}`
  //       ] = val;
  //     }

  //     console.log(prefixedSelections)
  //     const qtyValue = currentSelections.quantity || 0;
  //     const response = await fetch(ajax_url, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //       body: new URLSearchParams({
  //         action: ajax_action,
  //         product_id,
  //         attributes: JSON.stringify(prefixedSelections),
  //         quantity: qtyValue.toString(),
  //         nonce,
  //       }),
  //     });
  //     const result = await response.json();
  //     if (result.success) {
  //       setVariationData(result.data);
  //     } else {
  //       setVariationData(null);
  //     }
  //   } catch (error) {
  //     setVariationData(null);
  //   } finally {

  //     setLoading(false);
  //   }
  // }

  useEffect(() => {
    console.log(variationData);
  }, [variationData]);

  // function addToCart(variation_id) {
  //   console.log("Add to cart for Variation ID:", variation_id);
  // }


    // =======================403 fallback helper

  // Turn URLSearchParams into a plain object
  function paramsToObject(params) {
    const obj = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }

  /**
   * Try admin-ajax first. If we get 403, report it and retry via WP REST API.
   * - ajaxUrl: admin-ajax.php
   * - restUrl: e.g. "/wp-json/pearl/v1/add-to-cart"
   * - params: URLSearchParams (what you already build)
   * - restExtraHeaders: optional headers (adds X-WP-Nonce if you want)
   */
  async function ajaxWithRestFallback({
    ajaxUrl,
    restUrl,
    params,
    restExtraHeaders = {},
  }) {
    // 1) Try admin-ajax first
    const ajaxRes = await fetch(ajaxUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  
    // 403? log + fallback to REST
    if (ajaxRes.status === 403) {
      // optional: uptime ping
      fetch("/wp-json/uptime/v1/report403?token=yhfx4LbpcICb5lGHS7TXP0pkJmtaoepudbddHdtUgm3r0ema5V7oy2p2RoyR4C8E", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 403, t: Date.now(), via: "admin-ajax" }),
      }).catch(() => {});
  
      // Build same payload as JSON
      const jsonBody = paramsToObject(params);
  
      // Pick up REST nonce exposed by PHP: wp_localize_script('...','wpApiSettings',['nonce'=>wp_create_nonce('wp_rest')])
      const restNonce = (window.wpApiSettings && window.wpApiSettings.nonce) || "";
  
      // Send cookies + REST nonce (WordPress REST cookie auth)
      const restRes = await fetch(
        restNonce ? `${restUrl}?_wpnonce=${encodeURIComponent(restNonce)}` : restUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": restNonce, // required when cookies are sent
            ...restExtraHeaders,
          },
          credentials: "same-origin", // ensure WP cookies go with the request
          body: JSON.stringify(jsonBody), // includes your own pearlWCData.nonce inside
        }
      );
  
      return restRes.json();
    }
  
    // Normal admin-ajax path
    return ajaxRes.json();
  }
  

  // =======================403 fallback helper


  function getAQuote(variation_id, fallbackPrice, quantity, btn) {
    const { min } = quantityRange;
    const finalPrice =
      selectedPriceOption !== null ? selectedPriceOption : fallbackPrice;

    const addonExtraPerPiece = getAddonExtraPerPiece(
      selectedAddons,
      addons,
      quantity
    );

    setLoading(true);

    console.clear();
    console.log(addonExtraPerPiece);
    console.log(finalPrice);
    console.log(parseFloat(finalPrice) + parseFloat(addonExtraPerPiece));
    // NEW: Use interpolated price with addons if addons are selected
    const lastPrice =
      variationData && variationData.conditional_prices && variationData.conditional_prices.length > 0 && Object.keys(selectedAddons).length > 0
        ? getInterpolatedPriceWithAddons(variationData.conditional_prices, selectedAddons, addons, quantity)
        : parseFloatSafe(finalPrice) + parseFloatSafe(addonExtraPerPiece);

    const params = new URLSearchParams();
    params.append("action", "pearl_wc_add_to_cart_custom");
    params.append("product_id", product_id);
    params.append("variation_id", variation_id);
    params.append("quantity", quantity);
    params.append("price_num", lastPrice);
    params.append("nonce", nonce);
    params.append("addons", JSON.stringify(selectedAddons));
    params.append("addonsPricePerpiece", addonExtraPerPiece);
    params.append("minQty", min);

    ajaxWithRestFallback({
      ajaxUrl: ajax_url,
      // 🔁 Adjust to your actual REST route that performs the same action server-side
      restUrl: "/wp-json/pearl/v1/add-to-cart",
      params,
    })
      .then((result) => {
        if (result && result.success) {
          fetch(
            "/wp-json/uptime/v1/reportOK?token=yhfx4LbpcICb5lGHS7TXP0pkJmtaoepudbddHdtUgm3r0ema5V7oy2p2RoyR4C8E",
            { method: "POST" }
          ).catch(() => {});
          if (btn == "quote_btn") {
            window.location.href = quote_page_url;
          } else {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ ecommerce: null });
            window.dataLayer.push({
              event: "add_to_cart",
              ecommerce: {
                currency: window.GA4_CTX?.currency || "GBP",
                items: [
                  {
                    item_id: String(product_id),
                    item_name:
                      window.GA4_CTX?.product_name ||
                      (typeof product_name !== "undefined" ? product_name : ""),
                    quantity: Number(quantity),
                  },
                ],
              },
              eventCallback: function () {
                console.clear();
                console.log(window.dataLayer);
                window.location.href = "/cart";
              },
            });
            setTimeout(function () {
              window.location.href = "/cart";
            }, 1000);
          }
        } else {
          const msg = (result && result.data) || "Unexpected error";
          // alert("Error: " + msg);
          setAddtoCartErr(
            "Une erreur s'est produite ! Veuillez réessayer plus tard."
          );
          setLoading(false);
        }
      })
      .catch((error) => {
        // (fix) your old code referenced result.data here — which crashes.
        // alert("Request failed. " + (error && error.message ? error.message : ""));
        setAddtoCartErr(
          "Une erreur s'est produite ! Veuillez réessayer plus tard."
        );
        setLoading(false);
      })
      .finally(() => {
        // setLoading(false)
      });
  }

  // function getAQuote(variation_id, fallbackPrice, quantity, btn) {
  //   const { min } = quantityRange;
  //   const finalPrice =
  //     selectedPriceOption !== null ? selectedPriceOption : fallbackPrice;

  //   const addonExtraPerPiece = getAddonExtraPerPiece(
  //     selectedAddons,
  //     addons,
  //     quantity
  //   );

  //   setLoading(true);

  //   console.clear();
  //   console.log(addonExtraPerPiece);
  //   console.log(finalPrice);
  //   console.log(parseFloat(finalPrice) + parseFloat(addonExtraPerPiece));
  //   const lastPrice =
  //     parseFloatSafe(finalPrice) + parseFloatSafe(addonExtraPerPiece);

  //   const params = new URLSearchParams();
  //   params.append("action", "pearl_wc_add_to_cart_custom");
  //   params.append("product_id", product_id);
  //   params.append("variation_id", variation_id);
  //   params.append("quantity", quantity);
  //   params.append("price_num", lastPrice);
  //   params.append("nonce", nonce);
  //   params.append("addons", JSON.stringify(selectedAddons));
  //   params.append("addonsPricePerpiece", addonExtraPerPiece);
  //   params.append("minQty", min);

  //   fetch(ajax_url, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     body: params,
  //   })
  //     .then((response) => response.json())
  //     .then((result) => {
  //       if (result.success) {
  //         if (btn == "quote_btn") {
  //           window.location.href = quote_page_url;
  //         } else {
  //           window.dataLayer = window.dataLayer || [];

  //           // Clear any previous ecommerce object
  //           window.dataLayer.push({ ecommerce: null });

  //           window.dataLayer.push({
  //             event: "add_to_cart",
  //             ecommerce: {
  //               currency: window.GA4_CTX?.currency || "GBP", // set in wp_localize_script
  //               items: [
  //                 {
  //                   item_id: String(product_id),
  //                   item_name:
  //                     window.GA4_CTX?.product_name ||
  //                     (typeof product_name !== "undefined" ? product_name : ""),
  //                   quantity: Number(quantity),
  //                 },
  //               ],
  //             },
  //             eventCallback: function () {

  //               console.clear();
  //               console.log(window.dataLayer)
  //               window.location.href = "/panier"; // redirect after GA4 hit
  //             },
  //           });

  //           // Fallback redirect in case callback doesn’t fire (adblockers, etc.)
  //           setTimeout(function () {
  //             window.location.href = "/panier";
  //           }, 1000);
  //         }
  //       } else {
  //         alert("Error: " + result.data);
  //         setLoading(false);
  //       }
  //     })
  //     .catch((error) => {
  //       alert("Error: " + result.data);
  //       setLoading(false);
  //     })
  //     .finally(() => {
  //       // setLoading(false)
  //     });
  // }

  function renderAttributeInput(attrKey) {
    const attrData = attributes[attrKey] || {};
    const {
      display_type = "dropdown",
      terms = [],
      enabled_if = "",
      minimum_qty = 0,
    } = attrData;

    const wrapperProps = {
      className: `attribute-input-wrapper ${display_type}`,
      "data-enabled-if": enabled_if,
      "data-minimum-qty": minimum_qty,
    };

    if (display_type === "image_selector") {
      return React.createElement(
        "div",
        wrapperProps,
        React.createElement(
          "div",
          {
            className: "kd-image-selector",
            style: {
              display: "flex",
              flexFlow: "row wrap",
            },
          },
          terms.map((termObj) =>
            React.createElement(
              "div",
              {
                key: termObj.slug,
                onClick: () => handleSelect(attrKey, termObj.slug),
                className: "kd-image-selector-col",
                style: {
                  border:
                    selectedAttributes[attrKey] === termObj.slug
                      ? "2px solid #469ADC"
                      : "1px solid #ccc",

                  background:
                    selectedAttributes[attrKey] === termObj.slug
                      ? "#e6f0fa"
                      : "#fff",
                },
              },
              React.createElement(
                "div",
                { className: "kd-image-selector-title" },
                termObj.name
              ),
              React.createElement("img", {
                src:
                  termObj.thumbnail_url ||
                  "https://dummyimage.com/60x60/#ccc/fff",
                alt: termObj.name || termObj.slug,
                style: {
                  height: "48px",
                  objectFit: "contain",
                  marginBottom: "5px",
                },
              })
            )
          )
        )
      );
    }

    if (display_type === "select_boxes") {
      return React.createElement(
        "div",
        wrapperProps,
        React.createElement(
          "div",
          { className: "box-selector" },
          terms.map((termObj) =>
            React.createElement(
              "div",
              {
                key: termObj.slug,
                onClick: () => handleSelect(attrKey, termObj.slug),
                className: "box-selector-item",
                style: {
                  cursor: "pointer",
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "10px",
                },
              },
              React.createElement(
                "div",
                { className: "box-selector-inner" },
                React.createElement("strong", null, termObj.name),
                termObj.description
                  ? React.createElement("p", null, termObj.description)
                  : null
              )
            )
          )
        )
      );
    }

    return React.createElement(
      "div",
      wrapperProps,
      React.createElement(
        "select",
        {
          onChange: (e) => {
            if (e.target.value) handleSelect(attrKey, e.target.value);
          },
        },
        React.createElement("option", { value: "" }, `Select ${attrKey}`),
        ...terms.map((termObj) =>
          React.createElement(
            "option",
            { key: termObj.slug, value: termObj.slug },
            termObj.name
          )
        )
      )
    );
  }

  function renderAttributeSteps() {
    const visibleSteps = [];
    let visibleIndex = 0;

    attributeKeys.forEach((attrKey, i) => {
      const attrData = attributes[attrKey] || {};
      const {
        display_title = "",
        enabled_if = "",
        enabled_if_value = "",
      } = attrData;

      // First step always visible
      if (visibleIndex === 0 || !enabled_if || !enabled_if_value) {
        visibleSteps.push({ attrKey, index: visibleIndex });
        visibleIndex++;
        return;
      }

      const targetKey = attributeKeys.find((k) => k.endsWith(enabled_if));
      const selectedValue = selectedAttributes[targetKey];

      if (selectedValue === enabled_if_value) {
        visibleSteps.push({ attrKey, index: visibleIndex });
        visibleIndex++;
      }
    });

    return visibleSteps.map(({ attrKey, index }) => {
      const attrData = attributes[attrKey] || {};
      const display_title = attrData.display_title || "";
      const display_description = attrData.display_description || "";
      let chosenSlug = selectedAttributes[attrKey] || "";
      chosenSlug = chosenSlug
        .toLowerCase()
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

      const isExpanded = index === maxVisibleStep;

      const stepClass = [
        "pearl-step",
        !isExpanded ? "collapsed" : "",
        !isExpanded && chosenSlug ? "selected" : "",
        defaultSelected && attrKey === "pa_options" ? "default-select" : "",
      ]
        .join(" ")
        .trim();

      let headerChildren;

      if (!isExpanded && chosenSlug) {
        headerChildren = [
          React.createElement(
            "span",
            {
              key: "wrapper",
              style: { display: "flex", width: "85%", alignItems: "center" },
              className: "kd-selected-step-info",
            },
            React.createElement(
              "div",
              { className: "kd-prod-attribute-title-wrapper" },
              React.createElement("span", {}, `${index + 1}: ${display_title}`)
            ),
            React.createElement(
              "span",
              { className: "kd-selected-val", style: { width: "60%" } },
              `${chosenSlug}`
            )
          ),
          React.createElement(
            "button",
            {
              key: "chg",
              type: "button",
              style: { width: "15%", textAlign: "right" },
              className: "kd-selected-chng-btn",
              onClick: () => setMaxVisibleStep(index),
            },
            "Changer"
          ),
        ];
      } else {
        headerChildren = [
          React.createElement(
            "div",
            { className: "kd-prod-attribute-title-wrapper" },
            React.createElement(
              "span",
              { key: "title" },
              `${index + 1}: ${display_title}`
            ),
            React.createElement(
              "small",
              { style: { width: "50%" } },
              `${display_description}`
            )
          ),
        ];
      }

      return React.createElement(
        "div",
        {
          key: attrKey,
          className: stepClass,
          onClick: !isExpanded ? () => setMaxVisibleStep(index) : undefined,
        },
        React.createElement("h3", null, ...headerChildren),
        isExpanded &&
          React.createElement(
            "div",
            { className: "kd-step-collapse" },
            renderAttributeInput(attrKey)
            //             chosenSlug &&
            //               React.createElement(
            //                 "p",
            //                 { style: { marginTop: 5 } },
            //                 "Selected: " + chosenSlug
            //               )
          )
      );
    });
  }

  // addons

  // function handleAddonSelect(addonId, value) {
  //   // console.clear();
  //   // console.log(value);

  //   setSelectedAddons((prev) => {
  //     const updated = { ...prev, [addonId]: value };

  //     const allVisibleAddons = [];
  //     let totalIncrease = 0;

  //     // Loop through top-level addons (parent_id === 0)
  //     addons
  //       .filter((a) => a.parent_id === 0)
  //       .forEach((parent) => {
  //         allVisibleAddons.push(parent);

  //         // First child level
  //         const child = addons.find(
  //           (a) =>
  //             a.parent_id === parent.id &&
  //             updated[parent.id] === a.visible_if_option
  //         );

  //         if (child) {
  //           allVisibleAddons.push(child);
  //           console.log(child);
  //           totalIncrease = totalIncrease + 1;

  //           // Second child (grandchild) level
  //           const grandchild = addons.find(
  //             (a) =>
  //               a.parent_id === child.id &&
  //               updated[child.id] === a.visible_if_option
  //           );

  //           if (grandchild) {
  //             // console.clear();
  //             console.log(grandchild);
  //             allVisibleAddons.push(grandchild);
  //           }
  //         }
  //       });

  //     const currentIndex = allVisibleAddons.findIndex((a) => a.id === addonId);
  //     const initialCountLocal = initSteps; // freeze the initial value
  //     console.log(initialCountLocal);

  //     setMaxVisibleStep(attributeKeys.length + currentIndex + 1);
  //     console.log(parseInt(initialCountLocal) + totalIncrease);
  //     setTotalSpets(parseInt(initialCountLocal) + totalIncrease);

  //     return updated;
  //   });
  // }

  function getDescendantIds(addonId) {
    const ids = [];
    const queue = [addonId];
    while (queue.length) {
      const pid = queue.shift();
      const children = addons.filter((a) => a.parent_id === pid);
      for (const c of children) {
        ids.push(c.id);
        queue.push(c.id);
      }
    }
    // exclude the root itself (we only want its children/grandchildren)
    return ids.filter((id) => id !== addonId);
  }

  function handleAddonSelect(addonId, value) {
    setSelectedAddons((prev) => {
      // If the selection for this node actually changes, clear all its descendants
      let updated = { ...prev };

      const isChanged = updated[addonId] !== value;
      updated[addonId] = value;

      if (isChanged) {
        const descendants = getDescendantIds(addonId);
        for (const id of descendants) {
          // remove any previously selected child/grandchild values
          if (id in updated) delete updated[id];
        }
      }

      // ----- existing visibility / step logic (unchanged) -----
      const allVisibleAddons = [];
      let totalIncrease = 0;

      addons
        .filter((a) => a.parent_id === 0)
        .forEach((parent) => {
          allVisibleAddons.push(parent);

          const child = addons.find(
            (a) =>
              a.parent_id === parent.id &&
              updated[parent.id] === a.visible_if_option
          );

          if (child) {
            allVisibleAddons.push(child);
            totalIncrease += 1;

            const grandchild = addons.find(
              (a) =>
                a.parent_id === child.id &&
                updated[child.id] === a.visible_if_option
            );

            if (grandchild) {
              allVisibleAddons.push(grandchild);
            }
          }
        });

      const currentIndex = allVisibleAddons.findIndex((a) => a.id === addonId);
      const initialCountLocal = initSteps;

      setMaxVisibleStep(attributeKeys.length + currentIndex + 1);
      setTotalSpets(parseInt(initialCountLocal) + totalIncrease);

      return updated;
    });
  }

  useEffect(() => {
    console.log(selectedAddons);
  }, [selectedAddons]);

  // multiple choises
  const addonSelectionsRef = React.useRef({});

  function renderAddonInput(addon) {
    const selected = selectedAddons[addon.id] || "";
    const optionsArray = Array.isArray(addon.options)
      ? addon.options
      : Object.values(addon.options); // Normalize object to array

    if (addon.display_type == "dropdown") {
      return React.createElement(
        "select",
        {
          value: selected,
          onChange: (e) => handleAddonSelect(addon.id, e.target.value),
        },
        React.createElement("option", { value: "" }, "Select an option"),
        ...optionsArray.map((opt) =>
          React.createElement(
            "option",
            { key: opt.name, value: opt.name },
            opt.name
          )
        )
      );
    } else if (addon.display_type === "image_selector") {
      return React.createElement(
        "div",
        {},
        React.createElement(
          "div",
          {
            className: "kd-image-selector",
            style: {
              display: "flex",
              flexFlow: "row wrap",
            },
          },
          ...optionsArray.map((opt) =>
            React.createElement(
              "div",
              {
                key: opt.name,
                onClick: () => handleAddonSelect(addon.id, opt.name),
                className: "kd-image-selector-col",
                style: {
                  border:
                    selected === opt.name
                      ? "2px solid #469ADC"
                      : "1px solid #ccc",

                  background: selected === opt.name ? "#e6f0fa" : "#fff",
                },
              },
              React.createElement(
                "div",
                { className: "kd-image-selector-title" },
                opt.name
              ),
              React.createElement("img", {
                src: opt.image || "https://dummyimage.com/60x60/#ccc/fff",
                alt: opt.name,
                style: {
                  height: "48px",
                  objectFit: "contain",
                  marginBottom: "5px",
                },
              })
            )
          )
        )
      );
    } else if (addon.display_type === "select_boxes") {
      return React.createElement(
        "div",
        {},
        React.createElement(
          "div",
          { className: "box-selector" },
          ...optionsArray.map((opt) =>
            React.createElement(
              "div",
              {
                key: opt.name,
                onClick: () => handleAddonSelect(addon.id, opt.name),
                className: "box-selector-item",
                style: {
                  cursor: "pointer",
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "10px",
                },
              },
              React.createElement(
                "div",
                { className: "box-selector-inner" },
                React.createElement("strong", null, opt.name),
                opt.description
                  ? React.createElement("p", null, opt.description)
                  : null
              )
            )
          )
        )
      );
    } else if (addon.display_type === "multiple_choise") {
      const handleCheckboxChange = (e) => {
        const isNone = e.target.value === "none";
        const checkboxes = document.querySelectorAll(
          `input[name="${addon.id}"]`
        );

        if (isNone && e.target.checked) {
          checkboxes.forEach((cb) => {
            if (cb.value !== "none") cb.checked = false;
          });
          addonSelectionsRef.current = ["none"];
          handleAddonSelect(addon.id, "none");
        } else {
          const values = Array.from(checkboxes)
            .filter((cb) => cb.checked && cb.value !== "none")
            .map((cb) => cb.value);

          const noneBox = document.querySelector(
            `input[name="${addon.id}"][value="none"]`
          );
          if (noneBox) noneBox.checked = false;

          addonSelectionsRef.current = values;
        }

        // console.clear();
        // console.log("inside change", addonSelectionsRef.current);

        // Show/hide the button based on selection
        const btn = document.getElementById(`submit-addon-${addon.id}`);
        if (btn) {
          btn.style.display =
            addonSelectionsRef.current.length > 0 ? "inline-block" : "none";
        }
      };

      return React.createElement(
        "div",
        { className: "kd-step-choises" },
        // "None" checkbox
        React.createElement(
          "label",
          { style: { display: "block", marginBottom: "8px" } },
          React.createElement("input", {
            type: "checkbox",
            value: "Aucun",
            name: addon.id,
            onChange: handleCheckboxChange,
            style: { marginRight: "8px" },
          }),
          "Aucun"
        ),
        // Dynamic checkboxes
        ...optionsArray.map((opt, index) =>
          React.createElement(
            "label",
            { key: index, style: { display: "block", marginBottom: "8px" } },
            React.createElement("input", {
              type: "checkbox",
              value: opt.name,
              name: addon.id,
              onChange: handleCheckboxChange,
              style: { marginRight: "8px" },
            }),
            opt.name
          )
        ),
        // Submit button
        React.createElement(
          "button",
          {
            id: `submit-addon-${addon.id}`,
            onClick: () => {
              console.log("onClick selected:", addonSelectionsRef.current);
              handleAddonSelect(addon.id, [...addonSelectionsRef.current]);
            },
            style: { marginTop: "10px", display: "none" },
            className: "kd-addon-submit-btn",
          },
          "Valider"
        )
      );
    }
  }

  function renderVisibleAddonSteps() {
    if (!addonsEnabled) return [];

    const allVisible = [];

    addons
      .filter((a) => a.parent_id === 0)
      .forEach((parent) => {
        allVisible.push(parent);

        const child = addons.find(
          (a) =>
            a.parent_id === parent.id &&
            selectedAddons[parent.id] === a.visible_if_option
        );

        if (child) {
          allVisible.push(child);

          const grandchild = addons.find(
            (a) =>
              a.parent_id === child.id &&
              selectedAddons[child.id] === a.visible_if_option
          );

          if (grandchild) {
            allVisible.push(grandchild);
          }
        }
      });

    return allVisible.map((addon, i) => {
      const stepIndex = attributeKeys.length + i;
      const isExpanded = maxVisibleStep === stepIndex;
      const selected = selectedAddons[addon.id] || "";

      return React.createElement(
        "div",
        {
          key: "addon_" + addon.id,
          className: `pearl-step ${isExpanded ? "" : "collapsed"} ${
            !isExpanded && selected ? "selected" : ""
          }`.trim(),
          onClick:
            !isExpanded && selected
              ? () => {
                  setMaxVisibleStep(stepIndex);
                }
              : undefined,
        },
        React.createElement(
          "h3",
          null,
          !isExpanded && selected
            ? [
                React.createElement(
                  "span",
                  {
                    key: "label",
                    style: {
                      display: "flex",
                      width: "85%",
                      alignItems: "flex-end"
                    },
                  },
                  React.createElement(
                    "span",
                    { style: { width: "52.5%" } },
                    `${defaultSelected ? stepIndex : stepIndex + 1}: ${
                      addon.name
                    }`
                  ),
                  React.createElement(
                    "span",
                    { className: "kd-selected-val", style: { width: "60%" } },
                    `${selected}`
                  )
                ),
                React.createElement(
                  "button",
                  {
                    key: "button",
                    type: "button",
                    style: {
                      width: "20%",
                      textAlign: "right",
                    },
                    onClick: () => setMaxVisibleStep(stepIndex),
                  },
                  "Changer"
                ),
              ]
            : `${defaultSelected ? stepIndex : stepIndex + 1}: ${addon.name}`
        ),
        isExpanded &&
          React.createElement(
            "div",
            { className: "kd-step-collapse" },
            renderAddonInput(addon)
            //             selected &&
            //               React.createElement(
            //                 "p",
            //                 { style: { marginTop: 5 } },
            //                 "Selected: " + selected
            //               )
          )
      );
    });
  }

  function getAddonExtraPerPiece(selectedAddons, addons, quantity) {
    let totalAddonPrice = 0;

    addons.forEach((addon) => {
      const selected = selectedAddons[addon.id];
      if (!selected) return;

      const optionsArray = Array.isArray(addon.options)
        ? addon.options
        : Object.values(addon.options || {});

      const selectedNames = Array.isArray(selected) ? selected : [selected];

      selectedNames.forEach((selectedName) => {
        const selectedOption = optionsArray.find(
          (opt) => opt.name === selectedName
        );
        if (!selectedOption || !Array.isArray(selectedOption.price_table))
          return;

        // Sort price table by qty ascending
        const sortedPrices = selectedOption.price_table
          .map((entry) => ({
            qty: Number(entry.qty),
            price: Number(entry.price),
          }))
          .sort((a, b) => a.qty - b.qty);

        let priceToUse = null;

        for (let i = sortedPrices.length - 1; i >= 0; i--) {
          if (quantity >= sortedPrices[i].qty) {
            priceToUse = sortedPrices[i].price;
            break;
          }
        }

        if (priceToUse !== null) {
          totalAddonPrice += priceToUse;
        }
      });
    });

    return totalAddonPrice;
  }

  // NEW: Get addon price for a specific tier quantity (used for building combined tiers)
  function getAddonPriceForTierQty(selectedAddons, addons, tierQty) {
    let totalAddonPrice = 0;

    addons.forEach((addon) => {
      const selected = selectedAddons[addon.id];
      if (!selected) return;

      const optionsArray = Array.isArray(addon.options)
        ? addon.options
        : Object.values(addon.options || {});

      const selectedNames = Array.isArray(selected) ? selected : [selected];

      selectedNames.forEach((selectedName) => {
        const selectedOption = optionsArray.find(
          (opt) => opt.name === selectedName
        );
        if (!selectedOption || !Array.isArray(selectedOption.price_table))
          return;

        const sortedPrices = selectedOption.price_table
          .map((entry) => ({
            qty: Number(entry.qty),
            price: Number(entry.price),
          }))
          .sort((a, b) => a.qty - b.qty);

        let priceToUse = null;
        for (let i = sortedPrices.length - 1; i >= 0; i--) {
          if (tierQty >= sortedPrices[i].qty) {
            priceToUse = sortedPrices[i].price;
            break;
          }
        }

        if (priceToUse !== null) {
          totalAddonPrice += priceToUse;
        }
      });
    });

    return totalAddonPrice;
  }

  // NEW: Get interpolated price with addons combined at each tier
  function getInterpolatedPriceWithAddons(baseTiers, selectedAddons, addons, quantity) {
    if (!Array.isArray(baseTiers) || !baseTiers.length) return 0;

    const combinedTiers = baseTiers.map((tier) => {
      const tierQty = parseFloatSafe(tier.qty);
      const basePrice = parseFloatSafe(tier.price);
      const addonPrice = getAddonPriceForTierQty(selectedAddons, addons, tierQty);
      return {
        qty: tierQty,
        price: basePrice + addonPrice,
      };
    });

    const sorted = [...combinedTiers].sort((a, b) => a.qty - b.qty);

    if (!quantity || quantity <= 0) return sorted[0].price;

    for (const t of sorted) {
      if (t.qty === quantity) return t.price;
    }

    let below = null, above = null;
    for (const t of sorted) {
      if (t.qty < quantity) below = t;
      if (t.qty > quantity) {
        above = t;
        break;
      }
    }

    if (below && above && above.qty !== below.qty) {
      const pA = below.price, pB = above.price;
      const qA = below.qty, qB = above.qty;
      return pA + ((pB - pA) * (quantity - qA)) / (qB - qA);
    }

    if (below) return below.price;
    if (above) return above.price;
    return sorted[0].price;
  }

  function getHiddenDefaultOffset(attributes, attributeKeys, defaultSelected) {
    if (
      defaultSelected &&
      attributeKeys.length === 1 &&
      attributeKeys[0] === "pa_options" &&
      Array.isArray(attributes?.pa_options?.terms) &&
      attributes.pa_options.terms.length === 1 &&
      attributes.pa_options.terms[0]?.slug === "default"
    ) {
      return -1; // one hidden attribute step should not be counted
    }
    return 0;
  }

  // addons

  function renderQuantityStep(quantityStepIndex) {
    const isExpanded = maxVisibleStep === quantityStepIndex;
    const offset = getHiddenDefaultOffset(
      attributes,
      attributeKeys,
      defaultSelected
    );
    const qtyDisplayNum = Math.max(1, quantityStepIndex + 1 + offset);

    // console.clear();
    // console.log(qtyDisplayNum);

    //     const stepClass = isExpanded ? "pearl-step" : "pearl-step collapsed";
    const stepClass = [
      isExpanded ? "pearl-step" : "pearl-step collapsed",
      quantitySelected > 0 ? "selected" : "",
    ]
      .join(" ")
      .trim();
    const { min, max } = quantityRange;

    let headerChildren;

    if (!isExpanded && quantitySelected > 0) {
      headerChildren = [
        React.createElement(
          "span",
          {
            key: "wrapper",
            style: { display: "flex", width: "85%", alignItems: "center" },
            className: "kd-selected-step-info",
          },
          React.createElement(
            "div",
            { className: "kd-prod-attribute-title-wrapper" },
            React.createElement(
              "span",
              {
                style: {},
                onClick: () => {
                  setMaxVisibleStep(quantityStepIndex);
                  setQuantityVerified(false);
                },
              },
              `${qtyDisplayNum}: Votre quantité`
            )
          ),
          React.createElement(
            "span",
            { className: "kd-selected-val", style: { width: "60%" } },
            `${quantitySelected}`
          )
        ),
        React.createElement(
          "button",
          {
            key: "chg",
            type: "button",
            style: { width: "15%", textAlign: "right" },
            className: "kd-selected-chng-btn",
            onClick: () => {
              setMaxVisibleStep(quantityStepIndex);
              setQuantityVerified(false);
            },
          },
          "Changer"
        ),
      ];
    } else {
      headerChildren = [
        React.createElement(
          "span",
          { key: "title" },
          `${qtyDisplayNum}: Choisissez votre quantité (Les prix affichés sont HT)`
        ),
      ];
    }

    const [tempQuantity, setTempQuantity] = useState(min);
    const [quantityVerified, setQuantityVerified] = useState(false);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [message, setMessage] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState([]);

    // handle file uploads

    function handleFileChange(e) {
      const files = Array.from(e.target.files);
      const maxFiles = 10;
      const maxTotalSize = 20 * 1024 * 1024; // 20 MB
      const allowedTypes = ["jpg", "jpeg", "png", "pdf"];

      if (files.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files.`);
        e.target.value = "";
        setUploadedFiles([]);
        return;
      }

      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > maxTotalSize) {
        alert(`Total file size must be under 20 MB.`);
        e.target.value = "";
        setUploadedFiles([]);
        return;
      }

      for (let file of files) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!allowedTypes.includes(ext)) {
          alert("Only JPG, PNG, or PDF files are allowed.");
          e.target.value = "";
          setUploadedFiles([]);
          return;
        }
      }

      setUploadedFiles(files);
    }

    // handle file uploads

    useEffect(() => {
      if (min > quantitySelected) {
        setTempQuantity(min);
      }
    }, [min]);

    useEffect(() => {
      if (quantitySelected != tempQuantity && quantitySelected > min) {
        setTempQuantity(quantitySelected);
      }
    }, [quantitySelected]);

    useEffect(() => {
      if (quantityVerified) {
        setMaxVisibleStep(quantityStepIndex + 1);
      }
    }, [quantityVerified]);

    const handleVerify = () => {
      const val = parseInt(tempQuantity, 10);
      if (!isNaN(val) && val >= min && val <= max) {
        setQuantitySelected(val);
        setSelectedQtyOption(val);
        setSelectedPriceOption(null);
        if (Object.keys(selectedAttributes).length === attributeKeys.length) {
          findVariation({ ...selectedAttributes, quantity: val });
        }
        setQuantityVerified(true);

        console.clear();

      } else {
        alert(`Please enter a value between ${min} and ${max}`);
      }
    };

    const percentFill = Math.max(((tempQuantity - min) / (max - min)) * 100, 0);

    let radioContent = null;
    let sortedOptions = [];
    if (variationData && Array.isArray(variationData.conditional_prices)) {
      sortedOptions = [...variationData.conditional_prices]
        .filter((opt) => Number(opt.qty) >= quantityRange.min)
        .sort((a, b) => Number(a.qty) - Number(b.qty));

      if (sortedOptions.length > 0) {
        const baseQty = parseFloatSafe(sortedOptions[0]?.qty || 1); // e.g., 5
        const basePrice = parseFloatSafe(sortedOptions[0]?.price || 0); // e.g., 50

        const basePerPieceAddon = getAddonExtraPerPiece(
          selectedAddons,
          addons,
          baseQty
        );
        // NEW: Use interpolated combined price for base tier
        const basePerPiecePrice = Object.keys(selectedAddons).length > 0
          ? getInterpolatedPriceWithAddons(variationData.conditional_prices, selectedAddons, addons, baseQty)
          : basePrice + getAddonExtraPerPiece(selectedAddons, addons, baseQty);

        // console.clear()
        // console.log(basePerPiecePrice)

        radioContent = sortedOptions.map((option, idx) => {
          const optionQty = parseFloatSafe(option.qty);
          const optionBasePrice = parseFloatSafe(option.price);

          const addonExtra = getAddonExtraPerPiece(
            selectedAddons,
            addons,
            optionQty
          );

          // NEW: Use interpolated combined price for this tier
          const perPiecePrice = Object.keys(selectedAddons).length > 0
            ? getInterpolatedPriceWithAddons(variationData.conditional_prices, selectedAddons, addons, optionQty)
            : optionBasePrice + getAddonExtraPerPiece(selectedAddons, addons, optionQty);

          const totalPriceWithAddons = perPiecePrice;

          console.log(perPiecePrice);

          const perc =
            basePerPiecePrice > 0
              ? Math.round((1 - perPiecePrice / basePerPiecePrice) * 100)
              : 0;

          return React.createElement(
            "label",
            { key: idx, className: "kd-radio-option" },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center" } },
              React.createElement("input", {
                type: "radio",
                name: "qty_option",
                value: option.qty,
                checked: selectedQtyOption == option.qty,
                onChange: () => {
                  setSelectedQtyOption(option.qty);
                  setSelectedPriceOption(option.price);
                  setQuantitySelected(optionQty);
                  setTempQuantity(optionQty);
                  if (
                    Object.keys(selectedAttributes).length ===
                    attributeKeys.length
                  ) {
                    findVariation({
                      ...selectedAttributes,
                      quantity: optionQty,
                    });
                  }
                  setQuantityVerified(true);
                  setMaxVisibleStep(quantityStepIndex + 1);
                },
              }),
              React.createElement("span", null, option.qty)
            ),
            React.createElement(
              "div",
              {
                className: "kd-radio-meta",
                style: {
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-end",
                },
              },
              perc > 0 &&
                React.createElement(
                  "span",
                  {
                    className: "save",
                    style: {
                      fontWeight: "400",
                      fontSize: "12px",
                      color: "#787878",
                      marginBottom: "2px",
                      marginRight: "80px",
                      width: "100px",
                    },
                  },
                  `EPARGNEZ ${perc}%`
                ),
              React.createElement(
                "span",
                null,
               `${currency_symbol}${totalPriceWithAddons.toFixed(2).replace('.', ',')}`
              )
            )
          );
        });

        radioContent.push(
          React.createElement(
            "a",
            {
              key: "urgent",
              className: "kd-radio-option",
              style: {
                display: "flex",
                justifyContent: "space-between",
                columnGap: "15px",
                alignItems: "center",
                width: "100%",
                padding: "10px 0",
                cursor: "pointer",
                textDecoration: "none",
                color: "inherit",
              },
              onClick: () => setMaxSelected(true),
            },
            React.createElement(
              "span",
              {
                style: { display: "flex", alignItems: "center", gap: "10px" },
              },
              React.createElement("input", {
                type: "radio",
                name: "qty_option",
                value: `${quantityRange.max}+`,
                checked: maxSelected, // optional: to visually keep it selected
                onChange: () => setMaxSelected(true),
              }),
              React.createElement("span", null, `${quantityRange.max}+`)
            ),
            React.createElement(
              "span",
              { className: "step-contact" },
              "Contactez-nous"
            )
          )
        );
      }
    }

    const handleBackdropClick = (e) => {
      if (e.target.className === "popup-backdrop") {
        setMaxSelected(false);
      }
    };

    const handleCustomSubmit = () => {
      if (!firstName || !lastName || !email) {
        alert("Veuillez remplir tous les champs obligatoires marqués d’un *");
        return;
      }

      const formData = new FormData();
      formData.append("action", "request_custom_quote");
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("message", message);
      formData.append("attributes", JSON.stringify(selectedAttributes));
      formData.append("addons", JSON.stringify(selectedAddons));
      formData.append("quantity", `${quantityRange.max}+`);
      formData.append("pageUrl", window.location.href);
      formData.append("product_id", product_id);

      // Append uploaded files
      uploadedFiles.forEach((file, index) => {
        formData.append(`files[]`, file);
      });

      fetch(ajax_url, {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            window.location.href = "/custom-quote-thank-you";

            // const show = () =>
            //   elementorProFrontend.modules.popup.showPopup({ id: 9901 });

            // if (window.elementorProFrontend?.modules?.popup?.showPopup) {
            //   show();
            // } else {
            //   document.addEventListener("elementor/frontend/init", show, { once: true });
            // }

            // // Listen for popup close
            // jQuery(document).one('elementor/popup/hide', function(event, id) {
            //   if (id === 9901) {
            //     window.location.href = "/custom-quote-thank-you";
            //   }
            // });

            // setMaxSelected(false);
          } else {
            alert("Error: " + res.data);
          }
        })
        .catch((err) => {
          alert("Request failed.");
          setMaxSelected(false);
        });
    };

    return React.createElement(
      "div",
      { key: "quantity", className: stepClass },
      React.createElement("h3", null, ...headerChildren),
      isExpanded &&
        React.createElement(
          "div",
          { className: "kd-step-collapse" },
          radioContent,
          React.createElement(
            "div",
            {
              className: "range-wrapper",
              style: {
                position: "relative",
                paddingTop: "20px",
                marginTop: "15px",
              },
            },
            React.createElement(
              "h4",
              { className: "specific-qty-title" },
              "Ou choisissez une quantité spécifique"
            ),
            React.createElement(
              "div",
              {
                className: "tooltip",
                style: {
                  position: "absolute",
                  left: `calc(${percentFill}% )`,
                  transform: "translate(-50%, -120%)",
                  backgroundColor: "#2a3654",
                  color: "#fff",
                  padding: "4px 6px",
                  borderRadius: "3px",
                  fontSize: "12px",
                },
              },
              tempQuantity
            ),
            React.createElement("input", {
              type: "range",
              min,
              max,
              value: tempQuantity,
              onChange: (e) => setTempQuantity(parseInt(e.target.value)),
              style: {
                width: "100%",
                background: `linear-gradient(to right, #253461 0%, #253461 ${percentFill}%, #E3E3E3 ${percentFill}%, #E3E3E3 100%)`,
                appearance: "none",
                height: "3px",
                borderRadius: "3px",
                outline: "none",
                marginBottom: "5px",
              },
            }),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  marginTop: "0px",
                  color: "#2a3654",
                },
              },
              [...Array(11)].map((_, i) => {
                const tick = Math.round(min + ((max - min) / 10) * i);
                return React.createElement(
                  "span",
                  { key: i, className: "kd-qty-range-price-tooltip" },
                  tick
                );
              })
            )
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "8px" } },

            React.createElement("input", {
              type: "number",
              min,
              max,
              value: tempQuantity,
              onChange: (e) => setTempQuantity(parseInt(e.target.value)),
              style: {
                width: "140px",
                padding: "8px",
                borderRadius: "15px",
                textAlign: "center",
                fontFamily: "jost",
              },
            }),
            React.createElement(
              "button",
              {
                onClick: () =>
                  setTempQuantity((prev) => Math.min(max, prev + 1)),
                className: "kd-round-btn",
              },
              "+"
            ),
            React.createElement(
              "button",
              {
                onClick: () =>
                  setTempQuantity((prev) => Math.max(min, prev - 1)),
                className: "kd-round-btn",
              },
              "-"
            ),
            React.createElement(
              "button",
              {
                className: "kd-verify-qty-btn",
                style: { marginLeft: "auto" },
                onClick: handleVerify,
              },
              "Confirmer"
            )
          ),

          maxSelected &&
            React.createElement(
              "div",
              {
                className: "popup-backdrop",
                onClick: handleBackdropClick,
                style: {
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    backgroundColor: "white",
                    border: "1px solid #99cfff",
                    borderRadius: "0",
                    padding: "39px",
                    width: "100%",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  },
                  className: "kd-quantity-popup-inner",
                  onClick: (e) => e.stopPropagation(),
                },
                React.createElement("h4", null, "DEMANDE DE QUANTITÉ PERSONNALISÉE"),
                React.createElement(
                  "p",
                  null,
                  "Vous avez sélectionné une quantité supérieure au maximum standard. Veuillez nous contacter afin d’organiser une commande sur mesure ou recevoir un devis urgent."
                ),

                // First Name
                React.createElement(
                  "div",
                  { className: "kd-row" },
                  React.createElement(
                    "div",
                    { className: "kd-col-50" },
                    React.createElement(
                      "label",
                      {},
                      "Prénom ",
                      React.createElement(
                        "span",
                        { style: { color: "red" } },
                        "*"
                      )
                    ),
                    React.createElement("input", {
                      type: "text",
                      placeholder: "Prénom",
                      value: firstName,
                      onChange: (e) => setFirstName(e.target.value),
                      required: true,
                      style: {
                        width: "100%",
                        padding: "8px",
                        marginTop: "10px",
                      },
                    })
                  ),
                  // Last Name
                  React.createElement(
                    "div",
                    { className: "kd-col-50" },
                    React.createElement(
                      "label",
                      {},
                      "Nom ",
                      React.createElement(
                        "span",
                        { style: { color: "red" } },
                        "*"
                      )
                    ),
                    React.createElement("input", {
                      type: "text",
                      placeholder: "Nom",
                      value: lastName,
                      onChange: (e) => setLastName(e.target.value),
                      required: true,
                      style: {
                        width: "100%",
                        padding: "8px",
                        marginTop: "10px",
                      },
                    })
                  )
                ),

                // Email & Phone
                React.createElement(
                  "div",
                  { className: "kd-row" },
                  React.createElement(
                    "div",
                    { className: "kd-col-50" },
                    React.createElement(
                      "label",
                      {},
                      "E-mail ",
                      React.createElement(
                        "span",
                        { style: { color: "red" } },
                        "*"
                      )
                    ),
                    React.createElement("input", {
                      type: "email",
                      placeholder: "E-mail",
                      value: email,
                      onChange: (e) => setEmail(e.target.value),
                      required: true,
                      style: {
                        width: "100%",
                        padding: "8px",
                        marginTop: "10px",
                      },
                    })
                  ),
                  React.createElement(
                    "div",
                    { className: "kd-col-50" },
                    React.createElement("label", {}, "Numéro de téléphone"),
                    React.createElement("input", {
                      type: "tel",
                      placeholder: "Numéro de téléphone",
                      value: phone,
                      onChange: (e) => setPhone(e.target.value),
                      style: {
                        width: "100%",
                        padding: "8px",
                        marginTop: "10px",
                      },
                    })
                  )
                ),

                // Message
                React.createElement(
                  "div",
                  { className: "kd-row" },
                  React.createElement(
                    "div",
                    { className: "kd-col-100" },
                    React.createElement("label", {}, "Message"),
                    React.createElement("textarea", {
                      placeholder: "Votre message",
                      value: message,
                      onChange: (e) => setMessage(e.target.value),
                      style: {
                        width: "100%",
                        padding: "8px",
                        marginTop: "10px",
                        minHeight: "80px",
                      },
                    })
                  )
                ),

                // File Upload
                React.createElement(
                  "div",
                  { className: "kd-col-100", style: { marginTop: "15px" } },
                  React.createElement(
                    "label",
                    {},
                    "Joindre des fichiers (JPG, PNG, PDF — max. 10 fichiers, 20 Mo au total)"
                  ),
                  React.createElement("input", {
                    type: "file",
                    accept: ".jpg,.jpeg,.png,.pdf",
                    multiple: true,
                    onChange: handleFileChange,
                    style: { marginTop: "10px" },
                  }),
                  React.createElement(
                    "div",
                    {
                      id: "selected-files",
                      style: { fontSize: "13px", marginTop: "5px" },
                    },
                    uploadedFiles?.map((file, index) =>
                      React.createElement(
                        "div",
                        { key: index },
                        `✔ ${file.name}`
                      )
                    )
                  )
                ),

                // Buttons
                React.createElement(
                  "div",
                  { style: { marginTop: "20px" } },
                  React.createElement(
                    "button",
                    {
                      onClick: () => setMaxSelected(false),
                      style: {
                        marginRight: "10px",
                        padding: "6px 30px",
                        backgroundColor: "transparent",
                        color: "#10c99e",
                        border: "1px solid #10c99e",
                        borderRadius: "25px",
                        cursor: "pointer",
                      },
                    },
                    "Annuler"
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: handleCustomSubmit,
                      style: {
                        padding: "6px 30px",
                        backgroundColor: "#10c99e",
                        color: "white",
                        border: "none",
                        borderRadius: "25px",
                        cursor: "pointer",
                      },
                    },
                    "Envoyer"
                  )
                )
              )
            )
        )
    );
  }

  function renderSteps() {
    const attributeSteps = renderAttributeSteps();
    const addonSteps = addonsEnabled ? renderVisibleAddonSteps() : []; // Ensure addonSteps is always an array
    const quantityStepIndex = attributeSteps.length + addonSteps.length;
    const quantityStep = renderQuantityStep(quantityStepIndex);
    return [...attributeSteps, ...addonSteps, quantityStep];
  }

  const summaryReady = variationData && quantitySelected > 0;
  const finalSummary =
    summaryReady &&
    (() => {
      const addonExtraPerPiece = getAddonExtraPerPiece(
        selectedAddons,
        addons,
        quantitySelected
      );

      // console.clear();
      console.log(tax_percent);

      const taxPerc = tax_percent ? parseFloat(`1.${tax_percent}`) : 1.21;

      console.log(taxPerc);

      // NEW: Use interpolated price with addons if addons are selected
      const totalPerPiece =
        variationData.conditional_prices && variationData.conditional_prices.length > 0 && Object.keys(selectedAddons).length > 0
          ? getInterpolatedPriceWithAddons(variationData.conditional_prices, selectedAddons, addons, quantitySelected)
          : parseFloatSafe(variationData.price_num) + parseFloatSafe(addonExtraPerPiece);
      const totalExclVat = (totalPerPiece * quantitySelected).toFixed(2).replace('.', ',');
      const totalInclVat = (totalPerPiece * quantitySelected * taxPerc).toFixed(2).replace('.', ',');
      const lead_time = variationData.lead_time
        ? `${variationData.lead_time}`
        : `5 Semaines`;
      const totalStepNum =
        totalSteps > maxVisibleStep + 1 ? totalSteps : maxVisibleStep + 1;

      const pricePerPiece = totalPerPiece.toFixed(2).replace('.', ',');

      console.clear();
      console.log(variationData.price_num);
      console.log(addonExtraPerPiece);
      console.log(pricePerPiece);

      // const pricePerPiece = variationData.price_num.toFixed(2);
      // const totalExclVat = Number(
      //   variationData.price_num * quantitySelected
      // ).toFixed(2);
      // const totalInclVat = (
      //   variationData.price_num *
      //   quantitySelected *
      //   1.21
      // ).toFixed(2);
      const deliveryTime = `${estimated_delivery_date}`;

      return React.createElement(
        "div",
        { className: "variation-summary", style: {} },
        React.createElement(
          "h3",
          { className: "your-offer-title" },
          (() => {
            // 1) How many attribute steps are actually visible right now?
            let visibleAttrCount = 0;
            attributeKeys.forEach((attrKey, idx) => {
              const a = attributes[attrKey] || {};
              const enabled_if = a.enabled_if || "";
              const enabled_if_value = a.enabled_if_value || "";

              if (idx === 0 || !enabled_if || !enabled_if_value) {
                visibleAttrCount++;
              } else {
                const targetKey = attributeKeys.find((k) =>
                  k.endsWith(enabled_if)
                );
                const selectedVal = selectedAttributes[targetKey];
                if (selectedVal === enabled_if_value) visibleAttrCount++;
              }
            });

            // 2) Adjust for the hidden default attribute (your helper)
            const offset = getHiddenDefaultOffset(
              attributes,
              attributeKeys,
              defaultSelected
            );
            visibleAttrCount = Math.max(0, visibleAttrCount + offset); // offset is -1 or 0

            // 3) How many addon steps are visible?
            let visibleAddonCount = 0;
            addons
              .filter((a) => a.parent_id === 0)
              .forEach((parent) => {
                visibleAddonCount++;
                const child = addons.find(
                  (a) =>
                    a.parent_id === parent.id &&
                    selectedAddons[parent.id] === a.visible_if_option
                );
                if (child) {
                  visibleAddonCount++;
                  const grandchild = addons.find(
                    (a) =>
                      a.parent_id === child.id &&
                      selectedAddons[child.id] === a.visible_if_option
                  );
                  if (grandchild) visibleAddonCount++;
                }
              });

            // 4) Quantity comes after attributes+addons, summary is right after quantity
            const quantityStepIndex = visibleAttrCount + visibleAddonCount; // 0-based
            const summaryDisplayNum = Math.max(1, quantityStepIndex + 2); // 1-based & after quantity
            return `${summaryDisplayNum}. Votre offre`;
          })()
        ),
        React.createElement(
          "table",
          {
            style: { width: "100%", fontSize: "14px" },
            className: "offer-table",
          },
          React.createElement(
            "tbody",
            null,
            React.createElement(
              "tr",
              null,
              React.createElement("td", null, "Envoi France ou Belgique"),
              React.createElement("td", { style: { color: "#10A380" } }, "Gratuit")
            ),
            React.createElement(
              "tr",
              null,
              React.createElement("td", null, "Frais de démarrage"),
              React.createElement("td", { style: { color: "#10A380" } }, "Gratuit")
            ),
            React.createElement(
              "tr",
              null,
              React.createElement("td", null, "Prix HT par pièce"),
              React.createElement(
                "td",
                { style: { fontWeight: "bold" } },
               `${currency_symbol}${pricePerPiece}`
              )
            ),
            React.createElement(
              "tr",
              null,
              React.createElement("td", null, "Total (HT)"),
              React.createElement(
                "td",
                { style: { fontWeight: "bold" } },
                `${currency_symbol}${totalExclVat}`
              )
            ),
            React.createElement(
              "tr",
              null,
              React.createElement("td", null, "Total (TTC)"),
              React.createElement(
                "td",
                null,
                `${currency_symbol}${totalInclVat}`
              )
            ),
            React.createElement(
              "tr",
              null,
              React.createElement(
                "td",
                { style: { position: "relative" } },
                "Délai de livraison",
                React.createElement(
                  "span",
                  {
                    onMouseEnter: () => setShowTooltip(true),
                    onMouseLeave: () => setShowTooltip(false),
                    className: "kd-delivery-tooltip",
                  },
                  "?"
                ),
                showTooltip &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        bottom: "120%",
                        left: "100px",
                        background: "#333",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        lineHeight: "20px",
                        zIndex: 1000,
                      },
                      className: "kd-product-tooltip",
                    },
                    "Les délais indiqués sur notre site sont donnés à titre indicatif. Si vous avez besoin d’une livraison pour une date précise, veuillez nous contacter avant de passer commande afin de vérifier si nous pouvons respecter votre délai."
                  )
              ),
              React.createElement(
                "td",
                null,
                `${deliveryTime} `,
                React.createElement("div", {}, `${lead_time}`),
                React.createElement(
                  "a",
                  {
                    href: "#",
                    onClick: (e) => {
                      e.preventDefault();
                      setShowUrgentPopup(true);
                    },
                    style: {
                      marginLeft: 4,
                      color: "#00aeef",
                      textDecoration: "underline",
                    },
                  },
                  "J'ai besoin d'une livraison urgente"
                )
              )
            )
          )
        ),
        showUrgentPopup &&
          React.createElement(
            "div",
            {
              className: "urgent-popup",
              style: {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  backgroundColor: "#fff",
                  padding: "20px",
                  borderRadius: "8px",
                  minWidth: "300px",
                  width: "640px",
                  position: "relative",
                },
              },
              React.createElement(
                "span",
                {
                  className: "closeUrgentPopup",
                  onClick: (e) => {
                    setShowUrgentPopup(false);
                  },
                },
                "x"
              ),
              React.createElement("h3", null, "DEMANDE DE LIVRAISON URGENTE"),
              React.createElement(
                "p",
                null,
                "Veuillez sélectionner la date de livraison souhaitée et nous reviendrons vers vous."
              ),
              React.createElement(
                "ul",
                null,
                // Show product attributes
                ...Object.entries(selectedAttributes)
                .filter(([key, value]) => value.toLowerCase() !== "default")
                .map(([key, value]) =>
                  React.createElement(
                    "li",
                    {
                      key: `attr-${key}`,
                      style: { textTransform: "capitalize" },
                    },
                    `${key.replace(/^pa_/, "")}: ${value}`
                  )
                ),

                // Show selected addons
                ...Object.entries(selectedAddons).map(([addonId, selected]) => {
                  const addon = addons.find((a) => a.id == addonId);
                  const name = addon?.name || `Addon #${addonId}`;
                  const value = Array.isArray(selected)
                    ? selected.join(", ")
                    : selected;
                  return React.createElement(
                    "li",
                    { key: `addon-${addonId}` },
                    `${name}: ${value}`
                  );
                }),

                // Show quantity
                React.createElement(
                  "li",
                  { key: "qty" },
                  `Quantité: ${quantitySelected}`
                ),

                // Show price per piece
                React.createElement(
                  "li",
                  { key: "price" },
                  `Prix par pièce: ${currency_symbol}${pricePerPiece}`
                )
              ),
              React.createElement(
                "div",
                { className: "kd-row" },
                React.createElement(
                  "div",
                  { className: "kd-col-50" },
                  React.createElement(
                    "label",
                    {},
                    "Date",
                    React.createElement(
                      "span",
                      { style: { color: "red" } },
                      " *"
                    )
                  ),
                  React.createElement("input", {
                    type: "date",
                    value: urgentDate,
                    onChange: (e) => setUrgentDate(e.target.value),
                    required: true,
                    style: { marginTop: "10px", padding: "5px", width: "100%" },
                  })
                ),
                React.createElement(
                  "div",
                  { className: "kd-col-50" },
                  React.createElement(
                    "label",
                    {},
                    "Nom",
                    React.createElement(
                      "span",
                      { style: { color: "red" } },
                      " *"
                    )
                  ),
                  React.createElement("input", {
                    type: "text",
                    value: urgentName,
                    onChange: (e) => setUrgentName(e.target.value),
                    placeholder: "Nom",
                    required: true,
                    style: { marginTop: "10px", padding: "5px", width: "100%" },
                  })
                )
              ),
              React.createElement(
                "div",
                { className: "kd-row" },
                React.createElement(
                  "div",
                  { className: "kd-col-50" },
                  React.createElement("label", {}, "Numéro de téléphone"),
                  React.createElement("input", {
                    type: "tel",
                    value: urgentTel,
                    onChange: (e) => setUrgentTel(e.target.value),
                    placeholder: "Numéro de téléphone",
                    style: { marginTop: "10px", padding: "5px", width: "100%" },
                  })
                ),
                React.createElement(
                  "div",
                  { className: "kd-col-50" },
                  React.createElement(
                    "label",
                    {},
                    "Email",
                    React.createElement(
                      "span",
                      { style: { color: "red" } },
                      " *"
                    )
                  ),
                  React.createElement("input", {
                    type: "email",
                    value: urgentEmail,
                    onChange: (e) => setUrgentEmail(e.target.value),
                    placeholder: "Email address",
                    required: true,
                    style: { marginTop: "10px", padding: "5px", width: "100%" },
                  })
                )
              ),
              React.createElement(
                "div",
                { className: "kd-row" },
                React.createElement(
                  "div",
                  { className: "kd-col-100" },
                  React.createElement("label", {}, "Message"),
                  React.createElement("textarea", {
                    value: urgentMessage,
                    onChange: (e) => setUrgentMessage(e.target.value),
                    placeholder: "Votre message",
                    style: {
                      marginTop: "10px",
                      padding: "5px",
                      width: "100%",
                      minHeight: "80px",
                      resize: "vertical",
                    },
                  })
                )
              ),
              React.createElement(
                "div",
                { className: "kd-col-100", style: { marginTop: "15px" } },
                React.createElement(
                  "label",
                  {},
                  "Joindre des fichiers (max. 10, 20 Mo au total)"
                ),
                React.createElement("br", {}),
                React.createElement("input", {
                  type: "file",
                  accept: ".jpg,.jpeg,.png,.pdf",
                  multiple: true,
                  onChange: handleUrgentFileChange,
                  style: { marginTop: "10px" },
                }),
                React.createElement(
                  "div",
                  {
                    id: "urgent-selected-files",
                    style: { fontSize: "13px", marginTop: "5px" },
                  },
                  urgentFiles?.map((file, index) =>
                    React.createElement("div", { key: index }, `✔ ${file.name}`)
                  )
                )
              ),
              React.createElement(
                "div",
                { style: { marginTop: "15px", textAlign: "right" } },
                React.createElement(
                  "button",
                  {
                    onClick: () => setShowUrgentPopup(false),
                    style: {
                      marginRight: "10px",
                      borderColor: "#10c99e",
                      borderRadius: "25px",
                      color: "#10c99e",
                      padding: "6px 30px",
                    },
                  },
                  "Annuler"
                ),
                React.createElement(
                  "button",
                  {
                    onClick: () => {
                      // Validate required fields
                      if (!urgentDate || !urgentDate.trim()) {
                        alert("Veuillez sélectionner une date de livraison.");
                        return;
                      }
                      if (!urgentName || !urgentName.trim()) {
                        alert("Veuillez entrer votre nom.");
                        return;
                      }
                      if (!urgentEmail || !urgentEmail.trim()) {
                        alert("Veuillez entrer votre adresse email.");
                        return;
                      }
                      // Basic email format validation
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(urgentEmail.trim())) {
                        alert("Veuillez entrer une adresse email valide.");
                        return;
                      }

                      const formData = new FormData();

                      formData.append("action", "send_urgent_quote");
                      formData.append("product_id", product_id);
                      formData.append(
                        "variation_id",
                        variationData?.variation_id || 0
                      );
                      formData.append(
                        "attributes",
                        JSON.stringify(selectedAttributes)
                      );
                      formData.append("addons", JSON.stringify(selectedAddons));
                      formData.append("quantity", quantitySelected);
                      formData.append("price_per_piece", pricePerPiece);
                      formData.append("delivery_date", urgentDate);
                      formData.append("email_address", urgentEmail);
                      formData.append("name", urgentName);
                      formData.append("phone_number", urgentTel);
                      formData.append("nonce", nonce);

                      // 🔽 Append uploaded files
                      urgentFiles.forEach((file, i) => {
                        formData.append(`files[]`, file);
                      });

                      // Set loading state
                      setUrgentSubmitting(true);

                      fetch(ajax_url, {
                        method: "POST",
                        body: formData, // No Content-Type header here, browser sets it for FormData
                      })
                        .then((res) => res.json())
                        .then((res) => {
                          if (res.success) {
                            // alert(
                            //   "Your urgent delivery request has been submitted."
                            // );

                            const show = () =>
                              elementorProFrontend.modules.popup.showPopup({
                                id: 9901,
                              });
                            if (
                              window.elementorProFrontend?.modules?.popup
                                ?.showPopup
                            ) {
                              show();
                            } else {
                              document.addEventListener(
                                "elementor/frontend/init",
                                show,
                                { once: true }
                              );
                            }
                          } else {
                            alert("There was an error: " + res.data);
                          }
                          setUrgentSubmitting(false);
                          setShowUrgentPopup(false);
                        })
                        .catch((err) => {
                          console.error("Urgent request failed:", err);
                          setUrgentSubmitting(false);
                          setShowUrgentPopup(false);
                        });
                    },
                    disabled: urgentSubmitting,
                    style: {
                      backgroundColor: urgentSubmitting ? "#ccc" : "#10c99e",
                      borderRadius: "25px",
                      color: "white",
                      padding: "6px 30px",
                      borderRadius: "25px",
                      border: "none",
                      cursor: urgentSubmitting ? "not-allowed" : "pointer",
                    },
                  },
                  urgentSubmitting ? "Chargement..." : "Envoyer"
                )
              )
            )
          )
      );
    })();

  return React.createElement(
    "div",
    { className: "pearl-wc-steps" },
    React.createElement(
      "div",
      { className: "pearl-step-indicator" },
      React.createElement(
        "h2",
        null,
        `Créez votre produit — étape ${
          defaultSelected ? maxVisibleStep : maxVisibleStep + 1
        } de ${
          defaultSelected
            ? totalSteps >= maxVisibleStep
              ? totalSteps > 1
                ? totalSteps + 1
                : totalSteps
              : maxVisibleStep
            : totalSteps >= maxVisibleStep + 1
            ? totalSteps + 1
            : maxVisibleStep + 1
        }${loading ? " (Chargement…)" : ""}`
      ),
      React.createElement(
        "div",
        { className: "pearl-moq" },
        "A partir de ",
        React.createElement("b", null, `${minimum_quantity} PCS`)
      )
    ),

    ...renderSteps(),
    finalSummary,
    // =================================please check this code to see new error handling =========================
    React.createElement(
      "div",
      { className: "kd-actions-wrapper" },

      
      React.createElement(
        "div",
        { className: "kd-action-btns-wrapper", style: { marginTop: 20 } },

        React.createElement(
          "div",
          { className: "kd-single-action-btn" },
          React.createElement(
            "button",
            {
              onClick: () =>
                getAQuote(
                  variationData.variation_id,
                  variationData.price_num,
                  quantitySelected,
                  "quote_btn"
                ),
              disabled: !summaryReady || loading,
            },
            cart_has_items ? "AJOUTER AU DEVIS" : "CRÉEZ VOTRE DEVIS"
          ),
          React.createElement("small", null, "Nous vous enverrons un PDF")
        ),

        React.createElement(
          "div",
          { className: "kd-single-action-btn" },
          React.createElement(
            "button",
            {
              onClick: () =>
                getAQuote(
                  variationData.variation_id,
                  variationData.price_num,
                  quantitySelected,
                  "cart_btn"
                ),
              disabled: !summaryReady || loading,
            },
            "Ajouter au panier"
          ),
          React.createElement(
            "small",
            null,
            "Lorsque vous êtes prêt à commander"
          )
        )
      ),

      // ✅ only render when there is an error
      addtoCartErr &&
        React.createElement(
          "div",
          { className: "error-wrapper" },
          String(addtoCartErr)
        )
    )

        // =================================please check this code to see new error handling =========================
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("pearl-wc-steps-form");
  if (container && window.React && window.ReactDOM && window.pearlWCData) {
    ReactDOM.render(
      React.createElement(StepsForm, { ...pearlWCData }),
      container
    );
  }
});
