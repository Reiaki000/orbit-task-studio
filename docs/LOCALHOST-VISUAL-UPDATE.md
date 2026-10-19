# Orbit v1.2 — Same visual design, more reliable AWS sign-in

The existing v1.1 pie chart, glowing category colors, Apple-like layout, theme toggle, and slow ambient animations are preserved. No visual reconfiguration is necessary.

The new `.env` is already set to your Hyderabad AWS stack. For the fastest update, extract the ZIP over your **existing** Orbit project directory, overwrite the source files, and **keep your local `node_modules`**. Stop your existing Vite server (`Ctrl+C`) and run `npm run dev`; you do not need another `npm install` if packages were already installed.

To run the ZIP as a new clean folder, run `npm install` and `npm run dev` once.

See [DEPLOYMENT.md](DEPLOYMENT.md) for login troubleshooting and GitHub Pages setup. AWS resources do not need to be redeployed for this frontend update.
