const country = document.getElementById("country");
const university = document.getElementById("university");
const countryStatus = document.getElementById("countryStatus");
const universityStatus = document.getElementById("universityStatus");
const form = document.getElementById("form");
const msg = document.getElementById("msg");

const COUNTRIES_API = "https://countriesnow.space/api/v0.1/countries/iso";
const HIPO_API = "https://universities.hipolabs.com/search?country=";

// Fallback très robuste : fichier JSON maintenu par le projet Hipo sur GitHub.
// Il est chargé en HTTPS puis filtré localement par pays.
const HIPO_JSON = "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";

let universityCatalog = null;

document.addEventListener("DOMContentLoaded", loadCountries);

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "Accept": "application/json", ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadCountries() {
  country.innerHTML = '<option value="">Chargement des pays...</option>';
  country.disabled = true;
  countryStatus.textContent = "Connexion à l'API des pays...";

  try {
    const data = await fetchJson(COUNTRIES_API);
    const list = (data.data || []).sort((a,b) => a.name.localeCompare(b.name, "fr"));

    country.innerHTML = '<option value="">Sélectionner un pays</option>';
    list.forEach(c => {
      const option = document.createElement("option");
      option.value = c.name;
      option.textContent = c.name;
      country.appendChild(option);
    });

    country.disabled = false;
    countryStatus.textContent = `${list.length} pays chargés.`;
  } catch (error) {
    // Fallback local léger pour ne jamais bloquer complètement le formulaire.
    const fallbackCountries = [
      "Burundi","Rwanda","République démocratique du Congo","Tanzanie","Kenya",
      "Ouganda","Afrique du Sud","Algérie","Allemagne","Australie","Belgique",
      "Brésil","Canada","Chine","Espagne","États-Unis","France","Inde",
      "Italie","Japon","Maroc","Nigeria","Pays-Bas","Portugal","Royaume-Uni",
      "Suisse","Turquie"
    ];

    country.innerHTML = '<option value="">Sélectionner un pays</option>';
    fallbackCountries.sort((a,b)=>a.localeCompare(b,"fr")).forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      country.appendChild(option);
    });

    country.disabled = false;
    countryStatus.textContent = "Liste de secours utilisée. L'API pays est momentanément indisponible.";
    console.warn("API pays indisponible :", error);
  }
}

country.addEventListener("change", async () => {
  const selected = country.value;

  university.innerHTML = '<option value="">Chargement...</option>';
  university.disabled = true;

  if (!selected) {
    university.innerHTML = '<option value="">Choisissez d’abord un pays</option>';
    universityStatus.textContent = "";
    return;
  }

  await loadUniversities(selected);
});

async function loadUniversities(selectedCountry) {
  universityStatus.textContent = `Recherche des universités en ${selectedCountry}...`;

  // 1) API Hipo HTTPS
  try {
    const data = await fetchJson(HIPO_API + encodeURIComponent(selectedCountry));

    if (Array.isArray(data) && data.length) {
      renderUniversities(data);
      universityStatus.textContent = `${data.length} université(s) trouvée(s).`;
      return;
    }
  } catch (error) {
    console.warn("API Hipo indisponible :", error);
  }

  // 2) Fallback GitHub JSON : même dataset, téléchargé en HTTPS
  try {
    if (!universityCatalog) {
      universityCatalog = await fetchJson(HIPO_JSON);
    }

    const normalized = normalizeCountry(selectedCountry);

    const results = universityCatalog.filter(item =>
      normalizeCountry(item.country || "") === normalized
    );

    if (results.length) {
      renderUniversities(results);
      universityStatus.textContent =
        `${results.length} université(s) trouvée(s) via la source de secours.`;
      return;
    }

    // Correspondance par code ISO lorsque disponible
    const code = await findCountryCode(selectedCountry);
    if (code) {
      const isoResults = universityCatalog.filter(item =>
        String(item.alpha_two_code || "").toUpperCase() === code
      );
      if (isoResults.length) {
        renderUniversities(isoResults);
        universityStatus.textContent =
          `${isoResults.length} université(s) trouvée(s) via le code pays.`;
        return;
      }
    }

    throw new Error("Aucune université dans le catalogue");
  } catch (error) {
    console.error("Source universitaire de secours indisponible :", error);

    university.innerHTML = '<option value="">Aucune université trouvée</option>';
    universityStatus.textContent =
      "Impossible de charger les universités pour le moment. Vérifiez Internet puis réessayez.";
  }
}

async function findCountryCode(name) {
  try {
    const data = await fetchJson(COUNTRIES_API);
    const item = (data.data || []).find(c => c.name === name);
    return item?.Iso2?.toUpperCase() || "";
  } catch {
    return "";
  }
}

function normalizeCountry(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace("turkiye", "turkey")
    .replace("türkiye", "turkey")
    .replace("republic of the congo", "congo")
    .replace("democratic republic of the congo", "democratic republic of congo");
}

function renderUniversities(data) {
  const seen = new Set();

  university.innerHTML = '<option value="">Sélectionner une université</option>';

  data
    .filter(item => item && item.name)
    .sort((a,b) => a.name.localeCompare(b.name, "fr"))
    .forEach(item => {
      const key = item.name.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = item.name;

      const website =
        item.web_pages?.[0] ||
        item.web_page ||
        "";

      option.dataset.website = website;
      university.appendChild(option);
    });

  university.disabled = seen.size === 0;
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    msg.textContent = "";

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (!GOOGLE_SHEETS_WEB_APP_URL) {
        msg.textContent =
            "L'URL Google Sheets n'est pas configurée dans config.js.";
        return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    data.consentement = "Oui";

    data.reference =
        "CAND-" +
        new Date().getFullYear() +
        "-" +
        Math.random().toString(36).substring(2, 7).toUpperCase();

    data.universite_site =
        university.selectedOptions[0]?.dataset.website || "";

    data.date_envoi = new Date().toISOString();

    // Création d'un formulaire invisible
    const sendForm = document.createElement("form");

    sendForm.method = "POST";
    sendForm.action = GOOGLE_SHEETS_WEB_APP_URL;
    sendForm.target = "googleSheetsFrame";
    sendForm.style.display = "none";

    // Le script Apps Script attend "payload"
    const payload = document.createElement("input");
    payload.type = "hidden";
    payload.name = "payload";
    payload.value = JSON.stringify(data);

    sendForm.appendChild(payload);
    document.body.appendChild(sendForm);

    const button = document.getElementById("submit");
    button.disabled = true;
    button.textContent = "Envoi...";

    sendForm.submit();

    // On affiche la confirmation après l'envoi
    setTimeout(() => {
        document.getElementById("ref").textContent =
            data.reference;

        form.classList.add("hidden");
        document.getElementById("success").classList.remove("hidden");

        button.disabled = false;
        button.textContent = "Envoyer ma candidature";

        sendForm.remove();
    }, 2000);
});
