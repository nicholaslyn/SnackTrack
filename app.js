// Meal Planner — vanilla JS, localStorage only
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const LS_RECIPES = "mp_recipes_v1";
const LS_PLAN = "mp_plan_v1";

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const meals = ["Breakfast","Lunch","Dinner"];

// Elements
const rForm = $("#recipeForm");
const rName = $("#rName");
const rIngs = $("#rIngs");
const seedBtn = $("#seedBtn");
const recipeList = $("#recipeList");
const recipeSearch = $("#recipeSearch");
const clearRecipesBtn = $("#clearRecipes");

const daySel = $("#daySel");
const mealSel = $("#mealSel");
const recipeSel = $("#recipeSel");
const assignBtn = $("#assignBtn");
const clearPlanBtn = $("#clearPlan");
const planBody = $("#planBody");

const groceryList = $("#groceryList");
const copyListBtn = $("#copyList");
const downloadListBtn = $("#downloadList");
const exportDataBtn = $("#exportData");
const yearEl = $("#year");

// State
let recipes = load(LS_RECIPES) ?? [];
let plan = load(LS_PLAN) ?? makeEmptyPlan();

// Init
if (yearEl) yearEl.textContent = new Date().getFullYear();
initSelectors();
renderRecipes();
renderPlanner();
renderGrocery();

rForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = (rName.value || "").trim();
  const lines = (rIngs.value || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!name || !lines.length) return;
  const rec = { id: crypto.randomUUID(), name, ingredients: lines };
  recipes.push(rec);
  save(LS_RECIPES, recipes);
  rForm.reset();
  renderRecipes();
  refreshRecipeSelect();
});

seedBtn.addEventListener("click", () => {
  const samples = [
    { name: "Chicken Stir-Fry", ingredients: ["2 chicken breasts","1 bell pepper","1 onion","soy sauce","garlic","rice"] },
    { name: "Veggie Pasta", ingredients: ["200g pasta","1 zucchini","1 cup cherry tomatoes","olive oil","basil","parmesan"] },
    { name: "Oatmeal + Fruit", ingredients: ["1 cup oats","milk or water","banana","honey","cinnamon"] },
    { name: "Tuna Sandwich", ingredients: ["bread","1 can tuna","mayo","lettuce","tomato"] },
    { name: "Taco Night", ingredients: ["tortillas","ground beef","taco seasoning","lettuce","tomato","cheddar","salsa"] },
  ];
  const existingNames = new Set(recipes.map(r => r.name.toLowerCase()));
  samples.forEach(s => {
    if (!existingNames.has(s.name.toLowerCase())) {
      recipes.push({ id: crypto.randomUUID(), ...s });
    }
  });
  save(LS_RECIPES, recipes);
  renderRecipes();
  refreshRecipeSelect();
});

recipeSearch.addEventListener("input", renderRecipes);

clearRecipesBtn.addEventListener("click", () => {
  if (!confirm("Delete ALL recipes?")) return;
  recipes = [];
  save(LS_RECIPES, recipes);
  renderRecipes();
  refreshRecipeSelect();
});

assignBtn.addEventListener("click", () => {
  const day = daySel.value;
  const meal = mealSel.value;
  const recId = recipeSel.value;
  if (!recId) return alert("Add or select a recipe first.");
  plan[day][meal] = recId;
  save(LS_PLAN, plan);
  renderPlanner();
  renderGrocery();
});

clearPlanBtn.addEventListener("click", () => {
  if (!confirm("Clear the whole week?")) return;
  plan = makeEmptyPlan();
  save(LS_PLAN, plan);
  renderPlanner();
  renderGrocery();
});

copyListBtn.addEventListener("click", async () => {
  const text = groceryText();
  try {
    await navigator.clipboard.writeText(text);
    alert("Grocery list copied!");
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy");
    ta.remove();
    alert("Grocery list copied!");
  }
});

downloadListBtn.addEventListener("click", () => {
  const text = groceryText();
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "grocery-list.txt";
  a.click();
  URL.revokeObjectURL(a.href);
});

exportDataBtn.addEventListener("click", () => {
  const data = { recipes, plan, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "meal-planner-export.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

// Helpers
function load(key){ try{ return JSON.parse(localStorage.getItem(key) || "null"); } catch{ return null; } }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function makeEmptyPlan(){
  const p = {};
  days.forEach(d => { p[d] = { Breakfast:"", Lunch:"", Dinner:"" }; });
  return p;
}

function initSelectors(){
  daySel.innerHTML = days.map(d => `<option>${d}</option>`).join("");
  refreshRecipeSelect();
}

function refreshRecipeSelect(){
  recipeSel.innerHTML = `<option value="">— Select recipe —</option>` +
    recipes.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join("");
}

function renderRecipes(){
  const q = (recipeSearch.value || "").toLowerCase();
  const rows = recipes
    .filter(r => r.name.toLowerCase().includes(q) || r.ingredients.join(" ").toLowerCase().includes(q))
    .sort((a,b)=>a.name.localeCompare(b.name));

  recipeList.innerHTML = rows.map(r => {
    const usedCount = countUsage(r.id);
    return `
      <li>
        <div>
          <strong>${escapeHtml(r.name)}</strong>
          ${usedCount ? `<span class="tag">in plan: ${usedCount}</span>` : ""}
          <div class="meta">${escapeHtml(r.ingredients.join(", "))}</div>
        </div>
        <div>
          <button class="ghost" data-action="use" data-id="${r.id}">Use</button>
          <button class="danger" data-action="del" data-id="${r.id}">Delete</button>
        </div>
      </li>
    `;
  }).join("");

  // actions
  recipeList.querySelectorAll("button").forEach(btn=>{
    const id = btn.dataset.id;
    if (btn.dataset.action === "del"){
      btn.onclick = () => {
        if (!confirm("Delete this recipe?")) return;
        recipes = recipes.filter(r => r.id !== id);
        // remove from plan too
        days.forEach(d => meals.forEach(m => { if (plan[d][m] === id) plan[d][m] = ""; }));
        save(LS_RECIPES, recipes); save(LS_PLAN, plan);
        renderRecipes(); renderPlanner(); renderGrocery(); refreshRecipeSelect();
      };
    } else if (btn.dataset.action === "use"){
      recipeSel.value = id;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

function renderPlanner(){
  planBody.innerHTML = days.map(d => {
    const cells = meals.map(m => {
      const recId = plan[d][m];
      if (!recId) {
        return `<td><div class="slot"><span class="pill muted">—</span></div></td>`;
      }
      const rec = recipes.find(r => r.id === recId);
      const name = rec ? rec.name : "(missing)";
      return `<td>
        <div class="slot">
          <span class="pill">${escapeHtml(name)}</span>
          <button class="remove" data-day="${d}" data-meal="${m}">Remove</button>
        </div>
      </td>`;
    }).join("");

    return `<tr>
      <th>${d}</th>
      ${cells}
    </tr>`;
  }).join("");

  planBody.querySelectorAll(".remove").forEach(btn=>{
    btn.onclick = () => {
      const day = btn.dataset.day, meal = btn.dataset.meal;
      plan[day][meal] = "";
      save(LS_PLAN, plan);
      renderPlanner(); renderGrocery();
    };
  });
}

function renderGrocery(){
  const counts = aggregateIngredients();
  const rows = Object.entries(counts)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([name, n]) => `<li>${n>1?`<strong>x${n}</strong> `:""}${escapeHtml(name)}</li>`);

  groceryList.innerHTML = rows.join("") || `<li class="muted">No items yet — assign recipes to the planner.</li>`;
}

function aggregateIngredients(){
  const map = Object.create(null);
  days.forEach(d => {
    meals.forEach(m => {
      const recId = plan[d][m];
      if (!recId) return;
      const rec = recipes.find(r => r.id === recId);
      if (!rec) return;
      rec.ingredients.forEach(raw => {
        const norm = normalizeIng(raw);
        map[norm] = (map[norm] || 0) + 1;
      });
    });
  });
  return map;
}

function groceryText(){
  const counts = aggregateIngredients();
  const lines = Object.entries(counts)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([name,n]) => `${n>1?`x${n} `:""}${name}`);
  return lines.join("\n");
}

function countUsage(recId){
  let n=0;
  days.forEach(d => meals.forEach(m => { if (plan[d][m] === recId) n++; }));
  return n;
}

function normalizeIng(s){
  // simple normalization for dedupe: lowercase + trim extra spaces
  return s.toLowerCase().replace(/\s+/g," ").trim();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
