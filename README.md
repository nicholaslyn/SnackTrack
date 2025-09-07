# SnackTrack
# Meal Planner + Grocery List

Plan a week of meals and auto-generate a grocery list. Everything is saved locally in your browser — no accounts, no backend.

## Features
- Add recipes (name + ingredients, one per line)
- Assign recipes to **Breakfast/Lunch/Dinner** for each day of the week
- Grocery list is built automatically from planned recipes
- De-duplicates ingredients and shows repeat counts (e.g., `x3 garlic`)
- Copy grocery list to clipboard or download as `.txt`
- Import sample recipes with one click
- Local-first (data stored in `localStorage`)

## Use
Open `index.html` in your browser. Add recipes → assign to days → copy/download the list.

## Tips
- Edit recipe ingredients in the recipe list by deleting & re-adding (simple flow).
- Items dedupe by exact wording (case-insensitive). Keep ingredient wording consistent for best results.

## Tech
Plain HTML/CSS/JS. No dependencies. Data keys: `mp_recipes_v1`, `mp_plan_v1`.

## License
MIT
