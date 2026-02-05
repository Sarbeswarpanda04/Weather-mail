document.addEventListener("DOMContentLoaded", () => {
    const typedHeadlineEl = document.getElementById("typed-headline");
    const cursorEl = document.querySelector(".cursor");
    const headlineText = "Get today’s weather in your inbox. Every morning.";
    const typingDelay = 55;
    let charIndex = 0;

    // Typing animation for hero headline
    const typeNextChar = () => {
        if (!typedHeadlineEl) return;
        if (charIndex < headlineText.length) {
            typedHeadlineEl.textContent += headlineText.charAt(charIndex);
            charIndex += 1;
            window.setTimeout(typeNextChar, typingDelay);
        } else if (cursorEl) {
            cursorEl.classList.add("done");
        }
    };

    window.setTimeout(typeNextChar, 600);

    // Scroll animation for reveal elements
    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                const { target, isIntersecting } = entry;
                if (!isIntersecting) return;
                const delay = Number(target.getAttribute("data-delay")) || 0;
                window.setTimeout(() => target.classList.add("visible"), delay);
                observer.unobserve(target);
            });
        },
        { threshold: 0.2 }
    );

    revealEls.forEach(el => observer.observe(el));

    // Smooth scroll for CTA buttons
    const subscribeBtn = document.getElementById("scroll-subscribe");
    const navCta = document.querySelector(".nav-cta");
    const subscribeSection = document.getElementById("subscribe");

    const scrollToSubscribe = () => {
        if (!subscribeSection) return;
        subscribeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    if (subscribeBtn) subscribeBtn.addEventListener("click", scrollToSubscribe);
    if (navCta) navCta.addEventListener("click", scrollToSubscribe);

    // Modal handling for sample email preview
    const modal = document.getElementById("sample-modal");
    const openModalBtn = document.getElementById("open-sample");
    const samplePreviewEl = document.querySelector(".sample-preview");
    const sampleLoadingEl = document.querySelector(".sample-loading");
    const sampleErrorEl = document.querySelector(".sample-error");
    const sampleToggleButtons = document.querySelectorAll(".sample-toggle__btn");
    const sampleCache = {};
    let activeTemplate = "daily-weather";

    const renderSampleEmail = (html) => {
        if (!samplePreviewEl) return;
        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Sample Weather Email");
        iframe.setAttribute("loading", "lazy");
        iframe.srcdoc = html;
        samplePreviewEl.innerHTML = "";
        samplePreviewEl.appendChild(iframe);
        samplePreviewEl.removeAttribute("hidden");
    };

    const updateToggleButtons = (template) => {
        sampleToggleButtons.forEach((button) => {
            const isActive = button.dataset.template === template;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
            button.setAttribute("tabindex", isActive ? "0" : "-1");
        });
    };
    
    if (sampleToggleButtons.length > 0) {
        updateToggleButtons(activeTemplate);
    }

    const fetchSampleEmail = (template) => {
        if (!sampleLoadingEl) return;

        sampleLoadingEl.removeAttribute("hidden");
        const loadingMessage = sampleLoadingEl.querySelector("p");
        if (loadingMessage) {
            const label = template === "welcome" ? "welcome" : "daily";
            loadingMessage.textContent = `Loading the ${label} email preview…`;
        }
        sampleErrorEl?.setAttribute("hidden", "true");
        samplePreviewEl?.setAttribute("hidden", "true");

        if (sampleCache[template]) {
            renderSampleEmail(sampleCache[template]);
            sampleLoadingEl.setAttribute("hidden", "true");
            return;
        }

        fetch(`/api/email/sample?template=${template}`)
            .then((response) => {
                if (!response.ok) throw new Error("Failed to load sample");
                return response.json();
            })
            .then((payload) => {
                const html = payload?.html;
                if (!html) throw new Error("Empty payload");
                sampleCache[template] = html;
                renderSampleEmail(html);
            })
            .catch(() => {
                sampleErrorEl?.removeAttribute("hidden");
            })
            .finally(() => {
                sampleLoadingEl?.setAttribute("hidden", "true");
            });
    };

    sampleToggleButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedTemplate = button.dataset.template;
            if (!selectedTemplate || selectedTemplate === activeTemplate) return;
            activeTemplate = selectedTemplate;
            updateToggleButtons(activeTemplate);
            fetchSampleEmail(activeTemplate);
        });
    });

    const toggleModal = (open) => {
        if (!modal) return;
        if (open) {
            modal.removeAttribute("hidden");
            document.body.style.overflow = "hidden";
            updateToggleButtons(activeTemplate);
            fetchSampleEmail(activeTemplate);
        } else {
            modal.setAttribute("hidden", "true");
            document.body.style.overflow = "";
        }
    };

    if (openModalBtn) {
        openModalBtn.addEventListener("click", () => {
            toggleModal(true);
        });
    }

    modal?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.close === "true") toggleModal(false);
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal?.hasAttribute("hidden")) {
            toggleModal(false);
        }
    });

    // Subscription form handling (frontend simulation)
    const subscribeForm = document.getElementById("subscribe-form");
    const submitButton = subscribeForm?.querySelector("button[type='submit']");
    const formFeedback = document.getElementById("form-feedback");
    const cityInput = document.getElementById("city-input");
    const emailInput = document.getElementById("email-input");
    const citySuggestions = document.getElementById("city-suggestions");
    const hints = {
        city: document.getElementById("city-hint"),
        email: document.getElementById("email-hint"),
    };
    let suggestionDebounce;
    let activeSuggestionIndex = -1;
    let currentSuggestions = [];
    let suggestionsController;

    const clearSuggestions = () => {
        if (!citySuggestions) return;
        citySuggestions.innerHTML = "";
        citySuggestions.setAttribute("hidden", "true");
        activeSuggestionIndex = -1;
        currentSuggestions = [];
        cityInput?.setAttribute("aria-expanded", "false");
        if (cityInput) {
            cityInput.removeAttribute("aria-activedescendant");
        }
    };

    const renderSuggestions = (items) => {
        if (!citySuggestions) return;
        if (!items || items.length === 0) {
            clearSuggestions();
            return;
        }

        citySuggestions.innerHTML = "";
        items.forEach((label, index) => {
            const li = document.createElement("li");
            li.textContent = label;
            li.className = "suggestion-item";
            li.id = `city-option-${index}`;
            li.setAttribute("role", "option");
            li.addEventListener("mousedown", (event) => {
                event.preventDefault();
                if (!cityInput) return;
                cityInput.value = label;
                clearSuggestions();
            });
            citySuggestions.appendChild(li);
        });

        citySuggestions.removeAttribute("hidden");
        currentSuggestions = items;
        cityInput?.setAttribute("aria-expanded", "true");
    };

    const highlightSuggestion = (index) => {
        if (!citySuggestions) return;
        const items = citySuggestions.querySelectorAll(".suggestion-item");
        items.forEach((item, itemIndex) => {
            const isActive = itemIndex === index;
            item.classList.toggle("active", isActive);
            item.setAttribute("aria-selected", String(isActive));
            if (isActive) {
                item.scrollIntoView({ block: "nearest" });
            }
        });
        activeSuggestionIndex = index;
        if (cityInput) {
            const activeId = index >= 0 ? `city-option-${index}` : "";
            if (activeId) {
                cityInput.setAttribute("aria-activedescendant", activeId);
            } else {
                cityInput.removeAttribute("aria-activedescendant");
            }
        }
    };

    const fetchSuggestions = (query) => {
        if (!query || query.length < 2) {
            clearSuggestions();
            return;
        }

        if (suggestionsController) {
            suggestionsController.abort();
        }

        suggestionsController = new AbortController();
        const { signal } = suggestionsController;

        fetch(`/api/cities?q=${encodeURIComponent(query)}`, { signal })
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch suggestions");
                return response.json();
            })
            .then((payload) => {
                renderSuggestions(payload?.suggestions ?? []);
            })
            .catch((error) => {
                if (error.name === "AbortError") return;
                clearSuggestions();
            });
    };

    const setButtonLoading = (state) => {
        if (!submitButton) return;
        submitButton.classList.toggle("button-loading", state);
        submitButton.disabled = state;
        submitButton.setAttribute("aria-busy", String(state));
    };

    const showFeedback = (message, isError = false) => {
        if (!formFeedback) return;
        formFeedback.textContent = message;
        formFeedback.classList.toggle("error", isError);
    };

    const validateEmail = (value) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    };

    subscribeForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        showFeedback("");

        const cityValue = cityInput?.value.trim();
        const emailValue = emailInput?.value.trim();

        let hasError = false;

        if (!cityValue) {
            if (hints.city) {
                hints.city.classList.add("error-hint");
                hints.city.textContent = "Please add a city so we know where to check the weather.";
            }
            hasError = true;
        } else {
            if (hints.city) {
                hints.city.classList.remove("error-hint");
                hints.city.textContent = "Start typing to search for your city.";
            }
        }

        if (!emailValue || !validateEmail(emailValue)) {
            if (hints.email) {
                hints.email.classList.add("error-hint");
                hints.email.textContent = "We need a valid email to send your forecast.";
            }
            hasError = true;
        } else {
            if (hints.email) {
                hints.email.classList.remove("error-hint");
                hints.email.textContent = "We send one email per day. That's it.";
            }
        }

        if (hasError) {
            showFeedback("Double-check the fields highlighted in red.", true);
            return;
        }

        setButtonLoading(true);

        fetch("/api/subscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                city: cityValue,
                email: emailValue,
            }),
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const message = payload?.message ?? "We couldn't save your subscription. Please try again.";
                    throw new Error(message);
                }

                hints.city?.classList.remove("error-hint");
                hints.email?.classList.remove("error-hint");
                if (hints.city) {
                    hints.city.textContent = "Start typing to search for your city.";
                }
                if (hints.email) {
                    hints.email.textContent = "We send one email per day. That's it.";
                }

                if (typeof subscribeForm.reset === "function") {
                    subscribeForm.reset();
                }
                showFeedback(payload?.message ?? "Subscription saved. Check your inbox tomorrow morning.");
            })
            .catch((error) => {
                showFeedback(error.message || "Something went wrong. Try again shortly.", true);
            })
            .finally(() => {
                setButtonLoading(false);
            });
    });

    // Live hint state reset when inputs change
    const removeErrorHint = (input, hintKey) => {
        input.addEventListener("input", () => {
            const hintEl = hints[hintKey];
            if (!hintEl) return;
            hintEl.classList.remove("error-hint");
            if (hintKey === "city") {
                hintEl.textContent = "Start typing to search for your city.";
            } else if (hintKey === "email") {
                hintEl.textContent = "We send one email per day. That's it.";
            }
        });
    };

    if (cityInput) removeErrorHint(cityInput, "city");
    if (emailInput) removeErrorHint(emailInput, "email");

    cityInput?.setAttribute("role", "combobox");
    cityInput?.setAttribute("aria-autocomplete", "list");
    cityInput?.setAttribute("aria-expanded", "false");
    if (citySuggestions) {
        cityInput?.setAttribute("aria-controls", citySuggestions.id);
    }

    cityInput?.addEventListener("input", () => {
        if (!cityInput) return;
        const value = cityInput.value;
        window.clearTimeout(suggestionDebounce);
        suggestionDebounce = window.setTimeout(() => fetchSuggestions(value), 180);
    });

    cityInput?.addEventListener("keydown", (event) => {
        if (!citySuggestions || citySuggestions.hasAttribute("hidden")) {
            return;
        }

        const items = citySuggestions.querySelectorAll(".suggestion-item");
        if (items.length === 0) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            const nextIndex = activeSuggestionIndex + 1 >= items.length ? 0 : activeSuggestionIndex + 1;
            highlightSuggestion(nextIndex);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            const prevIndex = activeSuggestionIndex - 1 < 0 ? items.length - 1 : activeSuggestionIndex - 1;
            highlightSuggestion(prevIndex);
        } else if (event.key === "Enter") {
            if (activeSuggestionIndex >= 0) {
                event.preventDefault();
                const selected = currentSuggestions[activeSuggestionIndex];
                if (selected && cityInput) {
                    cityInput.value = selected;
                }
                clearSuggestions();
            }
        } else if (event.key === "Escape") {
            clearSuggestions();
        }
    });

    document.addEventListener("click", (event) => {
        if (!citySuggestions || !cityInput) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (target === cityInput || citySuggestions.contains(target)) {
            return;
        }
        clearSuggestions();
    });

    // Current year in footer
    const yearEl = document.getElementById("current-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
});
